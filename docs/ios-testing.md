# Install MyArad on an iPhone

## Quick test without Apple Developer membership

Install Expo Go from the App Store (SDK 58 compatible). Connect the iPhone and
computer to the same Wi-Fi/hotspot, then run in separate terminals:

```bash
npm run backend
npm run phones
```

`npm run phones` selects the computer's LAN address and gives the phone a reachable
API URL. Scan Metro's Expo Go QR code with the iPhone Camera. Allow local-network
access and location when requested. The computer and both servers must stay running.
The web app, Android development app and iPhone all use the same backend accounts.
An existing session made under `localhost` in a browser is separate from a native login.

If automatic network selection is wrong, set `MYARAD_DEV_HOST` to the computer's
Wi-Fi address. `MYARAD_API_URL` can override the development backend URL.

This tests through Expo Go; it is not a separately signed MyArad installation.
Push notifications for this project's own app identity require a development build
and configured platform credentials. iPhone hardware validation is still required;
an iOS bundle export alone does not prove device behavior.

## Signed builds

You can build using Expo's cloud service from Linux. A signed iPhone build requires
an Apple Developer Program account and access to this app's Expo project. An iOS
Simulator runs on macOS; it cannot run inside the Android emulator on Linux.

## Prepare the backend first

The current backend runs on your computer. A standalone iPhone build needs a
reachable HTTPS deployment of `server/index.mjs`, Node 24+, a persistent disk for
SQLite, `NODE_ENV=production`, the correct `PUBLIC_BASE_URL`, and authentication
provider settings if you use Google/reset email. Never put server secrets in
`EXPO_PUBLIC_` variables. The app does not host the backend itself.

Choose an iOS bundle identifier you control before signing/publishing; the current
placeholder is `com.myarad.app` in `app.json`. The linked Expo project must be one
you can access. Don't replace another person's project association without coordinating.

## Standalone iPhone test build

From the repository root:

```bash
npx eas-cli@latest login
npx eas-cli@latest device:create
```

Open the registration link on the iPhone and follow the device-registration steps.
Then set your real HTTPS backend URL in the preview environment:

```bash
npx eas-cli@latest env:set --name EXPO_PUBLIC_API_URL --value https://YOUR_BACKEND_HOST --environment preview --visibility plaintext
npx eas-cli@latest build --platform ios --profile preview
```

Follow Expo's signing prompts using your Apple account. Only registered devices
included in the provisioning profile can install this internal build. Open the
finished build's installation link/QR code on the registered iPhone. The `preview`
profile bundles the app; Metro is not required. The HTTPS backend must remain running.

## Live development

For a development client instead of a standalone preview:

```bash
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client --lan
```

Configure `EXPO_PUBLIC_API_URL` in the development cloud environment too. Use the
same reachable backend URL in `.env.local` for local bundling. The iPhone must be
able to reach Metro. Follow any iOS Developer Mode prompt for development builds.

## Simulator (Mac only)

```bash
npx eas-cli@latest build --platform ios --profile simulator
```

Install the simulator build on a Mac's iOS Simulator. It cannot be installed on a
physical iPhone and does not require physical-device registration.

## TestFlight later

Configure the production API URL in the production Expo environment and create
the app in App Store Connect. Then:

```bash
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

Submission uploads a build to App Store Connect; it does not automatically publish
it. Finish TestFlight tester setup and any Apple review steps there.

References:
- https://docs.expo.dev/build/internal-distribution/
- https://docs.expo.dev/build-reference/simulators/
- https://docs.expo.dev/eas/environment-variables/
