# Profile, search and favorites polish

- Shared theme selectors now take precedence over legacy dark styles. Privacy panels and full search containers use the same surface; search inputs remain transparent.
- Event participants receive their saved profile photo from the API. Initials remain the fallback for missing or failed images.
- Favorites use image cards and lavender save/remove controls, retaining the existing device-local favorites.
- Community events' map button opens the actual event details through `/map?place=event:<id>`. Imported articles retain their existing map view, now titled after the event.

Validation: lint and TypeScript pass; 12 focused server/route tests pass. Mobile-width Chromium checks pass in light and dark modes for privacy/search colors, favorites image/navigation, participant photo and initials, and event-to-map navigation. Browser fixtures are intercepted, leaving real accounts and events untouched. Release APK compiles and installs using the original signing certificate.

External-event attendance is not implemented in this change. The previous temporary Cloudflare hostname expired (`Tunnel not found` and DNS failure); a replacement requires updating the native API URL and rebuilding before public distribution. Do not distribute a build targeting the expired hostname.
