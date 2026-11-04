import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const scrypt = promisify(scryptCallback);
export const hash = value => createHash('sha256').update(value).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');
export const profile = row => ({ fullName: row.full_name, username: row.username, email: row.email });
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export async function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `${salt}:${key.toString('hex')}`;
}
export async function passwordMatches(password, stored) {
  if (!stored) return false;
  const actual = await passwordHash(password, stored.split(':')[0]);
  return timingSafeEqual(Buffer.from(actual), Buffer.from(stored));
}
export function createStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, full_name TEXT NOT NULL, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT, google_sub TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS sessions (digest TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS oauth (state TEXT PRIMARY KEY, challenge TEXT NOT NULL, nonce TEXT NOT NULL, verifier TEXT NOT NULL, return_uri TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS handoffs (digest TEXT PRIMARY KEY, challenge TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS resets (digest TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);`);
  const dummyHash = passwordHash(randomToken());
  const get = id => db.prepare('SELECT * FROM users WHERE id=?').get(id);
  function session(user) {
    const token = randomToken();
    db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(token), user.id, Date.now() + 7 * 86400000);
    return { token, profile: profile(user) };
  }
  return {
    db, session, get,
    cleanup() {
      for (const table of ['sessions', 'oauth', 'handoffs', 'resets']) db.prepare(`DELETE FROM ${table} WHERE expires < ?`).run(Date.now());
    },
    async signUp({ fullName, username, email, password }) {
      const encoded = await passwordHash(password);
      const id = randomUUID();
      try { db.prepare('INSERT INTO users VALUES (?,?,?,?,?,NULL)').run(id, fullName, username, email, encoded); }
      catch (error) {
        if (String(error.message).includes('UNIQUE')) throw new HttpError(409, 'That username or email is already registered.');
        throw error;
      }
      return session(get(id));
    },
    async signIn(identifier, password) {
      const user = db.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE OR email=? COLLATE NOCASE').get(identifier, identifier);
      const matches = await passwordMatches(password, user?.password_hash || await dummyHash);
      if (!user?.password_hash || !matches) throw new HttpError(401, 'Username, email, or password is incorrect.');
      return session(user);
    },
    authenticate(token) {
      const row = db.prepare('SELECT user_id FROM sessions WHERE digest=? AND expires>?').get(hash(token), Date.now());
      if (!row) throw new HttpError(401, 'Your session has expired. Please sign in again.');
      return get(row.user_id);
    },
    signOut(token) { db.prepare('DELETE FROM sessions WHERE digest=?').run(hash(token)); },
    googleUser(claims) {
      if (!claims.sub || !claims.email || claims.email_verified !== true) throw new HttpError(401, 'Google did not verify this email address.');
      let user = db.prepare('SELECT * FROM users WHERE google_sub=?').get(claims.sub);
      if (!user) {
        if (db.prepare('SELECT id FROM users WHERE email=? COLLATE NOCASE').get(claims.email)) {
          throw new HttpError(409, 'This email already has an account. Sign in using its password.');
        }
        const id = randomUUID();
        db.prepare('INSERT INTO users VALUES (?,?,?,?,NULL,?)').run(id, (claims.name || claims.email).slice(0, 100), `user_${randomBytes(8).toString('hex')}`, claims.email.toLowerCase(), claims.sub);
        user = get(id);
      }
      return user;
    },
    async resetPassword(token, password) {
      const row = db.prepare('SELECT * FROM resets WHERE digest=? AND expires>?').get(hash(token), Date.now());
      if (!row) throw new HttpError(400, 'This reset link is invalid or has expired.');
      const encoded = await passwordHash(password);
      db.exec('BEGIN IMMEDIATE');
      try {
        const removed = db.prepare('DELETE FROM resets WHERE digest=? AND expires>?').run(hash(token), Date.now());
        if (!removed.changes) throw new HttpError(400, 'This reset link has already been used.');
        db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(encoded, row.user_id);
        db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id);
        db.prepare('DELETE FROM resets WHERE user_id=?').run(row.user_id);
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
}
