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
