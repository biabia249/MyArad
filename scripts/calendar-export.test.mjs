import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarUrl, calendarFile, validateEntry } from '../src/features/city/calendar-export.ts';

const entry = { title: 'Concert, Arad; seară', description: 'Prima linie\nA doua linie', location: 'Arad', startsAt: '2026-11-14T19:00:00+02:00', endsAt: '2026-11-14T21:00:00+02:00' };
test('Google and Outlook preserve the event instant across timezones', () => {
  const google = new URL(calendarUrl('google', entry));
  assert.equal(google.searchParams.get('dates'), '20261114T170000Z/20261114T190000Z');
  assert.equal(google.searchParams.get('text'), entry.title);
  const outlook = new URL(calendarUrl('outlook', entry));
  assert.equal(outlook.searchParams.get('startdt'), '2026-11-14T17:00:00.000Z');
  assert.equal(outlook.searchParams.get('enddt'), '2026-11-14T19:00:00.000Z');
});
test('ICS escapes content, folds Unicode safely and uses UTC', () => {
  const file = calendarFile({ ...entry, title: entry.title.repeat(12) });
  assert.ok(file.includes('DTSTART:20261114T170000Z\r\n'));
  assert.ok(file.includes('DESCRIPTION:Prima linie\\nA doua linie'));
  assert.ok(file.includes('Concert\\, Arad\\;'));
  for (const line of file.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
});
test('invalid or reversed dates are rejected before opening a calendar', () => {
  assert.throws(() => validateEntry({ ...entry, startsAt: 'invalid' }));
  assert.throws(() => validateEntry({ ...entry, endsAt: entry.startsAt }));
});
