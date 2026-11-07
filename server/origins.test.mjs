import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { configuredWebOrigins } from './origins.mjs';
import { createApp } from './app.mjs';

const interfaces = { wifi: [{ address: '172.20.10.8', internal: false }], other: [{ address: '203.0.113.4', internal: false }] };

test('development origins include the host LAN interface and explicit configuration, without trusting arbitrary LAN sites', () => {
  const origins = configuredWebOrigins({ WEB_ORIGIN: 'http://172.20.10.8:8083', WEB_ORIGINS: 'https://preview.example' }, interfaces);
  for (const origin of ['http://172.20.10.8:8081', 'http://172.20.10.8:8082', 'http://172.20.10.8:8083', 'http://localhost:8081', 'https://preview.example']) assert.ok(origins.includes(origin), origin);
  for (const origin of ['http://172.20.10.9:8081', 'http://172.20.10.8:9000', 'http://203.0.113.4:8081', 'https://untrusted.example', 'null']) assert.ok(!origins.includes(origin), origin);
  assert.throws(() => configuredWebOrigins({ WEB_ORIGIN: '*' }, interfaces));
});

test('production CORS never automatically trusts development or LAN origins', () => {
  assert.deepEqual(configuredWebOrigins({ NODE_ENV: 'production', WEB_ORIGIN: 'https://myarad.example', WEB_ORIGINS: 'https://other.example' }, interfaces), ['https://myarad.example', 'https://other.example']);
});

test('LAN preflight and actual city requests return matching CORS headers; unrelated origins are rejected', async t => {
  const app = createApp({ database: ':memory:', publicUrl: 'http://localhost:3001', webOrigins: configuredWebOrigins({}, interfaces), webOrigin: 'http://172.20.10.8:8083' });
  app.listen(0, '127.0.0.1'); await once(app, 'listening');
  t.after(() => new Promise(resolve => { app.close(resolve); app.closeAllConnections(); }));
  const base = `http://127.0.0.1:${app.address().port}`;
  for (const path of ['/city/bootstrap', '/city/schools']) {
    const headers = { Origin: 'http://172.20.10.8:8081', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization,content-type' };
    const preflight = await fetch(base + path, { method: 'OPTIONS', headers });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), headers.Origin);
    assert.equal(preflight.headers.get('vary'), 'Origin');
    const response = await fetch(base + path, { headers: { Origin: headers.Origin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), headers.Origin);
    await response.arrayBuffer();
  }
  const explicit = await fetch(base + '/health', { headers: { Origin: 'http://172.20.10.8:8083' } });
  assert.equal(explicit.headers.get('access-control-allow-origin'), 'http://172.20.10.8:8083');
  const blocked = await fetch(base + '/city/bootstrap', { method: 'OPTIONS', headers: { Origin: 'http://172.20.10.9:8081', 'Access-Control-Request-Method': 'GET' } });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);
});
