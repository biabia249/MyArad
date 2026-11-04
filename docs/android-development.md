# Android development on Windows

This project uses Expo SDK 58 and a development build for Google sign-in.

## Reanimated / Ninja mkdir build failure

Long generated C++ paths can fail with Ninja 1.10.2 bundled in CMake 3.22.1.
Reanimated recommends Ninja 1.12 or newer and a short project path:
https://docs.swmansion.com/react-native-reanimated/docs/guides/building-on-windows/

Install CMake **3.31.1** through Android Studio > SDK Manager > SDK Tools >
Show Package Details > CMake. Setting an environment variable does not install
the tool. Close any active Android builds. From the project folder, run:

```powershell
npm.cmd run android:windows -- -Clean
```

This clears only generated native build caches inside the project, including
old codegen files, and builds from the original C: path. Avoid SUBST drive
aliases: Node can resolve dependencies to C: while Gradle uses M:, causing
the codegen error `this and base files have different roots`.
The helper runs prebuild to apply `plugins/with-android-cmake.js`. This sets
CMake 3.31.1 for Android modules and `CMAKE_OBJECT_PATH_MAX=180` to shorten
generated object paths. Reanimated 4.7.1 does not read `CMAKE_VERSION`, so
setting that environment variable alone does not select its build tools.
Use `npm.cmd run android:windows` for later builds.

If the SDK Manager UI does not show individual CMake versions, install from
PowerShell:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\android.exe" --sdk="$env:LOCALAPPDATA\Android\Sdk" sdk install cmake/3.31.1
npm.cmd run android:windows -- -Clean
```

## Google sign-in

The authentication backend runs separately from Metro. Metro uses port 8081;
the backend defaults to port 3001.

1. In Google Cloud, create an OAuth client of type **Web application** for the
   backend. Configure its consent screen and add your account as a test user
   if the app is in testing.
2. Expose backend port 3001 through an HTTPS development tunnel. Use its actual
   HTTPS origin below, without a trailing slash.
3. Register exactly `https://YOUR-BACKEND/auth/google/callback` as the client's
   authorized redirect URI. Google returns to the backend, which returns to
   the development app at `myarad://auth/callback`.
4. In `server/.env`, set `PUBLIC_BASE_URL=https://YOUR-BACKEND`,
   `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`. Keep the secret on the server.
5. In `.env.local`, set `EXPO_PUBLIC_API_URL=https://YOUR-BACKEND`.
6. Start `npm run backend` in another terminal. Restart Metro after editing
   `.env.local`, then open the development app and tap Google sign-in.

For local password sign-in without a tunnel, the Android Studio emulator can
use `EXPO_PUBLIC_API_URL=http://10.0.2.2:3001`. Emulator `localhost` refers to
the emulator itself. A host-only localhost Google callback will not reach
the computer from the emulator browser.

Never put `GOOGLE_CLIENT_SECRET` in an `EXPO_PUBLIC_` variable. Expo Go cannot
handle this project's custom app callback; install the development build.
