# Mobile panels and navigation update

- Removed Directions from desktop/mobile navigation. Legacy `/transport` links
  redirect to the map; routing remains available in each selected place's details.
- Four icon-only tabs retain translated accessible names and active-page state.
- Explore uses a 180px initial sheet and a visible 30px touch grab area. Resizing
  opens the results without requiring a search; height persists independently.
- Place directions start collapsed to reduce detail-page clutter.
- Route mode hides ordinary place pins/clusters while leaving route geometry,
  destination and the current-location marker visible.
- The website header exposes a highlighted Download APK button to `/download`.

Validation in the running Android emulator's WebView: three touch-drag cycles
with an empty search expanded Explore from 180px to 372px. All four bottom tabs
rendered SVG icons with accessible labels. Selecting a result exposed a collapsed
directions section; opening it displayed the route controls. Ordinary map markers
were hidden when route mode was applied. Lint and TypeScript passed.

These are source/UI changes. The previously published standalone APK must be
rebuilt with the original release signing key and the existing public `/api`
endpoint before it contains this update. Do not change the current tunnel URL.
