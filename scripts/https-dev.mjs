import { spawn, spawnSync } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { X509Certificate } from 'node:crypto';
import { createLocalHttps } from '../server/local-https.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
function option(name, fallback) { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; }
const privateIp = value => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(value);
const localIps = Object.values(networkInterfaces()).flat().filter(Boolean).map(entry => entry.address);
const host = option('--host', localIps.find(privateIp));
const loopback = host === 'localhost' || host === '127.0.0.1';
if (!host || !(loopback || (privateIp(host) && localIps.includes(host)))) throw Error('Choose localhost or this hosting laptop\'s private IPv4 address with --host.');
const port = Number(option('--port', 8443));
const webPort = Number(option('--web-port', 8083));
const apiPort = Number(option('--api-port', 3001));
if ([port, webPort, apiPort].some(value => !Number.isInteger(value) || value < 1024 || value > 65535) || new Set([port, webPort, apiPort]).size !== 3) throw Error('Choose three distinct ports between 1024 and 65535.');
const publicOrigin = `https://${host}:${port}`;
const caRoot = join(root, '.cache', 'https', 'ca');
const certificateDir = join(root, '.cache', 'https', host);
await mkdir(certificateDir, { recursive: true });
await mkdir(caRoot, { recursive: true });
const toolDir = join(root, '.cache', 'tools');
const tool = process.env.MKCERT_PATH || join(toolDir, process.platform === 'win32' ? 'mkcert.exe' : 'mkcert');
if (!existsSync(tool)) {
  const platform = { win32: 'windows', darwin: 'darwin', linux: 'linux' }[process.platform];
  const architecture = { x64: 'amd64', arm64: 'arm64' }[process.arch];
  if (!platform || !architecture || process.env.MKCERT_PATH) throw Error('Install mkcert and set MKCERT_PATH to its executable.');
  await mkdir(toolDir, { recursive: true });
  const url = `https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-${platform}-${architecture}${process.platform === 'win32' ? '.exe' : ''}`;
  console.log('Downloading mkcert from its official GitHub release (local development only).');
  const response = await fetch(url);
  if (!response.ok) throw Error('Could not download mkcert. Install it and set MKCERT_PATH.');
  await writeFile(tool, new Uint8Array(await response.arrayBuffer()), { mode: 0o700 });
  if (process.platform !== 'win32') await chmod(tool, 0o700);
}
const certPath = join(certificateDir, 'cert.pem');
const keyPath = join(certificateDir, 'key.pem');
if (!existsSync(certPath) || !existsSync(keyPath)) {
  const result = spawnSync(tool, ['-cert-file', certPath, '-key-file', keyPath, host, 'localhost', '127.0.0.1', '::1'], { env: { ...process.env, CAROOT: caRoot }, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw result.error || Error('Could not generate the local HTTPS certificate.');
}
const rootCertificate = await readFile(join(caRoot, 'rootCA.pem'));
await writeFile(join(certificateDir, 'MyArad-local-CA.crt'), rootCertificate);
console.log(`Phone certificate: ${join(certificateDir, 'MyArad-local-CA.crt')}`);
console.log(`CA SHA-256: ${new X509Certificate(rootCertificate).fingerprint256}`);
console.log('Install only this public CA certificate on your test devices. The CA private key stays on this computer.');
console.log('No system trust stores are modified automatically.');

const children = [];
let gateway;
let closing = false;
function cleanup() {
  if (closing) return;
  closing = true;
  gateway?.close();
  for (const child of children) child.kill();
}
process.on('SIGINT', () => { cleanup(); process.exit(); });
process.on('SIGTERM', () => { cleanup(); process.exit(); });
function child(args, env = {}) {
  const processChild = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, stdio: 'inherit', windowsHide: true });
  children.push(processChild);
  processChild.on('error', error => { console.error(error.message); cleanup(); process.exitCode = 1; });
  processChild.on('exit', code => { if (!closing) { console.error(`Local service stopped (${code}).`); cleanup(); process.exitCode = code || 1; } });
}
async function healthy(url) { try { return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; } }
try {
  if (!await healthy(`http://127.0.0.1:${apiPort}/health`)) child(['--use-system-ca', '--env-file-if-exists=server/.env', 'server/index.mjs'], { PORT: String(apiPort) });
  if (await healthy(`http://127.0.0.1:${webPort}/status`)) throw Error(`Web port ${webPort} is busy. Choose a free --web-port.`);
  child(['node_modules/expo/bin/cli', 'start', '--localhost', '--port', String(webPort), '--max-workers', '2'], { EXPO_PUBLIC_API_URL: '/api', EXPO_PACKAGER_PROXY_URL: publicOrigin });
  gateway = createLocalHttps({ cert: await readFile(certPath), key: await readFile(keyPath), publicOrigin, webOrigin: `http://127.0.0.1:${webPort}`, apiOrigin: `http://127.0.0.1:${apiPort}` });
  await new Promise((resolve, reject) => { gateway.once('error', reject); gateway.listen(port, host === 'localhost' ? '127.0.0.1' : host, resolve); });
  console.log(`\nMyArad local HTTPS: ${publicOrigin}/map`);
  console.log('The web app and API share this origin. Ctrl+C stops this HTTPS preview.');
} catch (error) { console.error(error.message); cleanup(); process.exitCode = 1; }
