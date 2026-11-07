import { createReadStream, statSync, readFileSync } from 'node:fs';
const apk = new URL('../.cache/releases/MyArad.apk', import.meta.url);
const page = new URL('../public/download/index.html', import.meta.url);
export function serveDownload(req, res, pathname) {
  if (!['/download', '/download/', '/device-test', '/device-test/', '/device-test/index.html', '/downloads/MyArad.apk'].includes(pathname)) return false;
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return true; }
  if (!pathname.endsWith('.apk')) {
    const html = readFileSync(page);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': html.length, 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : html); return true;
  }
  let size;
  try { size = statSync(apk).size; } catch {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '60' });
    res.end('APK-ul se pregătește. Reîncearcă în câteva minute.'); return true;
  }
  const headers = { 'Content-Type': 'application/vnd.android.package-archive', 'Content-Disposition': 'attachment; filename="MyArad-1.1.0.apk"', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
  let start = 0, end = size - 1, status = 200;
  if (req.headers.range) {
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (range && (range[1] || range[2])) {
      if (!range[1]) start = Math.max(0, size - Number(range[2]));
      else { start = Number(range[1]); if (range[2]) end = Math.min(end, Number(range[2])); }
    }
    if (!range || (!range[1] && !range[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return true;
    }
    status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  }
  headers['Content-Length'] = end - start + 1;
  res.writeHead(status, headers);
  if (req.method === 'HEAD') res.end();
  else { const stream = createReadStream(apk, { start, end }); stream.on('error', () => res.destroy()); res.on('close', () => stream.destroy()); stream.pipe(res); }
  return true;
}
