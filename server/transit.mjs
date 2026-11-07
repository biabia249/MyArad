import { HttpError } from "./store.mjs";
export const TRANSIT_BASE =
  "https://www.telelink.city/api/v1/e39aa927-11c1-435f-92b9-57804f7bc1b4/transport/planner/";
export function createTransit(send = fetch) {
  let cached = null,
    expires = 0;
  const fetchJson = async (path, body) => {
    try {
      const r = await send(TRANSIT_BASE + path, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "MyArad/1.0",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error();
      return await r.json();
    } catch {
      throw new HttpError(
        503,
        "Transport service is unavailable. Please retry or use the official planner.",
      );
    }
  };
  return async (req, url, readBody) => {
    if (req.method === "GET" && url.pathname === "/city/transit/network") {
      if (!cached || Date.now() > expires) {
        const [stops, routes] = await Promise.all([
          fetchJson("stops"),
          fetchJson("routes"),
        ]);
        cached = {
          stops,
          routes,
          source: "https://arad-transport.telelink.city/app/lines",
          retrievedAt: new Date().toISOString(),
        };
        expires = Date.now() + 300000;
      }
      return cached;
    }
    if (req.method === "POST" && url.pathname === "/city/transit/plan") {
      const d = await readBody(req);
      for (const p of [d.from, d.to])
        if (
          !p ||
          !Number.isFinite(p.lat) ||
          !Number.isFinite(p.lng) ||
          p.lat < 45.85 ||
          p.lat > 46.85 ||
          p.lng < 20.55 ||
          p.lng > 22.95
        )
          throw new HttpError(
            400,
            "Choose a starting point and destination in the Arad area.",
          );
      const modes = {
        transit: "TRANSIT,WALK",
        walking: "WALK",
        bicycling: "BICYCLE",
        driving: "CAR",
      };
      if (!modes[d.mode]) throw new HttpError(400, "Invalid travel mode.");
      const result = await fetchJson("plan", {
        fromPlace: { lat: d.from.lat, lon: d.from.lng },
        toPlace: { lat: d.to.lat, lon: d.to.lng },
        mode: modes[d.mode],
        time: new Date().toISOString(),
        maxWalkDistance: 1500,
        walkingSpeed: 1.2,
      });
      const source = result.plan?.itineraries || [];
      const options = source.filter(
        (i) =>
          Array.isArray(i.legs) &&
          i.duration > 0 &&
          i.endTime * 1000 > Date.now(),
      );
      options.sort((a, b) => a.endTime - b.endTime);
      return {
        itineraries: options.slice(0, 5),
        source: "https://arad-transport.telelink.city/app/planner",
        retrievedAt: new Date().toISOString(),
        error: result.error?.msg || null,
      };
    }
    throw new HttpError(404, "Not found.");
  };
}
