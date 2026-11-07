import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serveDownload } from './downloads.mjs';

test('APK downloads support resume and HEAD, reject invalid ranges, and do not expose arbitrary files', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'myarad-download-'));
  const apkFile = join(directory, 'test.apk'), pageFile = join(directory, 'index.html');
  const bytes = Buffer.from('APK-BYTES-TEST');
  await writeFile(apkFile, bytes); await writeFile(pageFile, '<h1>Install</h1>');
  const server = createServer((req, res) => { if (!serveDownload(req, res, new URL(req.url, 'http://localhost').pathname, { apkFile, pageFile })) { res.writeHead(404); res.end(); } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const url = `http://127.0.0.1:${server.address().port}`;
  let response = await fetch(url + '/downloads/MyArad.apk');
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'application/vnd.android.package-archive');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  response = await fetch(url + '/downloads/MyArad.apk', { method: 'HEAD' });
  assert.equal(response.headers.get('content-length'), String(bytes.length)); assert.equal((await response.arrayBuffer()).byteLength, 0);
  for (const [range, expected] of [['bytes=0-2', 'APK'], ['bytes=4-', 'BYTES-TEST'], ['bytes=-4', 'TEST']]) {
    response = await fetch(url + '/downloads/MyArad.apk', { headers: { Range: range } });
    assert.equal(response.status, 206); assert.equal(await response.text(), expected);
  }
  for (const range of ['bytes=999-', 'bytes=5-2', 'bytes=-0', 'bytes=0-2,4-6', 'bytes=-']) {
    response = await fetch(url + '/downloads/MyArad.apk', { headers: { Range: range } }); assert.equal(response.status, 416);
  }
  assert.equal((await fetch(url + '/downloads/../credentials.env')).status, 404);
  assert.match(await (await fetch(url + '/device-test/')).text(), /Install/);
  assert.equal((await fetch(url + '/downloads/MyArad.apk', { method: 'POST' })).status, 405);
  await rm(apkFile); assert.equal((await fetch(url + '/downloads/MyArad.apk')).status, 503);
});
