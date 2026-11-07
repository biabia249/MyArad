import { createPush } from "./push.mjs";
import { randomUUID } from "node:crypto";
import { HttpError } from "./store.mjs";
export function createSocial(db, author) {
  db.exec(`CREATE TABLE IF NOT EXISTS city_friends(sender TEXT REFERENCES users(id),recipient TEXT REFERENCES users(id),status TEXT NOT NULL CHECK(status IN ('pending','accepted')),PRIMARY KEY(sender,recipient));
    CREATE TABLE IF NOT EXISTS city_messages(id TEXT PRIMARY KEY,sender TEXT NOT NULL REFERENCES users(id),recipient TEXT NOT NULL REFERENCES users(id),body TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS city_notifications(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,created_at TEXT NOT NULL,seen INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS city_messages_pair ON city_messages(sender,recipient,created_at);`);
  if (
    !db
      .prepare("PRAGMA table_info(city_notifications)")
      .all()
      .some((column) => column.name === "message_id")
  ) {
    db.exec(
      "ALTER TABLE city_notifications ADD COLUMN message_id TEXT REFERENCES city_messages(id) ON DELETE SET NULL",
    );
  }
  const sendPush = createPush(db);
  const notify = (recipient, actor, kind, messageId = null) => {
    db.prepare(
      "INSERT INTO city_notifications(id,user_id,actor_id,kind,created_at,message_id) VALUES (?,?,?,?,?,?)",
    ).run(
      randomUUID(),
      recipient,
      actor,
      kind,
      new Date().toISOString(),
      messageId,
    );
    void sendPush(recipient, kind).catch(() =>
      console.warn(
        "Push delivery failed; in-app notification remains available.",
      ),
    );
  };
  const people = `SELECT u.username,u.full_name AS fullName,COALESCE(b.photo,'') AS photo,COALESCE(b.bio,'') AS bio FROM users u LEFT JOIN city_bios b ON b.user_id=u.id`;
  const target = (username) => {
    const u = db
      .prepare("SELECT id FROM users WHERE username=? COLLATE NOCASE")
      .get(username);
    if (!u) throw new HttpError(404, "User not found.");
    return u.id;
  };
  const relationship = (a, b) =>
    db
      .prepare(
        "SELECT * FROM city_friends WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)",
      )
      .get(a, b, b, a);
  return async (req, url, body) => {
    const user = author(req);
    if (url.pathname === "/city/social/push" && req.method === "POST") {
      const d = await body(req);
      if (
        typeof d.token !== "string" ||
        !/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$/.test(
          d.token,
        )
      )
        throw new HttpError(400, "Invalid push token.");
      if (d.enabled === false)
        db.prepare(
          "DELETE FROM city_push_tokens WHERE token=? AND user_id=?",
        ).run(d.token, user.id);
      else {
        const existing = db
          .prepare("SELECT user_id FROM city_push_tokens WHERE token=?")
          .get(d.token);
        if (
          !existing &&
          db
            .prepare(
              "SELECT COUNT(*) AS n FROM city_push_tokens WHERE user_id=?",
            )
            .get(user.id).n >= 10
        )
          throw new HttpError(400, "Too many registered devices.");
        db.prepare(
          "INSERT INTO city_push_tokens VALUES (?,?) ON CONFLICT(token) DO UPDATE SET user_id=excluded.user_id",
        ).run(d.token, user.id);
      }
      return { ok: true };
    }
    if (url.pathname === "/city/social/notifications") {
      if (req.method === "GET")
        return {
          unread: db
            .prepare(
              "SELECT COUNT(*) AS n FROM city_notifications WHERE user_id=? AND seen=0",
            )
            .get(user.id).n,
          items: db
            .prepare(
              "SELECT n.id,n.kind,n.created_at,n.seen,u.username,u.full_name AS fullName,CASE WHEN EXISTS(SELECT 1 FROM city_friends f WHERE f.status='accepted' AND ((f.sender=n.user_id AND f.recipient=n.actor_id) OR (f.sender=n.actor_id AND f.recipient=n.user_id))) THEN substr(m.body,1,180) ELSE NULL END AS preview FROM city_notifications n JOIN users u ON u.id=n.actor_id LEFT JOIN city_messages m ON m.id=n.message_id AND m.recipient=n.user_id AND m.sender=n.actor_id WHERE n.user_id=? ORDER BY n.created_at DESC,n.rowid DESC LIMIT 50",
            )
            .all(user.id),
        };
      if (req.method === "POST") {
        const d = await body(req);
        if (
          !Array.isArray(d.ids) ||
          d.ids.length > 50 ||
          d.ids.some((id) => typeof id !== "string")
        )
          throw new HttpError(400, "Invalid notifications.");
        for (const id of d.ids)
          db.prepare(
            "UPDATE city_notifications SET seen=1 WHERE id=? AND user_id=?",
          ).run(id, user.id);
        return { ok: true };
      }
    }
    if (url.pathname === "/city/social/users" && req.method === "GET") {
      const q = (url.searchParams.get("q") || "").slice(0, 80).toLowerCase();
      return {
        users: db
          .prepare(
            `${people} WHERE u.id<>? AND (instr(lower(u.username),?)>0 OR instr(lower(u.full_name),?)>0) ORDER BY u.username LIMIT 50`,
          )
          .all(user.id, q, q),
      };
    }
    if (url.pathname === "/city/social/friends" && req.method === "GET") {
      return {
        users: db
          .prepare(
            `${people} JOIN city_friends f ON ((f.sender=u.id AND f.recipient=?) OR (f.recipient=u.id AND f.sender=?)) ORDER BY u.username`,
          )
          .all(user.id, user.id)
          .map((u) => {
            const r = relationship(user.id, target(u.username));
            return {
              ...u,
              status: r.status,
              incoming: r.recipient === user.id,
            };
          }),
      };
    }
    const match = url.pathname.match(
      /^\/city\/social\/(friend|messages|read)\/([a-zA-Z0-9_]+)$/,
    );
    if (!match) throw new HttpError(404, "Not found.");
    const [, kind, username] = match,
      other = target(username);
    if (other === user.id) throw new HttpError(400, "Choose another user.");
    const r = relationship(user.id, other);
    if (kind === "friend" && req.method === "POST") {
      const d = await body(req);
      if (d.action === "request") {
        if (!r) {
          db.prepare("INSERT INTO city_friends VALUES (?,?,'pending')").run(
            user.id,
            other,
          );
          notify(other, user.id, "request");
        }
      } else if (d.action === "accept") {
        if (!r || r.recipient !== user.id || r.status !== "pending")
          throw new HttpError(403, "No incoming request.");
        db.prepare(
          "UPDATE city_friends SET status='accepted' WHERE sender=? AND recipient=?",
        ).run(other, user.id);
        notify(other, user.id, "accepted");
      } else if (d.action === "remove") {
        db.prepare(
          "DELETE FROM city_friends WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)",
        ).run(user.id, other, other, user.id);
      } else throw new HttpError(400, "Invalid action.");
      return { ok: true };
    }
    if (kind === "read" && req.method === "POST") {
      if (r?.status !== "accepted")
        throw new HttpError(403, "Accept the friend request to chat.");
      const d = await body(req);
      if (
        !Array.isArray(d.ids) ||
        d.ids.length > 100 ||
        d.ids.some((id) => typeof id !== "string" || id.length > 100)
      )
        throw new HttpError(400, "Invalid message IDs.");
      const update = db.prepare(
        "UPDATE city_notifications SET seen=1 WHERE user_id=? AND actor_id=? AND kind='message' AND message_id=? AND EXISTS(SELECT 1 FROM city_messages m WHERE m.id=? AND m.recipient=? AND m.sender=?)",
      );
      for (const id of d.ids)
        update.run(user.id, other, id, id, user.id, other);
      return { ok: true };
    }
    if (kind === "messages") {
      if (r?.status !== "accepted")
        throw new HttpError(403, "Accept the friend request to chat.");
      if (req.method === "GET")
        return {
          messages: db
            .prepare(
              `SELECT m.id,m.body,m.created_at,u.username AS sender FROM city_messages m JOIN users u ON u.id=m.sender WHERE (m.sender=? AND m.recipient=?) OR (m.sender=? AND m.recipient=?) ORDER BY m.created_at DESC,m.rowid DESC LIMIT 100`,
            )
            .all(user.id, other, other, user.id)
            .reverse(),
        };
      if (req.method === "POST") {
        const d = await body(req);
        if (
          typeof d.body !== "string" ||
          !d.body.trim() ||
          d.body.length > 2000
        )
          throw new HttpError(400, "Message must contain 1–2000 characters.");
        const messageId = randomUUID();
        db.prepare("INSERT INTO city_messages VALUES (?,?,?,?,?)").run(
          messageId,
          user.id,
          other,
          d.body.trim(),
          new Date().toISOString(),
        );
        notify(other, user.id, "message", messageId);
        return { ok: true };
      }
    }
    throw new HttpError(404, "Not found.");
  };
}

export function friendshipSummary(db, ownerId, viewerId) {
  const friends = db
    .prepare(
      "SELECT COUNT(*) AS n FROM city_friends WHERE status='accepted' AND (sender=? OR recipient=?)",
    )
    .get(ownerId, ownerId).n;
  const row =
    viewerId &&
    db
      .prepare(
        "SELECT sender,recipient,status FROM city_friends WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)",
      )
      .get(ownerId, viewerId, viewerId, ownerId);
  return {
    friends,
    friendship:
      ownerId === viewerId
        ? "self"
        : row?.status === "accepted"
          ? "friends"
          : row
            ? row.sender === viewerId
              ? "outgoing"
              : "incoming"
            : "none",
  };
}
