# MyArad test build

## Pages

- `/map`: satellite/street map, search, place details, events and county attractions.
- `/transport`: walking and public-transport journey planning inside MyArad, route lines, stops and directions.
- `/events`: real community events, attendance and questions/comments.
- `/schools`: schools and UAV locations from public sources.
- `/schedule`: personal plans, private by default; opt-in public visibility.
- `/citizen/USERNAME`: public schedules; returns no schedule data unless the owner opted in.

The app opens on the map. Guests can browse without signing in or enabling GPS.
Location starts only after a location action or a route request with “my location” selected.
Foreground map tracking polls every 10 seconds while the page is visible. There is no location-history table.
Public-transport route requests share the journey endpoints with the transport provider.

## Run

Use Node 24+, install with `npm ci`, and copy environment examples without overwriting existing files.
In one terminal run `npm run backend`; in another run `npx expo start --dev-client`.
For browser testing run `npm run web`. The local backend allows localhost ports 8081/8082 in development.
For another port, add that exact origin to the development allowlist in `server/index.mjs`.
Use `EVENT_POSTING=signed-in` in `server/.env` for the agreed prototype posting policy.
Accounts are authenticated, but password signup does not verify email ownership.

The Android emulator uses `http://10.0.2.2:3001` for the API. Browser development automatically
substitutes the browser hostname for this emulator-only address. Physical phones need the
computer's reachable LAN IP in `EXPO_PUBLIC_API_URL` and a reachable Metro server.

After adding Expo Location, build/install the Android development client with `npm run android`.
On this workstation, the installed build JDK is `$HOME/.local/opt/jdk17`; set `JAVA_HOME` accordingly.
Android SDK is `$HOME/Android/Sdk`. Keep generated native folders out of Git.
iOS JavaScript/DOM exports can be checked on Linux; native iPhone installation still needs an iOS build/signing setup.

## Test

```bash
npm run lint
npx tsc --noEmit
npm run test:backend
```

Manually test:

1. Browse as a guest, switch RO/EN, search a place, select a marker, and switch map layers.
2. Open “Cum ajung?”, choose origin/destination stops, calculate a route and inspect walking/transit legs.
3. Browse a line and change its direction. Compare the shown stops with the official operator.
4. Open the official ticketing link. Buying and validating tickets happens in Transport Public Arad, not MyArad.
5. Sign up, publish an actual event, attend/cancel attendance and add a question.
6. Save a place/event to your schedule; verify the public URL is unavailable until you opt in.
7. Turn public visibility off and verify the public page can no longer load the schedule.
8. Deny location access; choose a manual origin instead. Also test GPS on a real phone.

Automated tests use isolated in-memory databases. Browser smoke checks during development
created temporary, clearly labelled accounts/events and removed them afterward.
Android location was tested using simulated Arad coordinates; this does not verify physical-device GPS accuracy.

## Data and limits

- Places: bundled OpenStreetMap snapshot (ODbL), with per-place source URLs.
- Descriptions: Romanian/English Wikipedia excerpts (CC BY-SA), with article links.
- Photos: available source images/Wikimedia thumbnails, with author/license credits where retrieved.
  Missing photos, hours and phone numbers remain explicitly unavailable.
- Satellite: Esri World Imagery with visible attribution. Street map: OpenStreetMap.
  Cycling map: CyclOSM / OpenStreetMap France, showing mapped cycle infrastructure and touring routes.
- Transit: the public endpoints used by the official Transport Public Arad web planner;
  URLs and upstream calls are isolated in `server/transit.mjs`. Stops/routes are cached for five minutes.
  This is a prototype integration with an external public service, not an operator partnership or guaranteed API contract.
  Itinerary timings come from that service and can change; MyArad does not claim to track live tram vehicles.
- Ticketing: `https://arad-transport.telelink.city/app/ticketing` (official account/payment flow).
  Android installation link uses `com.modeshift.arad`. No payment data enters MyArad.
- The county map viewport is a bounding rectangle, not an administrative-boundary polygon.
  Event creation remains restricted to the original Arad city test area.
- Corrections are saved as suggestions; they do not automatically overwrite the source snapshot.
- There are no invented ratings, popularity/visit counts, or demo events presented as real events.

The Android debug APK requires Metro. A standalone production deployment needs a hosted HTTPS API,
production environment configuration, signing and validation on physical Android/iOS devices.
