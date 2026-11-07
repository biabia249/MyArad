import { createServer } from 'node:https';
import { request } from 'node:http';

const hopHeaders = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'];
function headersFor(req, target, publicOrigin, websocket = false) {
  const headers = { ...req.headers };
  for (const name of hopHeaders) delete headers[name];
  delete headers.origin;
  delete headers.forwarded;
  for (const name of Object.keys(headers)) if (name.startsWith('x-forwarded-')) delete headers[name];
  headers.host = target.host;
  headers['x-forwarded-proto'] = 'https';
  headers['x-forwarded-host'] = publicOrigin.host;
  if (websocket) { headers.connection = 'Upgrade'; headers.upgrade = req.headers.upgrade; }
  return headers;
}

export function createLocalHttps({ cert, key, publicOrigin, webOrigin, apiOrigin }) {
  const external = new URL(publicOrigin);
  const web = new URL(webOrigin);
  const api = new URL(apiOrigin);
  if (external.protocol !== 'https:') throw Error('The external URL must use HTTPS.');
  for (const target of [web, api]) {
    if (target.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) || target.username || target.password || target.pathname !== '/' || target.search || target.hash) throw Error('Upstreams must be fixed local HTTP origins.');
  }
  const allowed = req => req.headers.host === external.host && (!req.headers.origin || req.headers.origin === external.origin);
  const server = createServer({ cert, key, minVersion: 'TLSv1.2' }, (req, res) => {
    if (!allowed(req)) { res.writeHead(403, { 'Content-Type': 'text/plain' }); res.end('Origin or host is not allowed.'); return; }
    const isApi = /^\/api(?:\/|\?|$)/.test(req.url) || /^\/auth\//.test(req.url) || req.url === '/health';
    const path = req.url.startsWith('/api') && isApi ? req.url.slice(4) || '/' : req.url;
    const target = isApi ? api : web;
    const headers = headersFor(req, target, external);
    // Metro uses the external authority for bundle/asset URLs. The API remains local.
    if (!isApi) headers.host = external.host;
    const upstream = request({ hostname: target.hostname, port: target.port, method: req.method, path: path.startsWith('?') ? '/' + path : path, headers }, response => {
      const responseHeaders = { ...response.headers };
      for (const name of hopHeaders) delete responseHeaders[name];
      res.writeHead(response.statusCode || 502, responseHeaders);
      response.pipe(res);
    });
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain' }); res.end('Local service unavailable. Start the API and web server.'); });
    upstream.setTimeout(120000, () => upstream.destroy());
    req.on('aborted', () => upstream.destroy());
    res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
    req.pipe(upstream);
  });
  server.on('upgrade', (req, socket, head) => {
    if (!allowed(req)) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
    const headers = headersFor(req, web, external, true);
    headers.host = external.host;
    const upstream = request({ hostname: web.hostname, port: web.port, path: req.url, headers });
    upstream.on('upgrade', (response, upstreamSocket, upstreamHead) => {
      socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(response.headers).map(([name, value]) => `${name}: ${value}`).join('\r\n')}\r\n\r\n`);
      if (head.length) upstreamSocket.write(head);
      if (upstreamHead.length) socket.write(upstreamHead);
      upstreamSocket.on('error', () => socket.destroy());
      socket.on('error', () => upstreamSocket.destroy());
      socket.pipe(upstreamSocket); upstreamSocket.pipe(socket);
    });
    upstream.on('response', response => { response.resume(); socket.end(`HTTP/1.1 ${response.statusCode || 502} Proxy Error\r\nConnection: close\r\n\r\n`); });
    upstream.on('error', () => socket.destroy());
    upstream.end();
  });
  return server;
}
