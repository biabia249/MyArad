import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "./app.mjs";
import { createStore } from "./store.mjs";

async function fixture(t, config = {}) {
  const store = createStore(":memory:");
  const app = createApp(
    {
      database: ":memory:",
      publicUrl: "http://localhost:3001",
      webOrigin: "http://localhost:8082",
      eventPosting: "signed-in",
      ...config,
    },
    { store },
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
  const call = async (path, data, token) => {
    const r = await fetch(`http://127.0.0.1:${app.address().port}${path}`, {
      method: data ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return { status: r.status, data: await r.json() };
  };
  const account = await store.signUp({
    fullName: "City Tester",
    username: "city_tester",
    email: "city@example.com",
    password: "Testing-123!",
  });
  return { call, token: account.token, store };
}
const event = () => ({
  title: "Integration test event",
  description: "A test in an isolated database.",
  category: "music",
  venue: "Arad city centre",
  lat: 46.1753,
  lng: 21.3192,
  starts_at: new Date(Date.now() + 3600000).toISOString(),
  ends_at: new Date(Date.now() + 7200000).toISOString(),
});
test("guests browse places; authenticated users create, attend, comment and suggest corrections", async (t) => {
  const { call, token } = await fixture(t);
  const initial = await call("/city/bootstrap");
  assert.equal(initial.status, 200);
  assert.ok(initial.data.places.length > 100);
  assert.equal(initial.data.canPost, false);
  assert.deepEqual(initial.data.events, []);
  assert.equal((await call("/city/events", event())).status, 401);
  const created = await call("/city/events", event(), token);
  assert.equal(created.status, 200);
  const id = created.data.event.id;
  assert.equal(
    (await call("/city/bootstrap", undefined, token)).data.canPost,
    true,
  );
  assert.equal(
    (await call(`/city/events/${id}/attend`, { going: true })).status,
    401,
  );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await call(`/city/events/${id}/attend`, { going: true }, token)).status,
      200,
    );
  assert.equal(
    (await call(`/city/events/${id}`, undefined, token)).data.attending,
    1,
  );
  await call(
    `/city/events/${id}/comments`,
    { body: "Is this accessible?" },
    token,
  );
  const details = (await call(`/city/events/${id}`, undefined, token)).data;
  assert.equal(details.going, true);
  assert.equal(details.comments[0].body, "Is this accessible?");
  await call(`/city/events/${id}/attend`, { going: false }, token);
  assert.equal((await call(`/city/events/${id}`)).data.attending, 0);
  assert.equal(
    (
      await call(
        "/city/corrections",
        {
          place_id: initial.data.places[0].id,
          body: "Please check the opening hours.",
        },
        token,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await call(
        "/city/corrections",
        { place_id: "missing", body: "Check" },
        token,
      )
    ).status,
    404,
  );
});
test("event validation rejects out-of-city coordinates, invalid times, oversized and empty content", async (t) => {
  const { call, token } = await fixture(t);
  for (const patch of [
    { lat: 0, lng: 0 },
    { lat: "46.17" },
    { starts_at: "bad" },
    { ends_at: new Date(Date.now() - 10000).toISOString() },
    { title: "" },
    { title: "x".repeat(121) },
  ])
    assert.equal(
      (await call("/city/events", { ...event(), ...patch }, token)).status,
      400,
    );
  const created = await call("/city/events", event(), token),
    id = created.data.event.id;
  assert.equal(
    (await call(`/city/events/${id}/comments`, { body: "" }, token)).status,
    400,
  );
  assert.equal(
    (await call(`/city/events/${id}/attend`, { going: "yes" }, token)).status,
    400,
  );
  assert.equal((await call("/city/events/not-an-event")).status, 404);
});
test("verified-only policy stays enforced when prototype posting is disabled", async (t) => {
  const { call, token } = await fixture(t, { eventPosting: "google" });
  assert.equal((await call("/city/events", event(), token)).status, 403);
});

test("personal plans are private by default, public only by opt-in, and owner-controlled", async (t) => {
  const { call, token, store } = await fixture(t);
  const p = (await call("/city/bootstrap")).data.places[0];
  assert.equal((await call("/city/schedule")).status, 401);
  const plan = {
    place_id: p.id,
    starts_at: new Date(Date.now() + 3600000).toISOString(),
    ends_at: new Date(Date.now() + 7200000).toISOString(),
  };
  assert.equal((await call("/city/schedule", plan, token)).status, 200);
  const mine = (await call("/city/schedule", undefined, token)).data;
  assert.equal(mine.public, false);
  assert.equal(mine.plans.length, 1);
  assert.equal((await call("/city/citizens/city_tester")).status, 404);
  await call("/city/schedule/visibility", { public: true }, token);
  const shared = await call("/city/citizens/city_tester");
  assert.equal(shared.status, 200);
  assert.equal(shared.data.plans.length, 1);
  assert.equal(shared.data.plans[0].user_id, undefined);
  const other = await store.signUp({
    fullName: "Other",
    username: "other",
    email: "other@example.com",
    password: "Testing-123!",
  });
  assert.equal(
    (await call("/city/schedule/remove/" + mine.plans[0].id, {}, other.token))
      .status,
    404,
  );
  await call("/city/schedule/visibility", { public: false }, token);
  assert.equal((await call("/city/citizens/city_tester")).status, 404);
  assert.equal(
    (await call("/city/schedule/remove/" + mine.plans[0].id, {}, token)).status,
    200,
  );
  assert.equal(
    (await call("/city/schedule", undefined, token)).data.plans.length,
    0,
  );
});

test("profile edits persist and stay private until the schedule is published", async (t) => {
  const { call, token } = await fixture(t);
  const details = {
    fullName: "Updated Name",
    bio: "Coffee and cycling.",
    location: "Arad",
    interests: "coffee, cycling",
    photo: "",
  };
  assert.equal((await call("/city/profile", details)).status, 401);
  assert.equal(
    (
      await call(
        "/city/profile",
        { ...details, photo: "data:image/svg+xml;base64,AAAA" },
        token,
      )
    ).status,
    400,
  );
  assert.equal((await call("/city/profile", details, token)).status, 200);
  const mine = (await call("/city/schedule", undefined, token)).data;
  assert.equal(mine.fullName, details.fullName);
  assert.equal(mine.profile.bio, details.bio);
  assert.equal((await call("/city/citizens/city_tester")).status, 404);
  await call("/city/schedule/visibility", { public: true }, token);
  const publicProfile = (await call("/city/citizens/city_tester")).data;
  assert.equal(publicProfile.profile.interests, details.interests);
  assert.equal(publicProfile.email, undefined);
});

test("social requests require acceptance; messages stay between friends; participants expose no email", async (t) => {
  const { call, token, store } = await fixture(t);
  const second = await store.signUp({
    fullName: "Second Person",
    username: "second_person",
    email: "second@example.com",
    password: "Testing-123!",
  });
  const third = await store.signUp({
    fullName: "Third Person",
    username: "third_person",
    email: "third@example.com",
    password: "Testing-123!",
  });
  assert.equal((await call("/city/social/users?q=second")).status, 401);
  const found = await call("/city/social/users?q=second", null, token);
  assert.equal(found.data.users[0].username, "second_person");
  assert.equal("email" in found.data.users[0], false);
  assert.equal(
    (
      await call(
        "/city/social/messages/second_person",
        { body: "hello" },
        token,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        "/city/social/friend/second_person",
        { action: "request" },
        token,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await call(
        "/city/social/friend/second_person",
        { action: "accept" },
        token,
      )
    ).status,
    403,
  );
  assert.equal(
    (await call("/city/social/friends", null, second.token)).data.users[0]
      .incoming,
    true,
  );
  assert.equal(
    (
      await call(
        "/city/social/friend/city_tester",
        { action: "accept" },
        second.token,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await call(
        "/city/social/messages/second_person",
        { body: "Hello Arad!" },
        token,
      )
    ).status,
    200,
  );
  assert.equal(
    (await call("/city/social/messages/city_tester", null, second.token)).data
      .messages[0].body,
    "Hello Arad!",
  );
  assert.equal(
    (await call("/city/social/messages/city_tester", null, third.token)).status,
    403,
  );
  const inbox = await call("/city/social/notifications", null, second.token);
  assert.equal(
    inbox.data.items.find((n) => n.kind === "message").preview,
    "Hello Arad!",
  );
  assert.equal(
    (await call("/city/social/notifications", null, third.token)).data.items
      .length,
    0,
  );
  const created = await call("/city/events", event(), token);
  await call(
    `/city/events/${created.data.event.id}/attend`,
    { going: true },
    second.token,
  );
  const details = await call(`/city/events/${created.data.event.id}`);
  assert.equal(details.data.participants[0].username, "second_person");
  assert.equal("email" in details.data.participants[0], false);
  await call("/city/social/friend/second_person", { action: "remove" }, token);
  assert.equal(
    (await call("/city/social/messages/city_tester", null, second.token))
      .status,
    403,
  );
});

test("notifications belong to their recipient and read markers cannot change another inbox", async (t) => {
  const { call, token, store } = await fixture(t);
  const other = await store.signUp({
    fullName: "Inbox Friend",
    username: "inbox_friend",
    email: "inbox@example.com",
    password: "Testing-123!",
  });
  await call("/city/social/friend/inbox_friend", { action: "request" }, token);
  const inbox = await call("/city/social/notifications", null, other.token);
  assert.equal(inbox.data.unread, 1);
  assert.equal(inbox.data.items[0].kind, "request");
  assert.equal(
    (await call("/city/social/notifications", null, token)).data.unread,
    0,
  );
  await call(
    "/city/social/notifications",
    { ids: [inbox.data.items[0].id] },
    token,
  );
  assert.equal(
    (await call("/city/social/notifications", null, other.token)).data.unread,
    1,
  );
  await call(
    "/city/social/notifications",
    { ids: [inbox.data.items[0].id] },
    other.token,
  );
  assert.equal(
    (await call("/city/social/notifications", null, other.token)).data.unread,
    0,
  );
  assert.equal(
    (await call("/city/social/push", { token: "bad" }, token)).status,
    400,
  );
  const fake = "ExpoPushToken[local_test_token_123]";
  assert.equal(
    (await call("/city/social/push", { token: fake }, token)).status,
    200,
  );
  assert.equal(
    store.db.prepare("SELECT COUNT(*) AS n FROM city_push_tokens").get().n,
    1,
  );
  await call("/city/social/push", { token: fake, enabled: false }, other.token);
  assert.equal(
    store.db.prepare("SELECT COUNT(*) AS n FROM city_push_tokens").get().n,
    1,
  );
  await call("/city/social/push", { token: fake, enabled: false }, token);
  assert.equal(
    store.db.prepare("SELECT COUNT(*) AS n FROM city_push_tokens").get().n,
    0,
  );
});

test("reading displayed messages clears only that recipient and conversation message notifications", async (t) => {
  const { call, token, store } = await fixture(t);
  const b = await store.signUp({
    fullName: "Read Friend",
    username: "read_friend",
    email: "read@example.com",
    password: "Testing-123!",
  });
  const c = await store.signUp({
    fullName: "Other Friend",
    username: "other_friend",
    email: "other@example.com",
    password: "Testing-123!",
  });
  for (const account of [b, c]) {
    const username = account === b ? "read_friend" : "other_friend";
    await call("/city/social/friend/" + username, { action: "request" }, token);
    await call(
      "/city/social/friend/city_tester",
      { action: "accept" },
      account.token,
    );
    await call(
      "/city/social/messages/city_tester",
      { body: "Unread hello" },
      account.token,
    );
  }
  const before = (await call("/city/social/notifications", null, token)).data;
  const messages = (
    await call("/city/social/messages/read_friend", null, token)
  ).data.messages;
  assert.equal(
    (await call("/city/social/notifications", null, token)).data.unread,
    before.unread,
    "Fetching alone does not read messages",
  );
  await call(
    "/city/social/read/read_friend",
    { ids: messages.map((m) => m.id) },
    c.token,
  );
  assert.equal(
    (await call("/city/social/notifications", null, token)).data.unread,
    before.unread,
  );
  await call(
    "/city/social/read/other_friend",
    { ids: messages.map((m) => m.id) },
    token,
  );
  assert.equal(
    (await call("/city/social/notifications", null, token)).data.unread,
    before.unread,
    "Wrong conversation cannot mark a message",
  );
  await call(
    "/city/social/read/read_friend",
    { ids: messages.map((m) => m.id) },
    token,
  );
  const after = (await call("/city/social/notifications", null, token)).data;
  assert.equal(after.unread, before.unread - 1);
  assert.equal(
    after.items.find(
      (n) => n.kind === "message" && n.username === "read_friend",
    ).seen,
    1,
  );
  assert.equal(
    after.items.find(
      (n) => n.kind === "message" && n.username === "other_friend",
    ).seen,
    0,
  );
  assert.equal(
    after.items.filter((n) => n.kind === "accepted" && !n.seen).length,
    2,
  );
  await call(
    "/city/social/read/read_friend",
    { ids: messages.map((m) => m.id) },
    token,
  );
  assert.equal(
    (await call("/city/social/notifications", null, token)).data.unread,
    after.unread,
  );
});
