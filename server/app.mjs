import { createServer } from 'node:http';
import { OAuth2Client } from 'google-auth-library';
import { createStore, hash, randomToken, profile, HttpError } from './store.mjs';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const string = (data, key, max = 256) => {
  if (typeof data[key] !== 'string' || data[key].length > max) throw new HttpError(400, `Invalid ${key}.`);
  return data[key];
};
const password = data => {
  const value = string(data, 'password', 128);
  if (value.length < 8) throw new HttpError(400, 'Use a password with 8–128 characters.');
  return value;
};
const escapeHtml = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const redirect = (res, location) => { res.writeHead(302, { Location: location }); res.end(); };
async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 16384) throw new HttpError(413, 'Request is too large.');
  }
  try {
    const data = req.headers['content-type']?.startsWith('application/x-www-form-urlencoded') ? Object.fromEntries(new URLSearchParams(raw)) : JSON.parse(raw || '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new HttpError(400, 'Invalid request body.'); }
}
export function createApp(config, dependencies = {}) {
  const store = dependencies.store || createStore(config.database || 'server/data/myarad.sqlite');
  const publicUrl = new URL(config.publicUrl || 'http://localhost:3001').origin;
  if (config.production && !publicUrl.startsWith('https://')) throw new Error('Production PUBLIC_BASE_URL must use HTTPS.');
  const callback = `${publicUrl}/auth/google/callback`;
  const appCallback = 'myarad://auth/callback';
  const google = dependencies.google || new OAuth2Client(config.googleClientId, config.googleClientSecret, callback);
  const sendRequest = dependencies.fetch || fetch;
  const limits = new Map();
  const cleanup = setInterval(() => { store.cleanup(); limits.clear(); }, 60000);
  cleanup.unref();
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    if (config.production) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    const origin = req.headers.origin;
    if (origin && origin === config.webOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    try {
      const url = new URL(req.url, publicUrl);
      const route = `${req.method} ${url.pathname}`;
      if (route === 'GET /health') { json(res, 200, { ok: true }); return; }
      const ip = req.socket.remoteAddress || 'unknown';
      // No untrusted X-Forwarded-For; configure proxy IP handling before scaling.
      const count = (limits.get(ip) || 0) + 1;
      if (limits.size > 10000 || count > 60) throw new HttpError(429, 'Too many attempts. Please wait a minute.');
      limits.set(ip, count);
      if (origin && origin !== config.webOrigin && !(route === 'POST /auth/password/confirm' && origin === publicUrl)) throw new HttpError(403, 'Origin is not allowed.');
      if (route === 'POST /auth/signup') {
        const data = await body(req);
        const fullName = string(data, 'fullName', 100).trim();
        const username = string(data, 'username', 30).trim().toLowerCase();
        const email = string(data, 'email', 254).trim().toLowerCase();
        if (!fullName || !/^[a-z0-9_]{3,30}$/.test(username) || !emailPattern.test(email)) throw new HttpError(400, 'Enter a valid full name, username, and email.');
        json(res, 201, await store.signUp({ fullName, username, email, password: password(data) })); return;
      }
      if (route === 'POST /auth/signin') {
        const data = await body(req);
        json(res, 200, await store.signIn(string(data, 'identifier').trim(), string(data, 'password', 128))); return;
      }
      if (route === 'GET /auth/me' || route === 'POST /auth/signout') {
        const token = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
        if (!token) throw new HttpError(401, 'Please sign in.');
        const user = store.authenticate(token);
        if (route.endsWith('/signout')) { store.signOut(token); json(res, 200, { ok: true }); }
        else json(res, 200, { profile: profile(user) });
        return;
      }
      if (route === 'POST /auth/google/start') {
        if (!config.googleClientId || !config.googleClientSecret) throw new HttpError(503, 'Google sign-in has not been configured on the server yet.');
        const data = await body(req);
        const challenge = string(data, 'challenge', 43);
        if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) throw new HttpError(400, 'Invalid sign-in challenge.');
        const state = randomToken(), nonce = randomToken(), verifier = randomToken();
        const returnUri = data.platform === 'web' ? `${config.webOrigin}/auth/callback` : appCallback;
        store.db.prepare('INSERT INTO oauth VALUES (?,?,?,?,?,?)').run(state, challenge, nonce, verifier, returnUri, Date.now() + 300000);
        const authorizationUrl = google.generateAuthUrl({ scope: ['openid', 'email', 'profile'], state, nonce, prompt: 'select_account', code_challenge: Buffer.from(hash(verifier), 'hex').toString('base64url'), code_challenge_method: 'S256' });
        json(res, 200, { authorizationUrl }); return;
      }
      if (route === 'GET /auth/google/callback') {
        const state = url.searchParams.get('state') || '';
        const transaction = store.db.prepare('DELETE FROM oauth WHERE state=? AND expires>? RETURNING *').get(state, Date.now());
        if (!transaction) throw new HttpError(400, 'Sign-in expired or state is invalid. Return to the app and try again.');
        const target = new URL(transaction.return_uri);
        try {
          if (url.searchParams.has('error')) throw new HttpError(401, 'Google sign-in was cancelled.');
          const code = url.searchParams.get('code');
          if (!code || code.length > 4096) throw new HttpError(400, 'Google did not provide a sign-in code.');
          const { tokens } = await google.getToken({ code, codeVerifier: transaction.verifier, redirect_uri: callback });
          if (!tokens.id_token) throw new HttpError(401, 'Google did not return an identity token.');
          const ticket = await google.verifyIdToken({ idToken: tokens.id_token, audience: config.googleClientId });
          const claims = ticket.getPayload();
          if (!claims || claims.nonce !== transaction.nonce) throw new HttpError(401, 'Google identity could not be verified.');
          const user = store.googleUser(claims);
          const handoff = randomToken();
          store.db.prepare('INSERT INTO handoffs VALUES (?,?,?,?)').run(hash(handoff), transaction.challenge, user.id, Date.now() + 60000);
          target.searchParams.set('code', handoff);
        } catch (error) { target.searchParams.set('error', error instanceof HttpError ? error.message : 'Google sign-in failed. Please try again.'); }
        redirect(res, target.toString()); return;
      }
      if (route === 'POST /auth/google/exchange') {
        const data = await body(req);
        const code = string(data, 'code', 128), verifier = string(data, 'verifier', 128);
        if (!/^[A-Za-z0-9_-]{43,128}$/.test(verifier)) throw new HttpError(400, 'Invalid sign-in verifier.');
        const challenge = Buffer.from(hash(verifier), 'hex').toString('base64url');
        const handoff = store.db.prepare('DELETE FROM handoffs WHERE digest=? AND challenge=? AND expires>? RETURNING *').get(hash(code), challenge, Date.now());
        if (!handoff) throw new HttpError(401, 'Sign-in code is invalid or expired. Please try again.');
        json(res, 200, store.session(store.get(handoff.user_id))); return;
      }
      if (route === 'POST /auth/password/reset') {
        const data = await body(req), email = string(data, 'email', 254).trim().toLowerCase();
        if (!emailPattern.test(email)) throw new HttpError(400, 'Enter a valid email address.');
        if (!config.resendApiKey || !config.emailFrom) throw new HttpError(503, 'Password reset email is not configured. Please contact support.');
        const user = store.db.prepare('SELECT id FROM users WHERE email=? COLLATE NOCASE AND password_hash IS NOT NULL').get(email);
        if (user) {
          const token = randomToken();
          store.db.prepare('INSERT INTO resets VALUES (?,?,?)').run(hash(token), user.id, Date.now() + 1800000);
          const response = await sendRequest('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: config.emailFrom, to: [email], subject: 'Reset your MyArad password', text: `Reset your password (expires in 30 minutes): ${publicUrl}/auth/password/reset?token=${token}` }), signal: AbortSignal.timeout(15000) });
          if (!response.ok) { store.db.prepare('DELETE FROM resets WHERE digest=?').run(hash(token)); throw new HttpError(503, 'Unable to send email. Please try again later.'); }
        }
        json(res, 200, { message: 'If an account exists for this email, a password reset link has been sent.' }); return;
      }
      if (route === 'GET /auth/password/reset') {
        const token = url.searchParams.get('token') || '';
        if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new HttpError(400, 'Invalid reset link.');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reset MyArad password</title><h1>Reset your password</h1><form method="post" action="/auth/password/confirm"><input type="hidden" name="token" value="${escapeHtml(token)}"><label>New password (8–128 characters) <input type="password" name="password" required minlength="8" maxlength="128" autocomplete="new-password"></label><button type="submit">Save password</button></form></html>`); return;
      }
      if (route === 'POST /auth/password/confirm') {
        const data = await body(req);
        await store.resetPassword(string(data, 'token', 128), password(data));
        json(res, 200, { message: 'Password updated. Return to MyArad to sign in.' }); return;
      }
      throw new HttpError(404, 'Not found.');
    } catch (error) {
      if (!res.headersSent) json(res, error instanceof HttpError ? error.status : 500, { error: error instanceof HttpError ? error.message : 'Something went wrong. Please try again.' });
      else res.end();
      // Never log request bodies, OAuth codes, tokens, or passwords.
    }
  });
  server.on('close', () => { clearInterval(cleanup); store.db.close(); });
  server.requestTimeout = 20000;
  server.headersTimeout = 15000;
  return server;
}
