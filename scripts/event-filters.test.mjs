import test from 'node:test';
import assert from 'node:assert/strict';
import { compareEvents, inEventRange, eventDay, eventCategory } from '../src/features/city/event-filters.ts';
test('running events precede nearest upcoming events, then unconfirmed announcements', () => {
  const now = Date.parse('2026-11-07T12:00:00Z');
  const running = { starts_at: '2026-11-07T10:00:00Z', ends_at: '2026-11-07T14:00:00Z' };
  const soon = { starts_at: '2026-11-08T10:00:00Z' }, later = { starts_at: '2026-12-08T10:00:00Z' };
  const unknown = { published_at: '2026-11-07T12:00:00Z' };
  assert.deepEqual([unknown, later, soon, running].sort((a, b) => compareEvents(a, b, now)), [running, soon, later, unknown]);
});
test('calendar range uses Romanian days, includes overlapping events and excludes undated news', () => {
  assert.equal(eventDay('2026-11-07T23:00:00Z'), '2026-11-08');
  assert.ok(inEventRange({ starts_at: '2026-11-06T10:00:00+02:00', ends_at: '2026-11-09T10:00:00+02:00' }, '2026-11-07', '2026-11-07'));
  assert.equal(inEventRange({ starts_at: '2026-11-07T20:00:00+02:00', ends_at: '2026-11-08T00:00:00+02:00' }, '2026-11-08', '2026-11-08'), false);
  assert.equal(inEventRange({ published_at: '2026-11-07T12:00:00Z' }, '2026-11-07', ''), false);
  assert.ok(inEventRange({}, '', ''));
});
test('every category maps to a selectable group', () => {
  assert.equal(eventCategory('community', 'Cinema Arta: film documentar'), 'film');
  assert.equal(eventCategory('other', 'Drumeție în natură'), 'outdoors');
  assert.equal(eventCategory('unknown-value', 'Lansare locală'), 'other');
  assert.equal(eventCategory('coffee', 'Degustare'), 'coffee');
});
