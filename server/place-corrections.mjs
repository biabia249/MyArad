// Reviewed against CNIPT's per-record addresses. Keep municipality separately
// from the village so searching for either still finds the attraction.
const localities = new Map([
  ['cnipt/13', ['Mocrea', 'Ineu', 'sat Mocrea, nr. 1A, oraș Ineu']],
  ['cnipt/32', ['Bodrogul Nou', 'Zădăreni', 'Bodrogul Nou, comuna Zădăreni']],
  ['cnipt/33', ['Munar', 'Secusigiu', 'sat Munar, comuna Secusigiu']],
  ['cnipt/309', ['Groșii Noi', 'Bârzava', 'sat Groșii Noi, comuna Bârzava']],
  ['cnipt/414', ['Iercoșeni', 'Șilindia', 'sat Iercoșeni, comuna Șilindia']],
  ['cnipt/415', ['Iercoșeni', 'Șilindia', 'sat Iercoșeni, comuna Șilindia']],
]);
const normalize = (value) => String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function correctPlaces(input) {
  const report = { localities: [], names: [], duplicates: [] };
  const records = input.map((source) => {
    const place = { ...source };
    const correction = [place.id, ...(place.alias_ids || [])].map(id => localities.get(id)).find(Boolean);
    if (correction) {
      const [locality, municipality, address] = correction;
      if (place.locality !== locality) report.localities.push({ id: place.id, from: place.locality, to: locality, municipality, source: place.cnipt_source || place.source });
      const oldLocality = place.locality;
      place.locality = locality;
      place.municipality = municipality;
      place.address = address;
      place.tags = [...new Set([...(place.tags || []), locality, municipality])];
      // Correct generated location sentences, leaving publisher prose intact.
      for (const key of ['description', 'description_en', 'description_ro']) {
        if (typeof place[key] !== 'string') continue;
        if (oldLocality && oldLocality !== locality) {
          place[key] = place[key].replace(`situat în ${oldLocality}, județul Arad`, `situat în ${locality}, județul Arad`).replace(` in ${oldLocality}, Arad County`, ` in ${locality}, Arad County`);
        }
      }
    }
    const names = new Map([
      ['node/262884691', 'Generală 8'],
      ['way/1455510127', 'Școala Generală „Aron Cotruș”'],
      ['cnipt/399', 'Casa memorială „Ioan T. Florea”'],
      ['cnipt/400', 'Muzeul etnografic „Zestrea Satului”'],
    ]);
    const name = [place.id, ...(place.alias_ids || [])].map(id => names.get(id)).find(Boolean);
    if (name && place.name !== name) {
      report.names.push({ id: place.id, from: place.name, to: name });
      const oldName = place.name;
      place.name = name;
      for (const key of ['name_en', 'description', 'description_ro', 'description_en']) {
        if (typeof place[key] === 'string') place[key] = place[key].replaceAll(oldName, name);
      }
    }
    return place;
  });
  const seen = new Map(), places = [];
  for (const place of records) {
    // Deduplicate only CNIPT records sharing name, village and exact coordinates.
    // Similar names or nearby buildings alone are not evidence of duplication.
    const key = (place.id.startsWith('cnipt/') || place.id.startsWith('visitarad/') || place.cnipt_source) ? `${normalize(place.name)}:${normalize(place.locality)}:${place.lat}:${place.lng}` : place.id;
    const existing = seen.get(key);
    if (!existing) { seen.set(key, place); places.push(place); continue; }
    existing.alias_ids = [...new Set([...(existing.alias_ids || []), place.id, ...(place.alias_ids || [])])];
    existing.alternate_sources = [...new Set([...(existing.alternate_sources || []), place.source, ...(place.alternate_sources || [])].filter(Boolean))];
    existing.tags = [...new Set([...(existing.tags || []), ...(place.tags || [])])];
    existing.cnipt_photos = [...new Set([...(existing.cnipt_photos || []), ...(place.cnipt_photos || [])])];
    report.duplicates.push({ kept: existing.id, alias: place.id, name: place.name });
  }
  return { places, report };
}
