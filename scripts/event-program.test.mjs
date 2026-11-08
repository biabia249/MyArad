import test from 'node:test';
import assert from 'node:assert/strict';
import { eventProgramLabel } from '../src/features/city/event-program.ts';

test('RSS publication date never becomes the displayed event program', () => {
  assert.equal(eventProgramLabel({ published_at: '2026-01-01T17:12:43Z' }), '');
  assert.equal(eventProgramLabel({ published_at: '2026-01-01T17:12:43Z', description: 'Luni, 9 noiembrie, 19:00 Sala Palatului Cultural' }), '9 noiembrie, 19:00');
});
test('organiser ranges and times remain intact, including cross-year exhibitions', () => {
  assert.equal(eventProgramLabel({ description: '17 octombrie – 14 noiembrie After 5 Art Boutique' }), '17 octombrie – 14 noiembrie');
  assert.equal(eventProgramLabel({ description: '6 noiembrie 2026 – 6 ianuarie 2027 Galeria Delta' }), '6 noiembrie 2026 – 6 ianuarie 2027');
  assert.equal(eventProgramLabel({ description: '18 decembrie, 22:00 Infinite Escape' }), '18 decembrie, 22:00');
});
test('explicit event metadata takes precedence and partial years are not January 1', () => {
  assert.match(eventProgramLabel({ starts_at: '2026-11-12T19:00:00+02:00', published_at: '2026-01-01T00:00:00Z' }), /12 nov/);
  assert.equal(eventProgramLabel({ starts_at: '2026', published_at: '2026-01-01T00:00:00Z' }), '');
});
