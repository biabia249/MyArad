# Android direct-download release

Run `scripts/build-android-release.sh` while the public preview is online. It reads
`.cache/public-preview/public-url.txt`, or accepts an explicit HTTPS API origin as
its first argument; it appends `/api` for the public gateway. It disables dotenv loading to prevent a LAN development URL
from replacing the public endpoint. Generated Android code comes from Expo prebuild.

Private signing material is outside the repository in
`~/.local/share/myarad-release/credentials.env` and `myarad-release.jks`.
Keep both backed up privately: future updates must use the same signing key.
The old development APK uses another certificate, so Android cannot upgrade it
in place. Uninstalling it removes local preferences/favorites/session, not accounts
and messages stored on the server.

The release includes ARM64 phones and x86_64 Android emulators, Android 7+.
It embeds the JS and DOM UI and needs no Metro server or Expo Go.
It still needs internet and the Node/Python backend. The Groq key stays on the server.

After verifying the APK on a device/emulator, publish atomically:

```bash
mkdir -p .cache/releases
cp android/app/build/outputs/apk/release/app-release.apk .cache/releases/MyArad.apk.tmp
mv .cache/releases/MyArad.apk.tmp .cache/releases/MyArad.apk
```

The website download button opens `/download`; the APK is streamed through
`/downloads/MyArad.apk`, with HEAD and single-range download support. The old
`/device-test` page now opens these release installation instructions.

A Quick Tunnel address is temporary. Restarting/rerolling it changes the endpoint;
rebuild the APK for the new address. For lasting distribution, use a permanent
host/domain before building the final APK.

In-app notifications/chat work with the backend. Closed-app push requires a
Firebase Android configuration and matching FCM credentials for Expo; these are
not configured for this release. Do not claim closed-app push is verified.

## Launcher artwork

The supplied artwork is preserved in `assets/images/app-logo-source.png`.
`app-icon.png` contains the full image resized to 900px, centered on a transparent
1024px canvas. `app-icon-adaptive.png` uses a 640px image on the same canvas to
keep the whole logo inside Android's adaptive-icon safe area. Neither asset is
cropped. Regenerate native resources through Expo prebuild after changing icons.
