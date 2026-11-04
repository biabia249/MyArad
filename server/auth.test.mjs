import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app.mjs';
import { createStore, hash, randomToken } from './store.mjs';

async function setup(t, config = {}, dependencies = {}) {
  const server = createApp({ database: ':memory:', publicUrl: 'http://localhost:3001', webOrigin: 'http://localhost:8081', ...config }, dependencies);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(path, data, token) {
    const response = await fetch(`${base}${path}`, { method: data ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data ? JSON.stringify(data) : undefined });
    return { status: response.status, data: await response.json() };
  }
  return { call, base };
}
const account = { fullName: 'Test Person', username: 'tester', email: 'test@example.com', password: 'Testing-Password-123!' };

test('password accounts validate, authenticate by username/email, and revoke sessions', async t => {
  const { call } = await setup(t);
  assert.equal((await call('/auth/signup', { ...account, email: 'invalid' })).status, 400);
  assert.equal((await call('/auth/signup', { ...account, password: 'short' })).status, 400);
  const registered = await call('/auth/signup', account);
  assert.equal(registered.status, 201);
  assert.deepEqual(registered.data.profile, { fullName: account.fullName, username: account.username, email: account.email, hasPassword: true });
  assert.equal((await call('/auth/signup', { ...account, email: 'TEST@example.com' })).status, 409);
  for (const identifier of ['TESTER', 'TEST@example.com']) {
    const result = await call('/auth/signin', { identifier, password: account.password });
    assert.equal(result.status, 200);
    assert.equal((await call('/auth/me', undefined, result.data.token)).status, 200);
    assert.equal((await call('/auth/signout', {}, result.data.token)).status, 200);
    assert.equal((await call('/auth/me', undefined, result.data.token)).status, 401);
  }
  assert.equal((await call('/auth/signin', { identifier: 'tester', password: 'wrong' })).status, 401);
  assert.equal((await call('/auth/signin', { identifier: 'missing', password: 'wrong' })).status, 401);
  assert.equal((await call('/auth/me')).status, 401);
  assert.equal((await call('/auth/google/start', { challenge: randomToken() })).status, 503);
  assert.equal((await call('/auth/password/reset', { email: account.email })).status, 503);
});

test('database survives restart and stores neither raw passwords nor session tokens', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'myarad-auth-'));
  const filename = join(directory, 'auth.sqlite');
  let store;
  try {
    store = createStore(filename);
    const session = await store.signUp(account);
    const row = store.db.prepare('SELECT * FROM users').get();
    assert.notEqual(row.password_hash, account.password);
    assert.equal(store.db.prepare('SELECT digest FROM sessions').get().digest, hash(session.token));
    store.db.close(); store = null;
    assert.equal(readFileSync(filename).includes(Buffer.from(account.password)), false);
    assert.equal(readFileSync(filename).includes(Buffer.from(session.token)), false);
    store = createStore(filename);
    assert.equal((await store.signIn(account.email, account.password)).profile.username, account.username);
    assert.equal(store.authenticate(session.token).username, account.username);
    store.db.prepare('UPDATE sessions SET expires=0').run();
    assert.throws(() => store.authenticate(session.token), /session has expired/);
  } finally { store?.db.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('Google code flow verifies state, nonce, PKCE and single use; creates a durable account', async t => {
  let requested;
  const google = {
    generateAuthUrl(options) { requested = options; return `https://accounts.google.com/o/oauth2/v2/auth?state=${options.state}`; },
    async getToken(options) { assert.equal(options.redirect_uri, 'http://localhost:3001/auth/google/callback'); return { tokens: { id_token: 'verified-by-test-double' } }; },
    async verifyIdToken(options) { assert.equal(options.audience, 'client-id'); return { getPayload: () => ({ sub: 'google-person-1', email: 'google@example.com', email_verified: true, name: 'Google Person', nonce: requested.nonce }) }; },
  };
  const { call, base } = await setup(t, { googleClientId: 'client-id', googleClientSecret: 'secret' }, { google });
  const verifier = randomToken(), challenge = Buffer.from(hash(verifier), 'hex').toString('base64url');
  assert.equal((await call('/auth/google/start', { challenge: 'bad' })).status, 400);
  const start = await call('/auth/google/start', { challenge });
  assert.equal(start.status, 200);
  assert.match(start.data.authorizationUrl, /^https:\/\/accounts.google.com/);
  assert.equal(requested.code_challenge_method, 'S256');
  const callback = await fetch(`${base}/auth/google/callback?state=${requested.state}&code=provider-code`, { redirect: 'manual' });
  assert.equal(callback.status, 302);
  const target = new URL(callback.headers.get('location'));
  assert.equal(target.origin, 'null');
  assert.equal(target.protocol, 'myarad:');
  const code = target.searchParams.get('code');
  assert.ok(code);
  assert.equal((await call('/auth/google/exchange', { code, verifier: randomToken() })).status, 401);
  const session = await call('/auth/google/exchange', { code, verifier });
  assert.equal(session.status, 200);
  assert.equal(session.data.profile.email, 'google@example.com');
  assert.equal((await call('/auth/me', undefined, session.data.token)).status, 200);
  assert.equal((await call('/auth/google/exchange', { code, verifier })).status, 401);
  assert.equal((await fetch(`${base}/auth/google/callback?state=${requested.state}&code=provider-code`, { redirect: 'manual' })).status, 400);
  assert.equal((await fetch(`${base}/auth/google/callback?state=forged&code=provider-code`, { redirect: 'manual' })).status, 400);
});

test('Google rejects an invalid nonce, unverified email, and automatic email linking', async t => {
  let requested;
  let claims = { sub: 'google-person', email: account.email, email_verified: true, name: 'Person' };
  let validNonce = false;
  const google = {
    generateAuthUrl(options) { requested = options; return 'https://accounts.google.com'; },
    async getToken() { return { tokens: { id_token: 'test-token' } }; },
    async verifyIdToken() { return { getPayload: () => ({ ...claims, nonce: validNonce ? requested.nonce : 'invalid' }) }; },
  };
  const { call, base } = await setup(t, { googleClientId: 'client-id', googleClientSecret: 'secret' }, { google });
  await call('/auth/signup', account);
  async function attempt() {
    await call('/auth/google/start', { challenge: randomToken() });
    const response = await fetch(`${base}/auth/google/callback?state=${requested.state}&code=provider-code`, { redirect: 'manual' });
    const target = new URL(response.headers.get('location'));
    assert.equal(target.searchParams.has('code'), false);
    return target.searchParams.get('error');
  }
  assert.match(await attempt(), /could not be verified/);
  validNonce = true;
  assert.match(await attempt(), /already has an account/);
  claims = { ...claims, email: 'other@example.com', email_verified: false };
  assert.match(await attempt(), /did not verify/);
});

test('password reset codes are hashed, expire, are single-use, and revoke old sessions', async () => {
  const store = createStore(':memory:');
  try {
    const session = await store.signUp(account);
    const user = store.authenticate(session.token), reset = randomToken();
    store.db.prepare('INSERT INTO resets VALUES (?,?,?)').run(hash(reset), user.id, Date.now() + 60000);
    await store.resetPassword(reset, 'Updated-Password-123!');
    await assert.rejects(store.resetPassword(reset, 'Another-Password-123!'), /invalid or has expired/);
    await assert.rejects(store.signIn(account.email, account.password), /incorrect/);
    assert.throws(() => store.authenticate(session.token), /expired/);
    assert.equal((await store.signIn(account.email, 'Updated-Password-123!')).profile.email, account.email);
    const expired = randomToken();
    store.db.prepare('INSERT INTO resets VALUES (?,?,?)').run(hash(expired), user.id, 0);
    await assert.rejects(store.resetPassword(expired, 'Updated-Password-123!'), /expired/);
  } finally { store.db.close(); }
});

test('API rejects disallowed browser origins and excessive requests', async t => {
  const { base, call } = await setup(t);
  const forbidden = await fetch(`${base}/auth/signup`, { method: 'POST', headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' }, body: JSON.stringify(account) });
  assert.equal(forbidden.status, 403);
  for (let i = 0; i < 60; i++) await call('/missing');
  assert.equal((await call('/missing')).status, 429);
});

test('reset email and server-hosted form update the password through HTTP', async t => {
  let email;
  const { call, base } = await setup(t, { resendApiKey: 'server-only-test-key', emailFrom: 'MyArad <auth@example.com>' }, { fetch: async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    email = JSON.parse(options.body);
    return { ok: true };
  } });
  const session = await call('/auth/signup', account);
  assert.equal((await call('/auth/password/reset', { email: account.email })).status, 200);
  assert.deepEqual(email.to, [account.email]);
  const token = new URL(email.text.split(' ').at(-1)).searchParams.get('token');
  const form = await fetch(`${base}/auth/password/reset?token=${token}`);
  assert.equal(form.status, 200);
  assert.equal(form.headers.get('referrer-policy'), 'same-origin');
  const html = await form.text();
  assert.match(html, /autocomplete="new-password"/);
  assert.match(html, /name="confirmPassword"/);
  assert.match(form.headers.get('content-security-policy'), /style-src 'sha256-/);
  const mismatch = await fetch(`${base}/auth/password/confirm`, { method: 'POST', headers: { Origin: 'http://localhost:3001', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token, password: 'Changed-Password-123!', confirmPassword: 'Different-Password-123!' }) });
  assert.equal(mismatch.status, 400);
  const mismatchHtml = await mismatch.text();
  assert.match(mismatchHtml, /Passwords do not match/);
  assert.equal(mismatchHtml.includes('Changed-Password-123!'), false);
  assert.equal((await call('/auth/signin', { identifier: account.email, password: account.password })).status, 200);
  for (const origin of ['null', 'https://untrusted.example']) {
    const blocked = await fetch(`${base}/auth/password/confirm`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token, password: 'Changed-Password-123!', confirmPassword: 'Changed-Password-123!' }) });
    assert.equal(blocked.status, 403);
  }
  const confirm = await fetch(`${base}/auth/password/confirm`, { method: 'POST', headers: { Origin: 'http://localhost:3001', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token, password: 'Changed-Password-123!', confirmPassword: 'Changed-Password-123!' }) });
  assert.equal(confirm.status, 200);
  assert.match(await confirm.text(), /Return to the MyArad app/);
  assert.equal((await call('/auth/me', undefined, session.data.token)).status, 401);
  assert.equal((await call('/auth/signin', { identifier: account.email, password: 'Changed-Password-123!' })).status, 200);
});


test('Google users can set an initial password only with a valid session, keeping their account and Google sign-in', async t => {
  const store = createStore(':memory:');
  const claims = { sub: 'set-password-google', email: 'google-password@example.com', email_verified: true, name: 'Google User' };
  const user = store.googleUser(claims);
  const session = store.session(user), otherSession = store.session(user);
  const { call } = await setup(t, {}, { store });
  assert.equal(session.profile.hasPassword, false);
  assert.equal((await call('/auth/password/set', { password: 'New-Password-123!' })).status, 401);
  assert.equal((await call('/auth/password/set', { password: 'New-Password-123!' }, randomToken())).status, 401);
  assert.equal((await call('/auth/password/set', { password: 'short' }, session.token)).status, 400);
  const saved = await call('/auth/password/set', { password: 'New-Password-123!' }, session.token);
  assert.equal(saved.status, 200);
  assert.equal(saved.data.profile.hasPassword, true);
  assert.equal(saved.data.profile.email, claims.email);
  assert.equal((await call('/auth/me', undefined, session.token)).status, 200);
  assert.equal((await call('/auth/me', undefined, otherSession.token)).status, 401);
  assert.equal((await call('/auth/password/set', { password: 'Overwrite-Password-123!' }, session.token)).status, 409);
  assert.equal((await call('/auth/signin', { identifier: claims.email, password: 'New-Password-123!' })).status, 200);
  assert.equal((await call('/auth/signin', { identifier: claims.email, password: 'Overwrite-Password-123!' })).status, 401);
  assert.equal(store.googleUser(claims).id, user.id);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1);
  assert.notEqual(store.get(user.id).password_hash, 'New-Password-123!');
  const existing = await call('/auth/signup', account);
  assert.equal((await call('/auth/password/set', { password: 'Overwrite-Password-123!' }, existing.data.token)).status, 409);
});
