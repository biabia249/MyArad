# Profile, route comparison and consistent panels

Public profiles show accepted friends, with an authenticated friends list that
preserves private-profile access rules. Follow/follower controls are removed from
the UI; legacy server endpoints remain compatible with earlier APKs. Community
headings now use “Utilizatori” / “Users”.

`ui-system.css` defines shared body/heading fonts, heading sizes, panel surfaces,
rounded controls and a single purple primary-action color. Events, users and
profiles follow the same light/dark palette, including profile statistics.

The route planner has one Find route action. It queries walking, driving, cycling
and public transport concurrently, shows the earliest-arrival option for each
available mode, and lets users choose through result cards only. Vehicle routes
without line numbers are labeled by actual mode rather than falling back to Walk.
A pedestrian-only provider result is never presented as a tram/bus or car route.
Missing routes and unavailable services are reported separately. The detail sheet
keeps its existing drag handle; route content grows and scrolls in the outer body.

Validation: lint and TypeScript; 11 focused profile/route tests; browser checks for
accepted friends, matching light/dark surfaces, all four real provider modes at
Sf. Anton de Padova, purple route/ticket controls, sheet expansion and full scroll.
Android profile friends and “Utilizatori” were checked in the visible emulator.
Physical-device GPS and closed-app push are not validated; Firebase/FCM is absent.
