import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { correctPlaces } from './place-corrections.mjs';

test('exact CNIPT duplicates retain old identifiers and all source links', () => {
  const base = { name: 'Muzeul din Dud', locality: 'Dud', lat: 46.2, lng: 21.8, tags: [] };
  const { places } = correctPlaces([{ ...base, id: 'cnipt/a', source: 'https://example.org/a' }, { ...base, id: 'cnipt/b', source: 'https://example.org/b' }]);
  assert.equal(places.length, 1);
  assert.deepEqual(places[0].alias_ids, ['cnipt/b']);
  assert.deepEqual(places[0].alternate_sources, ['https://example.org/b']);
});
test('same names in separate locations or different data sources stay separate', () => {
  const base = { name: 'Muzeu', locality: 'Ineu', lat: 46.2, lng: 21.8 };
  assert.equal(correctPlaces([{ ...base, id: 'cnipt/a' }, { ...base, id: 'cnipt/b', lng: 21.81 }, { ...base, id: 'cnipt/c', locality: 'Ghioroc' }, { ...base, id: 'node/1' }]).places.length, 4);
});
test('reviewed localities distinguish villages from administrative municipalities', () => {
  const { places } = correctPlaces([{ id: 'cnipt/33', name: 'Mănăstirea Bezdin', locality: 'Secusigiu', address: 'Secusigiu', description_ro: 'Obiectiv situat în Secusigiu, județul Arad.' }]);
  assert.equal(places[0].locality, 'Munar');
  assert.equal(places[0].municipality, 'Secusigiu');
  assert.ok(places[0].tags.includes('Secusigiu'));
  assert.ok(places[0].description_ro.includes('situat în Munar'));
});
test('corrected dataset has unique IDs, valid coordinates and is stable on reimport', () => {
  const places = JSON.parse(readFileSync(new URL('./data-sources/places.json', import.meta.url), 'utf8'));
  assert.equal(new Set(places.map((p) => p.id)).size, places.length);
  for (const place of places) {
    assert.ok(Number.isFinite(place.lat) && place.lat >= -90 && place.lat <= 90);
    assert.ok(Number.isFinite(place.lng) && place.lng >= -180 && place.lng <= 180);
  }
  assert.deepEqual(correctPlaces(places).places, places);
  assert.equal(places.find((p) => p.id === 'node/262884691').name, 'Generală 8');
});
