# Fixed native panels

Android/iOS city screens use four explicit display buttons: Map, Compact (34%),
Expanded (62%), Full (100%). Native screens no longer mount PanelResizers and hide
internal ResultsSplitter controls. CSS overrides saved drag heights; desktop/web
resizing remains available. Map-only attribution is placed at the map's bottom.

Opening an event card requests the full-height panel. The event article has a
flexible scrollable body; choosing a community event on the map also supplies it
to the news details panel. Light-theme news/article/form styles now use the app's
light surfaces and readable text instead of hard-coded dark colors.

Verified in the Android emulator WebView: all four preset sizes, zero drag
handles, hidden splitters, attribution at map bottom, and three event panel sizes.
The actual EventNews component was additionally mounted with a synthetic event:
clicking it displayed its title, schedule and description with a positive-height
scroll body in native and web mode; light background rgb(241,243,255) and text
rgb(61,0,0). This component check is not a full desktop-browser deployment test.

Source changes require a new APK signed with the existing release key and a web
build/deployment. The tunnel and public release artifact were not restarted or
replaced on this Windows workspace.
