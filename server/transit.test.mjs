import { test } from "node:test";
import assert from "node:assert/strict";
import { createTransit } from "./transit.mjs";
const url = (p) => new URL("http://localhost/city/transit/" + p);
test("transit planner validates coordinates, passes explicit current time and orders future arrivals", async () => {
  let sent;
  const now = Math.floor(Date.now() / 1000);
  const request = createTransit(async (u, options) => {
    sent = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        plan: {
          itineraries: [
            { duration: 800, endTime: now + 1500, legs: [] },
            { duration: 400, endTime: now - 10, legs: [] },
            { duration: 1000, endTime: now + 1100, legs: [] },
          ],
        },
      }),
    };
  });
  const result = await request({ method: "POST" }, url("plan"), async () => ({
    from: { lat: 46.19, lng: 21.31 },
    to: { lat: 46.17, lng: 21.32 },
    mode: "transit",
  }));
  assert.equal(sent.mode, "TRANSIT,WALK");
  assert.ok(Math.abs(+new Date(sent.time) - Date.now()) < 5000);
  assert.equal(result.itineraries.length, 2);
  assert.ok(result.itineraries[0].endTime < result.itineraries[1].endTime);
  await assert.rejects(
    request({ method: "POST" }, url("plan"), async () => ({
      from: { lat: 0, lng: 0 },
      to: { lat: 46.17, lng: 21.32 },
      mode: "transit",
    })),
    (e) => e.status === 400,
  );
  await assert.rejects(
    request({ method: "POST" }, url("plan"), async () => ({
      from: { lat: 46.19, lng: 21.31 },
      to: { lat: 46.17, lng: 21.32 },
      mode: "unsupported",
    })),
    (e) => e.status === 400,
  );
});
test("network requests are cached and upstream failures return a useful service error", async () => {
  let calls = 0;
  const network = createTransit(async () => {
    calls++;
    return { ok: true, json: async () => [] };
  });
  await network({ method: "GET" }, url("network"));
  await network({ method: "GET" }, url("network"));
  assert.equal(calls, 2);
  const failed = createTransit(async () => {
    throw new Error("offline");
  });
  await assert.rejects(
    failed({ method: "GET" }, url("network")),
    (e) => e.status === 503,
  );
});
