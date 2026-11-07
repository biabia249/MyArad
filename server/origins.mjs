import { networkInterfaces } from 'node:os';

function webOrigin(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error(`Invalid web origin: ${value}. Use only a scheme, hostname and optional port.`);
  }
  return url.origin;
}

function privateIPv4(address) {
  const octets = address.split('.').map(Number);
  return octets.length === 4 && octets.every(octet => Number.isInteger(octet) && octet >= 0 && octet <= 255)
    && (octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168));
}

export function configuredWebOrigins(env = process.env, interfaces = networkInterfaces()) {
  const configured = [env.WEB_ORIGIN || 'http://localhost:8081', ...(env.WEB_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)];
  const origins = new Set(configured.map(webOrigin));
  if (env.NODE_ENV === 'production') return [...origins];
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    for (const port of [8081, 8082]) origins.add(`http://${host}:${port}`);
  }
  // Allow this server's actual private interfaces, not every private network origin.
  for (const addresses of Object.values(interfaces)) for (const entry of addresses || []) {
    if (entry.internal || !privateIPv4(entry.address)) continue;
    for (const port of [8081, 8082]) origins.add(`http://${entry.address}:${port}`);
  }
  return [...origins];
}
