# Android development on Linux

Open the repository root in Android Studio and select **Project** in the file
panel. The application is written in React Native/TypeScript:

- `src/app/index.tsx`: welcome screen.
- `src/features/auth/auth-screen.tsx`: sign-in and sign-up behavior.
- `src/features/auth/auth-ui.tsx`: shared authentication layout and styling.
- `src/app/forgot-password.tsx`: password recovery screen.
- `src/features/auth/auth-service.ts`: client requests and session handling.
- `server/`: Node.js authentication backend and SQLite storage.

Do not edit the generated `android/` directory for application UI changes.

## Prerequisites

Use Node.js 24+, a compatible JDK, Android SDK, and a running Android virtual
device. This checkout's native configuration requests CMake 3.31.1.
Set `JAVA_HOME` to your development JDK and `ANDROID_HOME` to your SDK:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

## First setup

```bash
npm ci
cp -n .env.example .env.local
cp -n server/.env.example server/.env
```

For the Android emulator, `.env.local` should contain:

```dotenv
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001
```

## Run and install

Start your virtual device through Android Studio's Device Manager. In a
terminal at the repository root, start the backend:

```bash
npm run backend
```

Leave that terminal running. In another terminal at the same location:

```bash
npm run android
```

This builds and installs the development app, then starts Metro. If Metro is
already running, use `npx expo run:android --no-bundler` instead.

After installation, later sessions only need the backend and:

```bash
npx expo start --dev-client
```

Press `a` to open the app on Android. Save changes in `src/` to use Fast
Refresh. Rebuild after changing native dependencies or native app configuration.
Restart the backend after changing `server/` files, and restart Metro after
changing `.env.local`.

## Check your changes

```bash
npm run lint
npx tsc --noEmit
npm run test:backend
```

In the emulator, manually test signup, signout, login by username and email,
incorrect passwords, validation messages, and reopening the app. Test keyboard
and scrolling behavior too. Google sign-in needs Google credentials and a
browser-accessible backend callback; password reset delivery needs Resend.
See `AUTHENTICATION.md` for those integrations. Automated integration tests use
test doubles for Google and email delivery.
