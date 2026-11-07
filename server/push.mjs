export function createPush(db, send = fetch) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS city_push_tokens(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE)",
  );
  return async (userId, kind) => {
    const tokens = db
      .prepare("SELECT token FROM city_push_tokens WHERE user_id=? LIMIT 10")
      .all(userId);
    if (!tokens.length) return;
    const body =
      kind === "request"
        ? "Ai o cerere nouă de prietenie."
        : kind === "accepted"
          ? "Cererea ta de prietenie a fost acceptată."
          : "Ai un mesaj nou în MyArad.";
    const response = await send("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.EXPO_ACCESS_TOKEN
          ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(
        tokens.map((t) => ({
          to: t.token,
          title: "MyArad",
          body,
          sound: "default",
          channelId: "social",
          data: { path: "/people" },
        })),
      ),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw Error("Push gateway returned " + response.status);
    const result = await response.json();
    const tickets = Array.isArray(result.data) ? result.data : [result.data];
    tickets.forEach((ticket, i) => {
      if (ticket?.details?.error === "DeviceNotRegistered" && tokens[i])
        db.prepare("DELETE FROM city_push_tokens WHERE token=?").run(
          tokens[i].token,
        );
    });
    if (tickets.some((t) => t?.status === "error") || result.errors?.length)
      throw Error(
        "Push gateway rejected a notification; check project credentials.",
      );
  };
}
