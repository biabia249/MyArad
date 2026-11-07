import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { HttpError } from "./store.mjs";

export const inArad = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= 46.13 &&
  lat <= 46.23 &&
  lng >= 21.23 &&
  lng <= 21.39;
const placeDefaults = {
  landmark: {
    ro: "obiectiv arhitectural și punct de interes",
    en: "architectural landmark and point of interest",
    image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=82",
  },
  education: {
    ro: "instituție de educație și reper al comunității locale",
    en: "educational institution and local community landmark",
    image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=82",
  },
  culture: {
    ro: "spațiu cultural și loc de întâlnire pentru comunitate",
    en: "cultural venue and community meeting place",
    image: "https://images.unsplash.com/photo-1488841714725-bb4c32d1ac94?auto=format&fit=crop&w=1200&q=82",
  },
  nightlife: {
    ro: "local de socializare și petrecere a timpului liber",
    en: "social and leisure venue",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=82",
  },
  cafe: {
    ro: "cafenea din oferta locală a orașului",
    en: "café in the city's local hospitality scene",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=82",
  },
  food: {
    ro: "restaurant sau punct gastronomic local",
    en: "local restaurant or food venue",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=82",
  },
  park: {
    ro: "zonă naturală și destinație pentru recreere în aer liber",
    en: "natural area and outdoor recreation destination",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82",
  },
};
function completePlace(place) {
  const fallback = placeDefaults[place.category] || placeDefaults.landmark;
  const addressRo = place.address
    ? ` Se află la adresa ${place.address}, iar poziția din hartă te ajută să o găsești și să planifici traseul.`
    : " Poziția marcată în hartă te ajută să o găsești și să planifici traseul.";
  const addressEn = place.address
    ? ` It is located at ${place.address}; use its mapped position to find it and plan a route.`
    : " Use its mapped position to find it and plan a route.";
  const descriptionRo = `${place.name} este ${fallback.ro} din Arad.${addressRo} Informațiile de localizare sunt furnizate de comunitatea OpenStreetMap și pot fi actualizate pe măsură ce locul se schimbă.`;
  const descriptionEn = `${place.name_en || place.name} is a local ${fallback.en} in Arad.${addressEn} Location information is provided by the OpenStreetMap community and may be updated as the place changes.`;
  const hasImage = typeof place.image === "string" && place.image.trim();
  return {
    ...place,
    description_ro: place.description_ro?.trim() || descriptionRo,
    description_en:
      place.description_en?.trim() || place.description?.trim() || descriptionEn,
    description:
      place.description?.trim() || place.description_en?.trim() || descriptionEn,
    image: hasImage ? place.image : fallback.image,
    image_source: hasImage
      ? place.image_source || place.wiki_source || place.source
      : "https://unsplash.com/",
    image_credit: hasImage
      ? place.image_credit || "Fotografie documentară · sursa indicată"
      : "Imagine reprezentativă · Unsplash",
    image_license: hasImage ? place.image_license || "" : "Unsplash License",
  };
}
const text = (data, key, max, required = true) => {
  const value = data[key];
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    throw new HttpError(400, `Invalid ${key}.`);
  return value.trim();
};
export function createCity(store, config) {
  const db = store.db;
  db.exec(`CREATE TABLE IF NOT EXISTS city_bios(user_id TEXT PRIMARY KEY REFERENCES users(id),bio TEXT NOT NULL DEFAULT '',location TEXT NOT NULL DEFAULT '',interests TEXT NOT NULL DEFAULT '',photo TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS city_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id), public INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS city_follows (follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, followed_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL, PRIMARY KEY(follower_id,followed_id), CHECK(follower_id<>followed_id));
    CREATE TABLE IF NOT EXISTS city_plans (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),place_id TEXT,event_id TEXT REFERENCES city_events(id) ON DELETE CASCADE,title TEXT NOT NULL,venue TEXT NOT NULL,lat REAL NOT NULL,lng REAL NOT NULL,starts_at TEXT NOT NULL,ends_at TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS city_events (
    id TEXT PRIMARY KEY, author_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
    description TEXT NOT NULL, category TEXT NOT NULL, venue TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL,
    starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS city_attendance (event_id TEXT REFERENCES city_events(id) ON DELETE CASCADE, user_id TEXT REFERENCES users(id), PRIMARY KEY(event_id,user_id));
    CREATE TABLE IF NOT EXISTS city_comments (id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES city_events(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id),body TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS city_corrections (id TEXT PRIMARY KEY,place_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),body TEXT NOT NULL,created_at TEXT NOT NULL);`);
  let places = [];
  try {
    places = JSON.parse(
      readFileSync(
        new URL("./data-sources/places.json", import.meta.url),
        "utf8",
      ),
    ).map(completePlace);
  } catch {
    /* Empty until data import finishes. */
  }
  const author = (req) => {
    const token = req.headers.authorization?.match(
      /^Bearer ([A-Za-z0-9_-]{43})$/,
    )?.[1];
    if (!token) throw new HttpError(401, "Please sign in to participate.");
    return store.authenticate(token);
  };
  const event = (id) => {
    const row = db
      .prepare(
        "SELECT e.*,u.full_name AS author FROM city_events e JOIN users u ON u.id=e.author_id WHERE e.id=?",
      )
      .get(id);
    if (!row) throw new HttpError(404, "Event not found.");
    return row;
  };
  const canPost = (user) =>
    !!user && (config.eventPosting === "signed-in" || !!user.google_sub);
  return async function city(req, url, body) {
    const path = url.pathname;
    if (req.method === "GET" && path === "/city/bootstrap") {
      let user = null;
      if (req.headers.authorization) {
        try {
          user = author(req);
        } catch {
          /* Public browsing remains available. */
        }
      }
      return {
        places,
        canPost: canPost(user),
        postingPolicy:
          config.eventPosting === "signed-in" ? "signed-in" : "google",
        events: db
          .prepare(
            `SELECT e.*,u.full_name AS author,(SELECT COUNT(*) FROM city_attendance a WHERE a.event_id=e.id) AS attending FROM city_events e JOIN users u ON u.id=e.author_id WHERE e.ends_at>? ORDER BY e.starts_at LIMIT 500`,
          )
          .all(new Date().toISOString()),
      };
    }
    if (req.method === "POST" && path === "/city/events") {
      const user = author(req);
      if (!canPost(user))
        throw new HttpError(
          403,
          "A verified account is required to publish events.",
        );
      const d = await body(req);
      const title = text(d, "title", 120),
        description = text(d, "description", 3000),
        category = text(d, "category", 40),
        venue = text(d, "venue", 200);
      if (!inArad(d.lat, d.lng))
        throw new HttpError(400, "Choose a location inside Arad.");
      const starts = new Date(d.starts_at),
        ends = new Date(d.ends_at);
      if (
        !Number.isFinite(+starts) ||
        !Number.isFinite(+ends) ||
        ends <= starts ||
        ends <= new Date() ||
        ends - starts > 31 * 86400000
      )
        throw new HttpError(
          400,
          "Choose valid event dates; the end must follow the start and be in the future (maximum 31 days).",
        );
      const id = randomUUID();
      db.prepare("INSERT INTO city_events VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(
        id,
        user.id,
        title,
        description,
        category,
        venue,
        d.lat,
        d.lng,
        starts.toISOString(),
        ends.toISOString(),
        new Date().toISOString(),
      );
      return { event: event(id) };
    }
    if (path === "/city/profile" && req.method === "POST") {
      const user = author(req),
        d = await body(req);
      const name = text(d, "fullName", 100),
        bio = text(d, "bio", 500, false),
        location = text(d, "location", 80, false),
        interests = text(d, "interests", 160, false),
        photo = text(d, "photo", 1450000, false);
      if (photo) {
        const m = photo.match(
          /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/,
        );
        if (!m) throw new HttpError(400, "Use a PNG, JPEG or WebP photo.");
        const b = Buffer.from(m[2], "base64");
        const valid =
          m[1] === "png"
            ? b
                .subarray(0, 8)
                .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : m[1] === "jpeg"
              ? b[0] === 255 && b[1] === 216 && b[2] === 255
              : b.toString("ascii", 0, 4) === "RIFF" &&
                b.toString("ascii", 8, 12) === "WEBP";
        if (!valid || b.length > 1048576)
          throw new HttpError(400, "Choose a valid photo under 1 MB.");
      }
      db.prepare(
        "INSERT INTO city_bios VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET bio=excluded.bio,location=excluded.location,interests=excluded.interests,photo=excluded.photo",
      ).run(user.id, bio, location, interests, photo);
      db.prepare("UPDATE users SET full_name=? WHERE id=?").run(name, user.id);
      return { ok: true };
    }
    if (path === "/city/schedule" && req.method === "GET") {
      const user = author(req);
      return {
        username: user.username,
        fullName: user.full_name,
        profile:
          db
            .prepare(
              "SELECT bio,location,interests,photo FROM city_bios WHERE user_id=?",
            )
            .get(user.id) || {},
        public: !!db
          .prepare("SELECT public FROM city_profiles WHERE user_id=?")
          .get(user.id)?.public,
        followers: db
          .prepare("SELECT COUNT(*) AS n FROM city_follows WHERE followed_id=?")
          .get(user.id).n,
        following: db
          .prepare("SELECT COUNT(*) AS n FROM city_follows WHERE follower_id=?")
          .get(user.id).n,
        isOwnProfile: true,
        isFollowing: false,
        plans: db
          .prepare(
            "SELECT * FROM city_plans WHERE user_id=? ORDER BY starts_at",
          )
          .all(user.id),
      };
    }
    if (path === "/city/schedule/visibility" && req.method === "POST") {
      const user = author(req),
        d = await body(req);
      if (typeof d.public !== "boolean")
        throw new HttpError(400, "Invalid visibility.");
      db.prepare(
        "INSERT INTO city_profiles VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET public=excluded.public",
      ).run(user.id, d.public ? 1 : 0);
      return { ok: true };
    }
    if (path === "/city/schedule" && req.method === "POST") {
      const user = author(req),
        d = await body(req);
      let place = null;
      if (d.event_id) {
        const e = event(text(d, "event_id", 100));
        place = { ...e, name: e.title, address: e.venue };
      } else place = places.find((p) => p.id === text(d, "place_id", 100));
      if (!place) throw new HttpError(404, "Place not found.");
      const start = new Date(d.starts_at),
        end = new Date(d.ends_at);
      if (
        !Number.isFinite(+start) ||
        !Number.isFinite(+end) ||
        end <= start ||
        end - start > 31 * 86400000
      )
        throw new HttpError(400, "Choose valid plan dates.");
      if (
        db
          .prepare("SELECT COUNT(*) AS n FROM city_plans WHERE user_id=?")
          .get(user.id).n >= 300
      )
        throw new HttpError(400, "Your schedule has reached 300 plans.");
      db.prepare("INSERT INTO city_plans VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(
        randomUUID(),
        user.id,
        d.place_id || null,
        d.event_id || null,
        place.name,
        place.address || place.name,
        place.lat,
        place.lng,
        start.toISOString(),
        end.toISOString(),
        new Date().toISOString(),
      );
      return { ok: true };
    }
    if (path.startsWith("/city/schedule/remove/") && req.method === "POST") {
      const user = author(req),
        id = path.split("/").at(-1);
      const removed = db
        .prepare("DELETE FROM city_plans WHERE id=? AND user_id=? RETURNING id")
        .get(id, user.id);
      if (!removed) throw new HttpError(404, "Plan not found.");
      return { ok: true };
    }
    if (path.startsWith("/city/citizens/") && req.method === "GET") {
      const username = decodeURIComponent(path.split("/").at(-1));
      const u = db
        .prepare(
          "SELECT u.id,u.username,u.full_name FROM users u JOIN city_profiles p ON p.user_id=u.id AND p.public=1 WHERE u.username=? COLLATE NOCASE",
        )
        .get(username);
      if (!u)
        throw new HttpError(404, "This schedule is private or does not exist.");
      let viewer = null;
      if (req.headers.authorization) {
        try {
          viewer = author(req);
        } catch {
          /* Public profiles remain visible when a stored session expired. */
        }
      }
      return {
        username: u.username,
        fullName: u.full_name,
        profile:
          db
            .prepare(
              "SELECT bio,location,interests,photo FROM city_bios WHERE user_id=?",
            )
            .get(u.id) || {},
        public: true,
        followers: db
          .prepare("SELECT COUNT(*) AS n FROM city_follows WHERE followed_id=?")
          .get(u.id).n,
        following: db
          .prepare("SELECT COUNT(*) AS n FROM city_follows WHERE follower_id=?")
          .get(u.id).n,
        isOwnProfile: viewer?.id === u.id,
        isFollowing: !!viewer && !!db
          .prepare("SELECT 1 FROM city_follows WHERE follower_id=? AND followed_id=?")
          .get(viewer.id, u.id),
        plans: db
          .prepare(
            "SELECT id,title,venue,lat,lng,starts_at,ends_at FROM city_plans WHERE user_id=? ORDER BY starts_at",
          )
          .all(u.id),
      };
    }
    const followMatch = path.match(/^\/city\/citizens\/([^/]+)\/follow$/);
    if (followMatch && req.method === "POST") {
      const user = author(req),
        username = decodeURIComponent(followMatch[1]),
        target = db
          .prepare(
            "SELECT u.id FROM users u JOIN city_profiles p ON p.user_id=u.id AND p.public=1 WHERE u.username=? COLLATE NOCASE",
          )
          .get(username);
      if (!target) throw new HttpError(404, "This profile is private or does not exist.");
      if (target.id === user.id) throw new HttpError(400, "You cannot follow yourself.");
      const d = await body(req);
      if (typeof d.following !== "boolean")
        throw new HttpError(400, "Invalid follow preference.");
      if (d.following)
        db.prepare("INSERT OR IGNORE INTO city_follows VALUES (?,?,?)").run(
          user.id,
          target.id,
          new Date().toISOString(),
        );
      else
        db.prepare("DELETE FROM city_follows WHERE follower_id=? AND followed_id=?").run(
          user.id,
          target.id,
        );
      return { ok: true };
    }
    const match = path.match(
      /^\/city\/events\/([a-f0-9-]+)(?:\/(attend|comments))?$/,
    );
    if (match) {
      const [, id, action] = match;
      const found = event(id);
      if (req.method === "GET" && !action) {
        let user = null;
        if (req.headers.authorization) {
          try {
            user = author(req);
          } catch {
            /* guest */
          }
        }
        return {
          event: found,
          attending: db
            .prepare(
              "SELECT COUNT(*) AS n FROM city_attendance WHERE event_id=?",
            )
            .get(id).n,
          going:
            !!user &&
            !!db
              .prepare(
                "SELECT 1 FROM city_attendance WHERE event_id=? AND user_id=?",
              )
              .get(id, user.id),
          comments: db
            .prepare(
              "SELECT c.id,c.body,c.created_at,u.full_name AS author FROM city_comments c JOIN users u ON u.id=c.user_id WHERE c.event_id=? ORDER BY c.created_at LIMIT 200",
            )
            .all(id),
        };
      }
      if (req.method === "POST" && action) {
        const user = author(req),
          d = await body(req);
        if (action === "attend") {
          if (typeof d.going !== "boolean")
            throw new HttpError(400, "Invalid attendance choice.");
          if (d.going)
            db.prepare(
              "INSERT OR IGNORE INTO city_attendance VALUES (?,?)",
            ).run(id, user.id);
          else
            db.prepare(
              "DELETE FROM city_attendance WHERE event_id=? AND user_id=?",
            ).run(id, user.id);
          return { ok: true };
        }
        const value = text(d, "body", 2000);
        db.prepare("INSERT INTO city_comments VALUES (?,?,?,?,?)").run(
          randomUUID(),
          id,
          user.id,
          value,
          new Date().toISOString(),
        );
        return { ok: true };
      }
    }
    if (req.method === "POST" && path === "/city/corrections") {
      const user = author(req),
        d = await body(req),
        id = text(d, "place_id", 100),
        value = text(d, "body", 2000);
      if (!places.some((p) => p.id === id))
        throw new HttpError(404, "Place not found.");
      db.prepare("INSERT INTO city_corrections VALUES (?,?,?,?,?)").run(
        randomUUID(),
        id,
        user.id,
        value,
        new Date().toISOString(),
      );
      return { ok: true };
    }
    throw new HttpError(404, "Not found.");
  };
}
