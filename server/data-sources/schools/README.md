# Arad County school coverage

The full directory comes from the Ministry of Education's **2025–2026 school network**, generated on 8 October 2025, published at https://data.gov.ro/dataset/retea-scolara-2025-2026. It includes institutions with legal personality and their attached units, public and private, schools, kindergartens and education support organisations. The source snapshot contains 456 Arad records. These are **not 456 independently verified school buildings**. School mergers after the source date require a newer official source.

`network-2025-2026.json` preserves the original county rows and column definitions. `catalog.json` exposes the complete searchable directory. Records without a reliable match to a mapped education feature have no latitude/longitude and are labelled unconfirmed in the UI.

Coordinates come from OpenStreetMap contributors, downloaded from https://download.geofabrik.de/europe/romania.html (ODbL: https://www.openstreetmap.org/copyright). The county boundary comes from geoBoundaries gbOpen ROU ADM1, https://www.geoboundaries.org/api/current/gbOpen/ROU/ADM1/. Boundary shape metadata is retained in the GeoJSON. Node coordinates are points; way coordinates are geometry centres, not verified school entrances.

Registry matches require the same locality and matching distinctive name or matching street/number and school type. Ambiguous distant candidates remain unmatched. Exact-name node/building duplicates within 80 metres share an alias. Original map identifiers remain available; separate buildings are retained.

The reported missing Nicolae Bălcescu school has SIIIR code `0262100468`, Strada Poetului 89A. Map source: https://www.openstreetmap.org/node/6579694795; independently inspected at https://mapcarta.com/N6579694795. Its historical Generală 11 names are searchable aliases. Official address corroboration: https://www.primariaarad.ro/dm_arad/portal.nsf/AllByUNID/83C905E5B6E9DC66C2258D4800594C71/%24FILE/1%20PH%20din%2026%2011%202025%20nr.%20573%20Anexa%20nr.%209.1%20la%20statut%20retea%20%20scolara-2025-2026.pdf

Refresh:

1. `node scripts/download-school-registry.mjs`
2. `py -X utf8 scripts/extract-school-network.py`
3. `node scripts/download-school-osm.mjs` (stores Romania PBF in the operating system temp directory)
4. `py -m pip install --target "$env:TEMP/myarad-school-tools" osmium` (PowerShell; extraction tooling only)
5. `py -X utf8 scripts/extract-school-osm.py`
6. `node scripts/import-county-schools.mjs`
7. Restart the backend; run lint, typecheck and backend tests.

Inspect registry year and new unmatched records after refreshing; do not replace missing coordinates with locality centres.
