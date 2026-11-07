import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { HttpError } from "./store.mjs";
export function createVasile(
  store,
  { aiFetch = fetch, aiUrl = "http://127.0.0.1:8000" } = {},
) {
  const db = store.db;
  db.exec(`CREATE TABLE IF NOT EXISTS city_vasile_messages(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,role TEXT NOT NULL CHECK(role IN ('user','assistant')),content TEXT NOT NULL,recommendations TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS city_vasile_history ON city_vasile_messages(user_id,created_at);`);
  const pending = new Set(),
    limits = new Map();
  const places = () =>
    JSON.parse(
      readFileSync(
        new URL("./data-sources/places.json", import.meta.url),
        "utf8",
      ),
    );
  const recommendations = (value, catalog) => {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    return value
      .flatMap((r) => {
        if (!r || typeof r.place_id !== "string" || seen.has(r.place_id))
          return [];
        const p = catalog.find(
          (p) => p.id === r.place_id || p.alias_ids?.includes(r.place_id),
        );
        if (!p || seen.has(p.id)) return [];
        seen.add(p.id);
        return [
          {
            place_id: p.id,
            name: p.name,
            address: p.address || "",
            locality: p.locality || "",
            reason: typeof r.reason === "string" ? r.reason.slice(0, 500) : "",
          },
        ];
      })
      .slice(0, 5);
  };
  const history = (user) =>
    db
      .prepare(
        "SELECT id,role,content,recommendations,created_at FROM city_vasile_messages WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 120",
      )
      .all(user.id)
      .reverse();
  return async (req, url, body) => {
    const token = req.headers.authorization?.match(
      /^Bearer ([A-Za-z0-9_-]{43})$/,
    )?.[1];
    if (!token)
      throw new HttpError(401, "Intră în cont pentru a vorbi cu Vasile.");
    const user = store.authenticate(token),
      path = url.pathname;
    if (req.method === "GET" && path === "/city/vasile/history") {
      const catalog = places();
      return {
        messages: history(user).map((m) => ({
          ...m,
          recommendations: recommendations(
            JSON.parse(m.recommendations),
            catalog,
          ),
        })),
      };
    }
    if (req.method === "POST" && path === "/city/vasile/clear") {
      if (pending.has(user.id))
        throw new HttpError(
          409,
          "Așteaptă răspunsul lui Vasile înainte să ștergi conversația.",
        );
      db.prepare("DELETE FROM city_vasile_messages WHERE user_id=?").run(
        user.id,
      );
      return { ok: true };
    }
    if (req.method !== "POST" || path !== "/city/vasile/chat")
      throw new HttpError(404, "Not found.");
    const d = await body(req);
    if (
      typeof d.message !== "string" ||
      !d.message.trim() ||
      d.message.length > 2000
    )
      throw new HttpError(
        400,
        "Mesajul trebuie să aibă între 1 și 2000 de caractere.",
      );
    if (pending.has(user.id))
      throw new HttpError(409, "Vasile îți pregătește deja un răspuns.");
    const now = Date.now(),
      limit = limits.get(user.id);
    if (limit && now - limit.since < 60000 && limit.count >= 8)
      throw new HttpError(429, "Trimite cel mult 8 mesaje pe minut.");
    if (limits.size > 10000)
      for (const [id, l] of limits)
        if (now - l.since >= 60000) limits.delete(id);
    limits.set(
      user.id,
      limit && now - limit.since < 60000
        ? { ...limit, count: limit.count + 1 }
        : { since: now, count: 1 },
    );
    pending.add(user.id);
    try {
      const context = [];
      let chars = d.message.trim().length;
      for (const m of history(user).slice(-12).reverse()) {
        if (chars + m.content.length > 20000) break;
        context.unshift({ role: m.role, content: m.content });
        chars += m.content.length;
      }
      while (context[0]?.role === "assistant") context.shift();
      const messages = [
        ...context,
        { role: "user", content: d.message.trim() },
      ];
      let response;
      try {
        response = await aiFetch(aiUrl + "/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
          signal: AbortSignal.timeout(75000),
        });
      } catch {
        throw new HttpError(
          503,
          "Vasile nu este disponibil momentan. Încearcă din nou.",
        );
      }
      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new HttpError(
          response.status === 429 ? 429 : 503,
          typeof result?.detail === "string"
            ? result.detail
            : "Vasile nu poate răspunde momentan.",
        );
      if (
        typeof result?.reply !== "string" ||
        !result.reply.trim() ||
        result.reply.length > 4000
      )
        throw new HttpError(
          502,
          "Răspuns invalid de la Vasile. Încearcă din nou.",
        );
      const selected = recommendations(result.recommendations, places()).map(
        ({ place_id, reason }) => ({ place_id, reason }),
      );
      const time = new Date().toISOString(),
        userMessage = {
          id: randomUUID(),
          role: "user",
          content: d.message.trim(),
          created_at: time,
          recommendations: [],
        },
        answer = {
          id: randomUUID(),
          role: "assistant",
          content: result.reply.trim(),
          created_at: time,
          recommendations: selected,
        };
      db.exec("BEGIN IMMEDIATE");
      try {
        const insert = db.prepare(
          "INSERT INTO city_vasile_messages VALUES (?,?,?,?,?,?)",
        );
        for (const m of [userMessage, answer])
          insert.run(
            m.id,
            user.id,
            m.role,
            m.content,
            JSON.stringify(m.recommendations),
            m.created_at,
          );
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      return {
        messages: [
          userMessage,
          { ...answer, recommendations: recommendations(selected, places()) },
        ],
      };
    } finally {
      pending.delete(user.id);
    }
  };
}
