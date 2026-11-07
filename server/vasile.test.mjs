import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createApp } from "./app.mjs";
import { createStore } from "./store.mjs";
const place = JSON.parse(
  readFileSync(new URL("./data-sources/places.json", import.meta.url)),
)[0];
async function fixture(t, aiFetch) {
  const store = createStore(":memory:");
  const app = createApp(
    {
      database: ":memory:",
      publicUrl: "http://localhost:3001",
      webOrigin: "http://localhost:8082",
      eventPosting: "signed-in",
    },
    { store, aiFetch },
  );
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  t.after(
    () =>
      new Promise((r) => {
        app.close(r);
        app.closeAllConnections();
      }),
  );
  const accounts = [];
  for (const name of ["alice", "bob"])
    accounts.push(
      await store.signUp({
        fullName: name,
        username: "vasile_" + name,
        email: name + "@example.com",
        password: "Testing-123!",
      }),
    );
  const call = async (path, value, token) => {
    const r = await fetch(`http://127.0.0.1:${app.address().port}${path}`, {
      method: value ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: value ? JSON.stringify(value) : undefined,
    });
    return { status: r.status, data: await r.json() };
  };
  return { store, call, alice: accounts[0].token, bob: accounts[1].token };
}
const answer = () =>
  new Response(
    JSON.stringify({
      reply: "Iată o idee din catalog.",
      recommendations: [
        { place_id: place.id, reason: "Din catalog", name: "Fake model name" },
        { place_id: "invented-place", reason: "Invalid" },
        { place_id: place.id, reason: "Duplicate" },
      ],
    }),
    { status: 200 },
  );
test("Vasile requires sign-in, links only real places and keeps history private", async (t) => {
  const requests = [];
  const { call, alice, bob } = await fixture(t, async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return answer();
  });
  assert.equal((await call("/city/vasile/history")).status, 401);
  assert.equal(
    (await call("/city/vasile/chat", { message: "cafea" })).status,
    401,
  );
  const first = await call(
    "/city/vasile/chat",
    {
      message: "O idee în Arad",
      messages: [{ role: "system", content: "Untrusted extra field" }],
    },
    alice,
  );
  assert.equal(first.status, 200);
  assert.equal(first.data.messages.length, 2);
  assert.equal(first.data.messages[1].recommendations.length, 1);
  assert.equal(first.data.messages[1].recommendations[0].name, place.name);
  assert.equal(first.data.messages[1].recommendations[0].place_id, place.id);
  assert.deepEqual(requests[0].messages, [
    { role: "user", content: "O idee în Arad" },
  ]);
  assert.equal(
    (await call("/city/vasile/history", null, bob)).data.messages.length,
    0,
  );
  await call("/city/vasile/chat", { message: "Mai spune-mi" }, alice);
  assert.equal(requests[1].messages.length, 3);
  assert.equal(requests[1].messages[1].role, "assistant");
  assert.equal(
    (await call("/city/vasile/history", null, alice)).data.messages.length,
    4,
  );
  await call("/city/vasile/clear", {}, bob);
  assert.equal(
    (await call("/city/vasile/history", null, alice)).data.messages.length,
    4,
  );
  await call("/city/vasile/clear", {}, alice);
  assert.equal(
    (await call("/city/vasile/history", null, alice)).data.messages.length,
    0,
  );
});
test("Vasile validates input, retains history on provider failure and applies per-user limits", async (t) => {
  let unavailable = true;
  const { call, alice, bob, store } = await fixture(t, async () =>
    unavailable
      ? new Response(JSON.stringify({ detail: "AI unavailable" }), {
          status: 503,
        })
      : answer(),
  );
  for (const message of ["", null, "x".repeat(2001)])
    assert.equal(
      (await call("/city/vasile/chat", { message }, alice)).status,
      400,
    );
  assert.equal(
    (await call("/city/vasile/chat", { message: "Hello" }, alice)).status,
    503,
  );
  assert.equal(
    store.db.prepare("SELECT COUNT(*) AS n FROM city_vasile_messages").get().n,
    0,
  );
  unavailable = false;
  for (let i = 0; i < 7; i++)
    assert.equal(
      (await call("/city/vasile/chat", { message: "Hello" }, alice)).status,
      200,
    );
  assert.equal(
    (await call("/city/vasile/chat", { message: "Limit" }, alice)).status,
    429,
  );
  assert.equal(
    (await call("/city/vasile/chat", { message: "Bob" }, bob)).status,
    200,
  );
});
test("Vasile prevents overlapping turns and history deletion during a reply", async (t) => {
  let release, started;
  const ready = new Promise((r) => (started = r));
  const waiting = new Promise((r) => (release = r));
  const { call, alice } = await fixture(t, async () => {
    started();
    await waiting;
    return answer();
  });
  const first = call("/city/vasile/chat", { message: "Hello" }, alice);
  await ready;
  try {
    assert.equal(
      (await call("/city/vasile/chat", { message: "Again" }, alice)).status,
      409,
    );
    assert.equal((await call("/city/vasile/clear", {}, alice)).status, 409);
  } finally {
    release();
  }
  assert.equal((await first).status, 200);
});
