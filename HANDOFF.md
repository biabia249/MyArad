# MyArad handoff

Worktree contains the hackathon implementation and follow-up changes; not committed/pushed in this run.
Read AGENTS.md first. Node 24/npm are installed under ~/.local/opt/node24 and linked in ~/.local/bin.
Android build uses JAVA_HOME=$HOME/.local/opt/jdk17 and ANDROID_HOME=$HOME/Android/Sdk.

Implemented: bilingual map with 221 sourced places/41 education locations, county viewport,
CyclOSM cycling tiles, Esri satellite, community events/comments/attendance, private-by-default
personal plans and opt-in public schedules, profile photo/bio/location/interests, in-app transit
journeys/geometry/lines/stops using the public official Transport Public Arad service, official ticketing link.

Latest: shared persisted light/dark theme, system preference default, native SecureStore/browser localStorage.
Native DOM switched to react-native-webview via useExpoDOMWebView:false after user screenshot showed
Expo DomWebView.injectJavaScript native view-cast rejection. Dependency installed and Android rebuilt successfully.
Do not claim the native error is conclusively eliminated: final navigation regression check was pending at handoff.

Validation: lint and TypeScript pass; 15 backend tests passed before theme changes. Browser theme toggle,
persistence/reload, and device dark preference passed. Prior Android map, simulated GPS and actual transit
journey passed. Android rebuilt with react-native-webview successfully. Browser profile editing/public
visibility and event flows passed. Earlier Android/iOS/web exports passed before latest theme/provider changes.
iOS has NOT been installed/tested on physical hardware.

Known limits: transit upstream is a public undocumented service, not a contractual integration; no claimed
live tram tracking. Tickets handled in official service. Password emails not verified. Missing source fields
are displayed as unavailable. Events restricted to city bbox; map/routing support larger county rectangle.
Photo upload allows PNG/JPEG/WebP up to 1 MB; profile details inherit public-schedule opt-in visibility.
Review contrast across auth text and all dark-mode controls on real devices.

Docs: docs/hackathon-testing.md, docs/ios-testing.md, docs/android-development-linux.md.
EAS profiles: development, preview (standalone internal), simulator, production.
iPhone needs reachable HTTPS backend, Expo project access and Apple signing/device registration.
Configure EXPO_PUBLIC_API_URL in matching EAS environment; local ignored .env files are not cloud configuration.

Run npm run lint; npx tsc --noEmit; npm run test:backend.
Start backend: npm run backend. Start Metro: npx expo start --dev-client. Web: npm run web.
The emulator needed explicit DNS 1.1.1.1,8.8.8.8 after the host network changed.
Use adb reverse tcp:8081 tcp:8081 for a localhost Metro server.

Temporary browser checks are in /tmp/myarad-browser (Playwright using /usr/bin/chromium), not repository tests.
Current native theme check: /tmp/myarad-browser/native-theme.cjs; devtools forward localhost:9223 may need updating
using the webview_devtools_remote_PID socket from adb shell cat /proc/net/unix.

Next suggested features: saved commute/departure shortcuts, event reminders/calendar export,
reporting/moderation, official supported transport integration, then real-device iOS testing.

Final check outcome: all 15 backend tests pass. Browser theme checks passed.
The final Android navigation/theme smoke test timed out waiting for map tiles; the inspected
embedded page had empty body text, then its debugger page disappeared. Investigate native
DOM startup with the RNWebView provider before calling the bridge crash fixed. Do not
suppress the exception or claim this Android regression is resolved. Consider restarting
Metro and validating the new native build/provider handshake. User asked to stop soon
because usage was low and continue on another Codex account.

## 2026-11-07 social, notifications and session update
- `/people`: account search, avatars, friend requests, acceptance, private friend-only chat. Messages stored in SQLite; polling every 6s.
- Event details include named participant avatar bubbles (up to 200), without emails.
- Header bell: recipient-only notifications for requests, acceptance and messages; polling every 5s plus window focus; incoming messages show an in-app toast. Mark-read operations are scoped to the recipient.
- Web login token now persists in localStorage across refresh and is cleared on explicit logout; native uses SecureStore. Keep hostname consistent (`localhost` and LAN IP have separate browser storage).
- City API limits now separate authenticated users (240/min) from auth attempts (60/min per IP), so people sharing a hotspot can poll independently.
- Schedule/public profile "Cum ajung?" opens `/transport?lat=...&lng=...&name=...` and prefills the in-app planner. Public schedules remain opt-in.
- Explicitly requested deletion of accounts `puleamea` and `da2` completed in a transaction, including dependent data, foreign key check passed.
- Native Expo push registration and server submission added (`expo-notifications`, plugin, `src/features/push.ts`, `server/push.mjs`). Enable from bell on a physical phone. Requires NEW native build and EAS FCM/APNs credentials; NOT device-validated. Expo send ticket rejection logged without exposing tokens. Delivery receipts/retries still need production hardening. Optional `EXPO_ACCESS_TOKEN` supported. No web push implementation.
- Venue expansion: 659 records, including sport/health/entertainment/stay filters. `scripts/import-expanded-places.py` uses downloaded OSM and supplied tourism snapshots. Original IDs preserved. `photo-audit.json`: 308 source-linked image URLs all returned image content; 351 places have no source photo. HTTP checks are NOT visual verification. Individual missing venues such as BoogieRoll still need verified coordinates/source photos. Do not claim exhaustive coverage or all-photo visual validation.
- Backend 17 tests passed, lint/typecheck passed. Two browser users tested search/request/accept/message receive; notifications and mobile no-overflow checked. Public-profile internal destination navigation passed; later school-page browser selector timed out (rendered page text contained school listings).

## Native testing update (2026-11-07)
- User has Android + iPhone, NO Apple Developer membership. iPhone path is Expo Go SDK58, not a signed standalone IPA. User has not tried it yet; no iPhone hardware validation claimed.
- Running phone Metro on 8083 with `EXPO_PUBLIC_API_URL=http://172.20.10.8:3001`. iOS QR at `/tmp/myarad-phone-qr.png`, payload `exp://172.20.10.8:8083`.
- Added `npm run phones` to choose a LAN address and supply the native API URL. Keep backend separately running.
- Android: identified RNWebView initial-props race. `injectedJavaScriptBeforeContentLoaded` alone was insufficient; default ExpoDOM provider still reproduced the view-cast exception. Kept RNWebView and patched document-start injection using AndroidX `DOCUMENT_START_SCRIPT`. Patch is `patches/react-native-webview+14.0.1.patch`, applied via postinstall patch-package. It contains ONLY RNCWebView.java changes; no generated build files.
- expo-asset direct dependency/config plugin added for expo-audio; expo-doctor now 20/20.
- Rebuilt and installed debug development app on Medium_Phone. Separate phone-compatible debug APK built successfully with arm64-v8a + x86_64; verified both ABIs in archive.
- `npm run android:share` stages ignored `public/device-test` files into Metro's existing port, install page `http://172.20.10.8:8083/device-test/index.html`. Download APK, install, return to page and tap Open MyArad. No extra server port required. Delete staged public/device-test before release exports.
- iOS export including DOM bundle succeeded (`/tmp/myarad-ios-export`). iOS device test pending; Android physical device test pending. Push credentials still unconfigured.
- Docs updated in docs/ios-testing.md and docs/android-development-linux.md.
- Final active-WebView Android smoke test PASSED: satellite tiles, native theme callback, People/Transport/Schools/Map navigation, university search results, simulated Arad GPS, DOM reload, and no uncaught DOM exceptions. Screenshot `/tmp/myarad-android-running.png`. Lint/typecheck passed.

## Team merge completed
- Integrated origin/main d615176 and origin/bia f0c008b with local f883cb0, preserving the colleague's UI, school directory, search/event/calendar features and local social/native fixes.
- Merge commits d95522c and 77ae51c. 77ae51c pushed to main and fix/team-sync; bia left untouched.
- Profiles now use friend requests/counts like People; old follow API/data retained for compatibility. Persistent web sessions migrate existing sessionStorage tokens.
- Combined places: 807, including 202 education map entries. School registry: 456 official 2025–26 rows, 47 matched to map features. Unmatched school coordinates are explicitly unavailable, not guessed. Nicolae Bălcescu included.
- Coordinate audit: 219 source footprints checked, 15 outside points moved inside; no entrance accuracy claimed. Audit rerun makes zero additional changes. Source aliases preserved for both tourism imports.
- Verified 36 backend tests + 8 script tests, lint/typecheck and Expo doctor 20/20. Two-browser social/login/read-notification flow passed. Live web school-directory/Bălcescu selection passed.
- Updated universal Android development APK (arm64-v8a/x86_64) built in 27s, installed to emulator and staged at the existing install page on port8083. New native module expo-calendar included.
- Phone install page: http://172.20.10.8:8083/device-test/index.html. iPhone Expo Go exp://172.20.10.8:8083, hardware test still pending.
