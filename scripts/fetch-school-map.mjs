import { writeFile } from 'node:fs/promises';
const query = '[out:json][timeout:120];area["ISO3166-2"="RO-AR"]->.a;nwr[amenity~"^(school|kindergarten|college|university)$"](area.a);out center tags;';
for (const host of ['https://overpass.private.coffee/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
  try {
    const response = await fetch(host, { method: 'POST', body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(150000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    await writeFile(new URL('../server/data-sources/schools/osm-education.json', import.meta.url), JSON.stringify(data, null, 2) + '\n');
    console.log(`OSM education features in Arad County: ${data.elements.length}`);
    break;
  } catch (error) { console.error(host, error.message); }
}
