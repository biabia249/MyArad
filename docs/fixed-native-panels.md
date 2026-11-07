# Compact navigation and resizable outer panels

This replaces the earlier native panel presets.

- Android and web share a left modal navigation drawer. It occupies no space
  when closed and closes after choosing a page. Theme/language settings live here.
- A single content panel is shown beside/over the map. Place details replace
  discovery results instead of adding a second sidebar.
- On phones, drag the top edge to resize the whole full-width panel, even before
  searching. On desktop, drag its side or bottom edge. Text is not scaled.
- Inner ResultsSplitter controls are removed. Filters/results flow normally
  within the panel. Event calendar and advanced filters expand on request.
- The header map/panel button hides or restores the panel. Attribution stays
  at the bottom of the map. Native bottom tabs/preset bars are removed.
- Old saved panel sizes are isolated through the v2 storage key.

Validation: lint/typecheck; public web at desktop and phone sizes checked for
outer resizing, initial results, stable font size, one details panel, drawer
navigation/Escape dismissal, event details, and map-only mode. The signed Android
release is also exercised in the Linux emulator before publication.

Build and publish using the existing release key and existing public tunnel;
see android-release.md. Do not restart the tunnel to deploy UI changes.
