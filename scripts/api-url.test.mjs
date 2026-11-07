import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiUrl } from '../src/features/auth/api-url.ts';

test('web LAN clients use the hosting laptop instead of their own localhost or Android emulator address', () => {
  for (const host of ['localhost', '127.0.0.1', '10.0.2.2']) assert.equal(resolveApiUrl(`http://${host}:3001`, true, '172.20.10.8'), 'http://172.20.10.8:3001');
  assert.equal(resolveApiUrl('http://10.0.2.2:3001', true), 'http://10.0.2.2:3001');
});

test('explicit remote backends are preserved and production still requires HTTPS', () => {
  assert.equal(resolveApiUrl('https://api.example/', false, '172.20.10.8'), 'https://api.example');
  assert.equal(resolveApiUrl('http://172.20.10.9:3001', true, '172.20.10.8'), 'http://172.20.10.9:3001');
  assert.throws(() => resolveApiUrl('http://localhost:3001', false), /HTTPS/);
});
