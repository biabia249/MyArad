import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
test('county directory retains every official unit exactly once', () => {
  const raw = read('./data-sources/schools/network-2025-2026.json').records;
  const catalog = read('./data-sources/schools/catalog.json');
  assert.equal(catalog.total, raw.length);
  assert.deepEqual(new Set(catalog.schools.map((s) => s.id)), new Set(raw.map((r) => r.L)));
  assert.equal(catalog.schools.length, new Set(catalog.schools.map((s) => s.id)).size);
  assert.equal(catalog.mapped, catalog.schools.filter((s) => s.mapped_place_id).length);
});
test('mapped schools point to real features and unresolved schools have no invented coordinates', () => {
  const places = read('./data-sources/places.json');
  const catalog = read('./data-sources/schools/catalog.json');
  for (const school of catalog.schools) {
    if (!school.mapped_place_id) {
      assert.equal(school.lat, undefined); assert.equal(school.lng, undefined);
    } else {
      const place = places.find((p) => p.id === school.mapped_place_id);
      assert.ok(place, school.name); assert.equal(place.category, 'education');
      assert.equal(school.lat, place.lat); assert.equal(school.lng, place.lng);
      assert.ok(school.location_source.startsWith('https://'));
    }
  }
});
test('Nicolae Bălcescu / Generală 11 is discoverable at the Poetului campus', () => {
  const catalog = read('./data-sources/schools/catalog.json');
  const school = catalog.schools.find((s) => s.id === '0262100468');
  assert.ok(school.mapped_place_id);
  assert.match(school.address, /Poetului/i);
  const place = read('./data-sources/places.json').find((p) => p.id === school.mapped_place_id);
  assert.ok(place.tags.includes('generala 11'));
  assert.ok(Math.abs(place.lat - 46.2024) < .002 && Math.abs(place.lng - 21.29788) < .002);
});
