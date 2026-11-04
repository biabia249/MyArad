# MyArad authentication

Authentication now uses the Node backend in `server/`, with persistent SQLite accounts, scrypt password hashes, opaque revocable sessions, Google OAuth, and password reset delivery through Resend. The mobile app stores session tokens in Expo SecureStore. Browser sessions stay in memory, and require signing in again after refresh. No plaintext passwords are saved or logged.

## Start email/password authentication locally

Requires Node.js 24 or newer. From the project folder in PowerShell:

```powershell
npm.cmd install
Copy-Item server/.env.example server/.env
Copy-Item .env.example .env.local
npm.cmd run backend
```

The local environment files have already been created if they did not exist. **Do not overwrite them if you have entered credentials.** Keep the backend terminal open. SQLite data is saved to `server/data/myarad.sqlite`, which is ignored by Git. Back up this directory to preserve accounts.

In another terminal:

```powershell
npx.cmd expo start --go
```

For a physical phone, edit `.env.local`: set `EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:3001` and keep the phone on the same Wi-Fi. For the standard Android emulator use `http://10.0.2.2:3001`. Restart Expo after editing the file. Local HTTP is accepted in development only; release builds require HTTPS.

Email/password signup and sign-in can be tested in Expo Go. **Google's return link uses the `myarad` app scheme and needs a development build on phones.** Browser Google sign-in also works using the web app, described below.

## Set up Google for the first time

You must own a Google Cloud project to receive credentials. No credentials are bundled with this project and no Google account is simulated.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project named MyArad.
2. Open **Google Auth Platform**. Configure **Branding** (app name and support email), **Audience** (External), and **Contact Information**. If the app is in Testing, add your own Google email under test users.
3. Run the backend on a public **HTTPS** hostname. For development, an HTTPS tunnel to port 3001 works; for deployment use a Node host with a persistent disk for SQLite. Put that base URL in `PUBLIC_BASE_URL` in `server/.env` and in `EXPO_PUBLIC_API_URL` in `.env.local`.
4. Under **Clients**, create an OAuth client of type **Web application**. This is a server-mediated flow; its secret stays on the backend.
5. Add this **Authorized redirect URI**, replacing the hostname with the exact backend URL:

   ```text
   https://YOUR_BACKEND_HOST/auth/google/callback
   ```

6. Copy the client ID and client secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in **`server/.env` only**. Do not put the secret in any `EXPO_PUBLIC_` variable or send it through chat.
7. Restart the backend and Expo. Press **Sign up with Google** or **Sign in with Google**. The system browser opens Google's account chooser, the backend verifies Google's ID token, and a one-use code returns to MyArad to create a session.

Only `openid`, `email`, and `profile` are requested. OAuth state, a nonce, and PKCE protect the flow. Google tokens and the client secret are not sent to the app. The backend never automatically links a Google identity to an existing password account with the same email; that account must continue using its password until an explicit account-linking feature is added.

### Test Google in the browser first

With Google credentials and the HTTPS backend configured:

```powershell
npx.cmd expo start --web
```

Keep `WEB_ORIGIN=http://localhost:8081` in `server/.env` if that is the exact browser address. Update it if Expo uses a different port/hostname. It is an allowlist, not a wildcard. The backend returns to that origin's `/auth/callback` route after Google's HTTPS callback. The browser holds the PKCE verifier in session storage only until the exchange completes.

### Build the mobile app

The native app identifiers are configured as `com.myarad.app`. Choose identifiers you own before publishing.

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest build:configure
npx.cmd eas-cli@latest build --profile development --platform android
```

Install the resulting development build, then run:

```powershell
npx.cmd expo start --dev-client
```

For iPhone, use `npx.cmd eas-cli@latest build --profile development --platform ios`. Physical iPhone builds require Apple signing and device registration. A local iOS Simulator requires macOS. No native project folders need to be edited by hand.

## Password reset email

Create a Resend account and verify your sender domain. Set `RESEND_API_KEY` and `EMAIL_FROM` in `server/.env`, and use an HTTPS `PUBLIC_BASE_URL`. Restart the backend. The reset endpoint sends an expiring link to a server-hosted reset form; saving a new password invalidates previous sessions. When mail delivery is not configured, the app shows a clear error and does not claim an email was sent.

## Checks and manual testing

```powershell
npm.cmd run test:backend
npx.cmd expo lint
npx.cmd tsc --noEmit
npx.cmd expo export --platform android --platform ios --output-dir .cache/auth-export
```

The backend tests cover registration validation, login by username/email, duplicate accounts, persistence across restart, password hashing, expired/revoked sessions, Google state/nonce/PKCE checks, single-use codes, rejected account linking, reset token reuse, and rate limits. Google is replaced by a test double in those tests; a real consent flow still needs credentials and device/browser testing.

Manually register an account, restart the backend and app, and sign in again. Try both username and email, wrong passwords, duplicate signup, Google cancellation, and sign-out followed by reopening the app. Check each form with the keyboard open on iOS and Android.

## Deployment

Run `npm run backend` with Node 24+, `NODE_ENV=production`, an HTTPS `PUBLIC_BASE_URL`, configured credentials, and a persistent volume at `DATABASE_PATH`. Keep secrets in the hosting provider's secret settings and back up the database. This implementation is a single-instance backend. Multi-instance deployments need a shared database and shared rate limiter. The current limiter uses the connecting IP; configure trusted proxy handling deliberately if hosting behind a reverse proxy. Password signup does not yet require email ownership verification.

Implementation references: [Google server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Expo authentication and redirects](https://docs.expo.dev/guides/authentication/), and [SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/).

## Add a password to a Google account

Sign in with Google, then fill New password and Confirm password and press Set password on the signed-in screen. This authenticated action adds a hashed password to the same account, preserves Google sign-in and the current session, and revokes other sessions. It cannot overwrite an existing password; use Forgot password for that. After saving, email/password login and emailed password resets work for this account. No database migration or native rebuild is required.
