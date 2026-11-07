import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBootstrap, safeBootstrap } from '../src/features/city/bootstrap-data.ts';
test('map bootstrap rejects directory and error responses before storing them', () => {
  for (const value of [null, undefined, { schools: [] }, { error: 'offline' }, { places: {}, events: [] }, { places: [], events: null }]) {
    assert.throws(() => parseBootstrap(value));
    assert.deepEqual(safeBootstrap(value).places, []);
    assert.deepEqual(safeBootstrap(value).events, []);
  }
});
test('valid map payload preserves places, events and posting policy', () => {
  const value = { places: [{ id: 'school' }], events: [], canPost: true, postingPolicy: 'google' };
  assert.deepEqual(parseBootstrap(value), value);
});
