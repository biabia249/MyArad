import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../server/data-sources/', import.meta.url);
const read = async (file) => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const source = 'https://data.gov.ro/dataset/retea-scolara-2025-2026';
const normalize = (s = '') => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[şș]/g, 's').replace(/[ţț]/g, 't').replace(/[^a-z0-9]+/g, ' ').trim();
const distance = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 77);
const records = (await read('schools/network-2025-2026.json')).records;
const osm = (await read('schools/osm-education.json')).elements;
const towns = await read('schools/locality-points.json');
const places = (await read('places.json')).filter((p) => !p.id.startsWith('siiir/'));
const byId = new Map(places.map((p) => [p.id, p]));
let added = 0;
for (const feature of osm) {
  const tags = feature.tags, name = tags.name || tags['name:ro'];
  if (!name || !['school', 'kindergarten', 'college', 'university'].includes(tags.amenity) && !/scoal|școal|şcoal|lice|colegi|univers|gradini|grădini/i.test(name)) continue;
  const id = `${feature.type}/${feature.id}`;
  const point = { lat: feature.lat ?? feature.center?.lat, lng: feature.lon ?? feature.center?.lon };
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) continue;
  const nearest = towns.toSorted((a, b) => distance(a, point) - distance(b, point))[0];
  const locality = tags['addr:city'] || nearest?.name || '';
  const address = [tags['addr:street'], tags['addr:housenumber'], locality].filter(Boolean).join(', ');
  const existing = byId.get(id);
  if (existing) {
    existing.locality ||= locality;
    existing.tags = [...new Set([...(existing.tags || []), locality, tags.amenity].filter(Boolean))];
    continue;
  }
  // A node and a building polygon can describe the same campus.
  const duplicate = places.find((p) => p.category === 'education' && normalize(p.name) === normalize(name) && distance(p, point) < .08);
  if (duplicate) {
    duplicate.alias_ids = [...new Set([...(duplicate.alias_ids || []), id])];
    continue;
  }
  const place = { id, name, ...point, category: 'education', locality, address, description: '', phone: tags.phone || tags['contact:phone'] || '', website: tags.website || tags['contact:website'] || '', hours: '', image: '', wikipedia: '', source: `https://www.openstreetmap.org/${id}`, tags: [tags.amenity || tags.building, locality, 'școală', 'educație'].filter(Boolean), education_source: 'OSM / Geofabrik Romania' };
  places.push(place); byId.set(id, place); added++;
}
const catalog = records.map((r) => ({ id: r.L, name: r.N, short_name: r.M, locality: r.H, parent_id: r.F, parent_name: r.G, status: r.P, type: r.O, ownership: r.T, school_year: r.A, address: [r.U?.trim(), r.V?.trim(), r.H].filter(Boolean).join(', '), street: r.U?.trim(), number: r.V?.trim(), phone: r.X, email: r.Z, source }));
const kind = (s) => /gradinit|cresa/.test(normalize(s)) ? 'kindergarten' : /lice|colegi|seminar/.test(normalize(s)) ? 'secondary' : /scoal/.test(normalize(s)) ? 'school' : 'other';
const educational = places.filter((p) => p.category === 'education');
const claimed = new Set();
for (const school of catalog) {
  const local = normalize(school.locality), name = normalize(school.name), significant = name.split(' ').filter((w) => !['scoala', 'gimnaziala', 'liceul', 'colegiul', 'national', 'tehnologic', 'gradinita', 'cu', 'program', 'prelungit', 'normal', ...local.split(' ')].includes(w));
  const matches = educational.filter((p) => !claimed.has(p.id) && normalize(p.locality) === local).map((p) => {
    const pName = normalize(p.name);
    let score = pName === name ? 100 : 0;
    if (significant.length && significant.every((w) => pName.split(' ').includes(w))) score = Math.max(score, 90);
    const street = normalize(school.street), number = normalize(school.number);
    if (street.length > 4 && number && normalize(p.address).includes(street) && normalize(p.address).split(' ').includes(number) && kind(p.name) === kind(school.name)) score = Math.max(score, 95);
    if (kind(school.name) !== kind(p.name)) score = 0;
    return { place: p, score };
  }).filter((c) => c.score >= 90).sort((a, b) => b.score - a.score);
  if (matches.length && (matches.length === 1 || matches[0].score > matches[1].score || matches.every((m) => distance(m.place, matches[0].place) < .12))) {
    const place = matches[0].place;
    school.mapped_place_id = place.id; school.lat = place.lat; school.lng = place.lng;
    school.location_source = place.source;
    place.siiir_id = school.id; place.school_year = school.school_year; place.official_name = school.name; place.official_source = source;
    place.phone ||= school.phone;
    place.tags = [...new Set([...(place.tags || []), school.name, school.short_name, school.locality])];
    claimed.add(place.id);
  }
}
// Official address + independent mapped campus for the reported missing school.
const balcescu = catalog.find((s) => s.id === '0262100468');
if (balcescu && !balcescu.mapped_place_id) {
  const id = 'siiir/0262100468';
  const point = { lat: 46.2024, lng: 21.29788 };
  const place = { id, name: 'Școala Gimnazială „Nicolae Bălcescu” (fosta Generală 11)', ...point, category: 'education', locality: 'Arad', address: 'Strada Poetului 89A, Arad', description: '', phone: balcescu.phone, website: 'http://nicolaebalcescu-arad.ro/', hours: '', image: '', wikipedia: '', source: 'https://www.openstreetmap.org/node/6579694795', official_source: source, siiir_id: balcescu.id, school_year: balcescu.school_year, tags: ['școală', 'gimnaziala 11', 'generala 11', 'Nicolae Balcescu', 'Arad'] };
  places.push(place); Object.assign(balcescu, point, { mapped_place_id: id, location_source: place.source });
}
if (balcescu?.mapped_place_id) {
  const place = places.find((p) => p.id === balcescu.mapped_place_id);
  place.tags = [...new Set([...place.tags, 'gimnaziala 11', 'generala 11', 'scoala 11'])];
}
const mapped = catalog.filter((s) => s.mapped_place_id).length;
await writeFile(new URL('places.json', root), JSON.stringify(places, null, 2) + '\n');
await writeFile(new URL('schools/catalog.json', root), JSON.stringify({ source, school_year: '2025-2026', retrieved_at: new Date().toISOString(), total: catalog.length, mapped, schools: catalog }, null, 2) + '\n');
const metadata = await read('README.json');
metadata.count = places.length;
metadata.educationCount = places.filter((p) => p.category === 'education').length;
metadata.schoolRegistry = { source, schoolYear: '2025-2026', total: catalog.length, mapped, unresolved: catalog.length - mapped, coordinateSource: 'OpenStreetMap / Geofabrik; county boundary geoBoundaries gbOpen ROU ADM1' };
await writeFile(new URL('README.json', root), JSON.stringify(metadata, null, 2) + '\n');
console.log(JSON.stringify({ officialRecords: catalog.length, matched: mapped, unresolved: catalog.length - mapped, addedMapPlaces: added, educationMapPlaces: metadata.educationCount }));
