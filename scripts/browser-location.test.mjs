import { test } from 'node:test';
import assert from 'node:assert/strict';
import { browserLocation } from '../src/features/city/browser-location.ts';
import { withLocationDeadline } from '../src/features/city/location-deadline.ts';

test('web location requests position directly without a Permissions API', async () => {
  let receivedOptions;
  const result = await browserLocation({ secure: true, geolocation: {
    getCurrentPosition(success, failure, options) {
      receivedOptions = options;
      success({ coords: { latitude: 46.1753, longitude: 21.3192 } });
    },
  } });
  assert.deepEqual(result, { lat: 46.1753, lng: 21.3192 });
  assert.equal(receivedOptions.timeout, 15000);
  assert.equal(receivedOptions.maximumAge, 30000);
});

test('web location distinguishes insecure origin, unsupported API, denial, timeout and unavailable position', async () => {
  assert.equal((await browserLocation({ secure: false })).error, 'insecure');
  assert.equal((await browserLocation({ secure: true })).error, 'unsupported');
  for (const [code, expected] of [[1, 'permission'], [2, 'unavailable'], [3, 'timeout']]) {
    const result = await browserLocation({ secure: true, geolocation: { getCurrentPosition(success, failure) { failure({ code }); } } });
    assert.equal(result.error, expected);
  }
});

test('native location deadlines release the UI and preserve successful results', async () => {
  assert.deepEqual(await withLocationDeadline(Promise.resolve({ lat: 46.17, lng: 21.31 }), 100), { lat: 46.17, lng: 21.31 });
  await assert.rejects(withLocationDeadline(new Promise(() => {}), 5), error => error.code === 'E_LOCATION_TIMEOUT');
});
