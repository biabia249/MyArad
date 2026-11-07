export function resolveApiUrl(configured: string | undefined, development: boolean, webHostname?: string, webOrigin?: string) {
  if (!configured) throw new Error('The server address is missing. Set EXPO_PUBLIC_API_URL and restart the app.');
  if (configured.startsWith('//')) throw new Error('Use an absolute API URL or a same-origin path such as /api.');
  if (configured.startsWith('/') && !webOrigin) throw new Error('A relative API URL can only be used in a web browser.');
  const url = new URL(configured, configured.startsWith('/') ? webOrigin : undefined);
  if (development && webHostname && ['localhost', '127.0.0.1', '[::1]', '10.0.2.2'].includes(url.hostname)) url.hostname = webHostname;
  if (url.protocol !== 'https:' && !(development && url.protocol === 'http:')) throw new Error('The authentication server must use HTTPS.');
  return url.toString().replace(/\/$/, '');
}
