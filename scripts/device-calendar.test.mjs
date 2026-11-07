import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { calendarFile, validateEntry } from '../src/features/city/calendar-export.ts';

const entry = { title: 'Concert Arad', description: 'Program confirmat', location: 'Palatul Cultural', startsAt: '2026-11-14T19:00:00+02:00', endsAt: '2026-11-14T21:00:00+02:00' };
const source = ts.transpileModule(readFileSync(new URL('../src/features/city/device-calendar.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
function nativeModule(platform, overrides = {}) {
  const calls = { files: [], shares: [], forms: [] };
  const calendar = { addEventWithForm: async (options) => { calls.forms.push(options); return { action: 'saved' }; } };
  const modules = {
    'react-native': { Platform: { OS: platform } },
    './calendar-export': { calendarFile, validateEntry },
    'expo-calendar': { requestCalendarPermissions: async () => ({ status: 'granted' }), getDefaultCalendarSync: () => calendar, getCalendars: async () => [{ ...calendar, allowsModifications: true, isPrimary: true }], EntityTypes: { EVENT: 'event' } },
    'expo-file-system': { Paths: { cache: 'file:///cache/' }, File: class {
      constructor(path, name) { this.uri = path + name; }
      create() { calls.files.push(this); }
      async write(content) { this.content = content; }
    } },
    'expo-sharing': { isAvailableAsync: async () => true, shareAsync: async (uri, options) => calls.shares.push({ uri, options }) },
    ...overrides,
  };
  const exports = {};
  vm.runInNewContext(source, { exports, require: (name) => { if (!modules[name]) throw new Error(`Unexpected native module: ${name}`); return modules[name]; }, Date, Promise });
  return { api: exports, calls };
}
test('Android ICS export writes a calendar file before opening the native share sheet', async () => {
  const { api, calls } = nativeModule('android');
  await api.shareCalendarFile(entry);
  assert.equal(calls.files.length, 1);
  assert.ok(calls.files[0].content.includes('DTSTART:20261114T170000Z'));
  assert.equal(calls.shares[0].uri, calls.files[0].uri);
  assert.equal(calls.shares[0].options.mimeType, 'text/calendar');
});
test('calendar permission denial is recoverable and does not create an event', async () => {
  const { api, calls } = nativeModule('android', { 'expo-calendar': { requestCalendarPermissions: async () => ({ status: 'denied' }) } });
  await assert.rejects(api.addToDeviceCalendar(entry), /Accesul la calendar/);
  assert.equal(calls.forms.length, 0);
});
test('iOS native calendar form receives the exact event time and location', async () => {
  const { api, calls } = nativeModule('ios');
  assert.equal(await api.addToDeviceCalendar(entry), 'saved');
  assert.equal(calls.forms[0].startDate.toISOString(), '2026-11-14T17:00:00.000Z');
  assert.equal(calls.forms[0].location, entry.location);
});
test('unavailable sharing returns an error instead of claiming an export', async () => {
  const { api, calls } = nativeModule('android', { 'expo-sharing': { isAvailableAsync: async () => false } });
  await assert.rejects(api.shareCalendarFile(entry), /nu este disponibilă/);
  assert.equal(calls.files.length, 0);
});
