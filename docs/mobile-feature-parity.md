# Web / mobile feature audit

The city screens use the same `CityExplorer` DOM interface on web and inside
the Expo native WebView. Platform services cross explicit async callbacks in
`CityProps` and `src/app/map.tsx`; no server credentials are bundled with the app.

| Feature | Web | Android / iOS |
| --- | --- | --- |
| Explore, school directory, fuzzy search, map layers, markers and details | Shared DOM implementation | Same implementation; compact map/results sheet |
| Transit stops, routes and trip planning | Shared backend/API | Same backend/API; touch-sized inputs |
| Event discovery, categories, date ranges, refresh and chronological sorting | Shared implementation | Same implementation; native date/select controls in WebView |
| Internal navigation | Expo Router | Expo Router `navigate`, avoiding duplicate tab routes |
| Authentication, sign-out, profile and personal/public schedules | Browser session storage | SecureStore; profile refreshed whenever a screen regains focus |
| Native calendar event creation | Google/Outlook links, .ics download | OS calendar editor, Google/Outlook links, .ics sharing |
| .ics export to other calendar apps | Browser file download | FileSystem cache file + native share sheet |
| External source, map directions and phone links | Browser window / link handler | Native Linking.openURL |
| Location | Expo location service | Expo permission flow and cached/fresh location |
| Profile photo upload | File input / FileReader in DOM | Same file input in WebView; 1 MB size limit remains |
| Theme, language and panel splitters | Browser storage | Native theme storage; WebView language/layout storage; pointer/touch splitters |

Calendar export is an explicit save/import; it is not automatic two-way sync.
Search uses a longer request timeout for event aggregation on slow connections.
The app still requires its configured HTTPS backend; the preview build currently
uses a temporary Cloudflare tunnel.

## Validation performed

- Lint and TypeScript checks.
- Expo Doctor dependency/configuration checks.
- Backend and pure calendar/search/date/bootstrap tests.
- Production Android and iOS JavaScript/Hermes and DOM bundle exports.
- Four mocked native-bridge tests for Android .ics sharing, iOS calendar times,
  denied calendar permission and unavailable file sharing. These test logic,
  not the device's real permission dialogs or receiving calendar applications.
- EAS preview APK build for native compilation and icon packaging.

These checks do not prove every interaction works on a device. Windows Computer
Use denied access to `qemu-system-x86_64` during this audit. No emulator click,
calendar permission acceptance, photo selection or native share-sheet interaction
is claimed as tested.

## Device acceptance pass still required

On Android and iOS: open every tab; use typo-tolerant search; select map places;
switch layers; resize both pane types; plan a trip; filter event dates/categories;
refresh news; sign in and return to an already-open screen; save a plan; edit a
profile/photo; follow a public profile; sign out; grant/deny location/calendar
permissions; save and cancel a native event; export an .ics file; open Google and
Outlook and return to the app. Repeat with a slow/offline connection and ensure
errors remain recoverable. Verify the launcher icon after installing the new APK.

## Icon asset

`assets/images/app-icon.png` is a prepared raster version of the user's brown
geometric reference. Android adaptive foreground and web favicon are derived
from that asset. The iOS Icon Composer placeholder and old Android assets are no
longer referenced by app configuration. Preparation used the built-in ImageGen
tool with the prompt: faithfully prepare the supplied brown geometric image,
preserving its colours, layered starburst outlines and proportions, without
adding text or elements. It is a generated preparation, not a byte-identical copy
of an original local attachment file.
