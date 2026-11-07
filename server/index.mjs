import { createApp } from './app.mjs';

const port = Number(process.env.PORT || 3001);
const server = createApp({
  publicUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${port}`,
  database: process.env.DATABASE_PATH || 'server/data/myarad.sqlite',
  production: process.env.NODE_ENV === 'production',
  webOrigins: process.env.NODE_ENV === 'production' ? undefined : ['http://localhost:8081','http://localhost:8082','http://127.0.0.1:8081','http://127.0.0.1:8082'],
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:8081',
  eventPosting: process.env.EVENT_POSTING || 'signed-in',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
});
server.listen(port, '0.0.0.0', () => console.info(`MyArad authentication backend listening on port ${port}`));
