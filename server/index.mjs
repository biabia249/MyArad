import {networkInterfaces} from 'node:os';
import { createApp } from './app.mjs';

const port = Number(process.env.PORT || 3001);
const localHosts = ['localhost','127.0.0.1',...Object.values(networkInterfaces()).flatMap(entries=>(entries||[]).filter(a=>a.family==='IPv4'&&!a.internal).map(a=>a.address))];
const developmentOrigins = localHosts.flatMap(host=>[8081,8082].map(port=>`http://${host}:${port}`));
if(process.env.WEB_ORIGIN) developmentOrigins.push(process.env.WEB_ORIGIN);
const server = createApp({
  publicUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${port}`,
  database: process.env.DATABASE_PATH || 'server/data/myarad.sqlite',
  production: process.env.NODE_ENV === 'production',
  webOrigins: process.env.NODE_ENV === 'production' ? undefined : developmentOrigins,
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:8081',
  eventPosting: process.env.EVENT_POSTING || 'google',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
});
server.listen(port, '0.0.0.0', () => console.info(`MyArad authentication backend listening on port ${port}`));
