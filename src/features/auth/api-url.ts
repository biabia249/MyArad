export function resolveApiUrl(configured: string | undefined, development: boolean, webHostname?: string) {
  if (!configured) throw new Error('The server address is missing. Set EXPO_PUBLIC_API_URL and restart the app.');
  const url = new URL(configured);
  if (development && webHostname && ['localhost', '127.0.0.1', '[::1]', '10.0.2.2'].includes(url.hostname)) url.hostname = webHostname;
  if (url.protocol !== 'https:' && !(development && url.protocol === 'http:')) throw new Error('The authentication server must use HTTPS.');
  return url.toString().replace(/\/$/, '');
}
