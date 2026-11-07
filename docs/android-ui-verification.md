# Android UI verification — 7 November 2026

Environment: running Pixel4 Android emulator, package `com.myarad.app`, development
client connected to Metro through ADB reverse and localhost. No production
accounts or messages were created for these checks.

Observed checks:

- The city interface loads in SDK 58's Expo DOM WebView. The alternative RN
  WebView failed its initial DOM bridge injection in this emulator.
- On Explore, hiding/reopening panels passed three consecutive cycles. Map-only
  mode hides all side panels and resize handles.
- Native page navigation passed 15 transitions: Events, Messages, Schools,
  Directions, and Map, repeated over three cycles.
- Directions renders the floating search, category shortcuts, and street/satellite
  switch. A real walking route returned by the transport service was drawn with
  burgundy `#800020` paths and a destination marker.
- Android displayed the foreground location permission dialog. Granting it
  changed both fine/coarse permissions to granted. Google Location Accuracy has
  a separate system prompt. The emulator's position provider returned unavailable;
  a real GPS fix and physical-device navigation remain unverified. The UI reports
  position unavailability separately from permission denial.
- The actual SocialView component was mounted inside the Android WebView with
  isolated synthetic users/messages. Opening a 60-message conversation landed at
  its end in three consecutive runs and hid the contacts panel on mobile.
- An incoming 61st message preserved the scroll position while reading history.
  The “Ultimul mesaj” button then moved to the latest message.

The synthetic chat harness checks component layout/scroll behavior. Separate
server integration tests cover authenticated messaging, accepted friendships,
outsider rejection, event creation, two-user attendance, public participant names
without emails/internal IDs, and leaving the participant list.

## SDK 58 bridge workaround

`patches/expo+58.0.23.patch`, applied by `postinstall`, catches asynchronous DOM
injection rejection when the original native view has already been disposed.
Rejections for the current live view remain logged. This prevents an unhandled
promise after a pending location/request callback outlives a screen (also observed
during Fast Refresh). Review this patch when updating Expo.

Browser geolocation now calls the browser API directly, including browsers without
`navigator.permissions`. Automated checks distinguish HTTP/insecure origin,
unsupported API, permission denial, timeout, and unavailable position. Native GPS
requests have deadlines so the interface cannot remain indefinitely busy.

Final automated checks: lint and TypeScript passed; 32 server tests and 18 client
utility checks passed. The Expo patch was reapplied successfully by postinstall.
