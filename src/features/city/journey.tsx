import { useEffect, useState } from "react";
import { smartSearchScore } from "./smart-search";
import type { CityProps, Language, Place } from "./types";
import type { Itinerary, TransitNetwork } from "./transit-types";
export function Journey({
  lang,
  props,
  destination,
  places,
  onRoute,
  position,
  onLine,
}: {
  lang: Language;
  props: CityProps;
  destination?: { lat: number; lng: number; name: string };
  places: Place[];
  onRoute: (i: Itinerary) => void;
  position?: { lat: number; lng: number } | null;
  onLine?: (encoded: string) => void;
}) {
  const ro = lang === "ro";
  const [mode, setMode] = useState("transit"),
    [origin, setOrigin] = useState(""),
    [to, setTo] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [results, setResults] = useState<Itinerary[]>([]),
    [active, setActive] = useState(0),
    [network, setNetwork] = useState<TransitNetwork | null>(null);
  const [useGps, setUseGps] = useState(true);
  const [originSearch, setOriginSearch] = useState(''), [destinationSearch, setDestinationSearch] = useState('');
  const [lineId, setLineId] = useState(0),
    [patternId, setPatternId] = useState(0);
  useEffect(() => {
    let live = true;
    props
      .onRequest("/city/transit/network", null)
      .then((r) => {
        if (live && r.ok) setNetwork(JSON.parse(r.data));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [props]);
  const minutes = (n: number) => (n <= 0 ? 0 : Math.max(1, Math.round(n / 60)));
  const time = (n: number) =>
    new Date(n * 1000).toLocaleTimeString(ro ? "ro-RO" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const legName = (mode: string) =>
    ({
      WALK: ro ? "Mergi pe jos" : "Walk",
      TRAM: ro ? "Tramvai" : "Tram",
      BUS: ro ? "Autobuz" : "Bus",
      CAR: ro ? "Mașină" : "Car",
      BICYCLE: ro ? "Bicicletă" : "Bicycle",
      RAIL: ro ? "Tren" : "Train",
    })[mode] || mode;
  const official = "https://arad-transport.telelink.city/app/";
  const locateOption = (id: string) => {
    if (id.startsWith("stop:")) {
      const s = network?.stops.find((s) => String(s.id) === id.slice(5));
      return s ? { lat: s.latitude, lng: s.longitude } : null;
    }
    return places.find((p) => p.id === id) || null;
  };
  async function plan() {
    setBusy(true);
    setError("");
    setResults([]);
    try {
      let from = useGps ? position : locateOption(origin);
      if (useGps && !from) {
        const p = await props.onLocate();
        if (p.error)
          throw new Error(
            ro
              ? "Permite localizarea sau alege o stație de plecare."
              : "Allow location or choose a starting stop.",
          );
        from = p;
      }
      const dest = destination || locateOption(to);
      if (!from || !dest)
        throw new Error(
          ro
            ? "Alege plecarea și destinația."
            : "Choose a start and destination.",
        );
      const r = await props.onRequest(
        "/city/transit/plan",
        JSON.stringify({
          from: { lat: from.lat, lng: from.lng },
          to: { lat: dest.lat, lng: dest.lng },
          mode,
        }),
      );
      if (!r.ok) throw new Error(r.error);
      const j = JSON.parse(r.data);
      setResults(j.itineraries);
      setActive(0);
      if (!j.itineraries.length)
        throw new Error(
          ro
            ? "Nu există un traseu disponibil pentru această călătorie. Verifică planificatorul oficial."
            : "No route is available for this journey. Check the official planner.",
        );
      onRoute(j.itineraries[0]);
    } catch (e) {
      const message = (e as Error).message;
      setError(
        ro && message.includes("Transport service")
          ? "Serviciul de transport nu răspunde acum. Reîncearcă sau deschide planificatorul oficial."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }
  const options = (query: string, selected: string) => (
    <>
      <optgroup label={ro ? "Stații de transport public" : "Transit stops"}>
        {network?.stops.filter((s) => selected === 'stop:' + s.id || smartSearchScore(query, s.name, String(s.id)) > 0).map((s) => (
          <option key={s.id} value={"stop:" + s.id}>
            {s.name} · #{s.id}
          </option>
        ))}
      </optgroup>
      <optgroup label={ro ? "Locuri" : "Places"}>
        {places.filter((p) => selected === p.id || smartSearchScore(query, p.name, `${p.address} ${p.tags.join(' ')}`) > 0).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </optgroup>
    </>
  );
  return (
    <section className="journey">
      <div className="journey-heading">
        <span className="eyebrow">
          CTP ARAD / {ro ? "TRANSPORT PUBLIC" : "PUBLIC TRANSPORT"}
        </span>
        <h3>{ro ? "Cum ajung?" : "How do I get there?"}</h3>
      </div>
      <div className="travel-modes">
        {[
          ["transit", ro ? "Tramvai / autobuz" : "Tram / bus"],
          ["walking", ro ? "Pe jos" : "Walk"],
          ["bicycling", ro ? "Bicicletă" : "Cycle"],
          ["driving", ro ? "Mașină" : "Drive"],
        ].map(([m, label]) => (
          <button
            className={mode === m ? "mode-active" : ""}
            key={m}
            onClick={() => setMode(m)}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="gps-choice">
        <input
          type="checkbox"
          checked={useGps}
          onChange={(e) => setUseGps(e.target.checked)}
        />
        {ro ? "Plecare de la locația mea" : "Start at my location"}
      </label>
      {!useGps && (
        <label>
          {ro ? "De la" : "From"}
          <input aria-label={ro ? 'Caută plecarea' : 'Search origin'} placeholder={ro ? 'Caută un loc sau o stație…' : 'Search a place or stop…'} value={originSearch} onChange={(e) => setOriginSearch(e.target.value)} />
          <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
            <option value="">
              {ro ? "Alege o stație sau un loc" : "Choose a stop or place"}
            </option>
            {options(originSearch, origin)}
          </select>
        </label>
      )}
      {destination ? (
        <div className="journey-destination">↳ {destination.name}</div>
      ) : (
        <label>
          {ro ? "Până la" : "To"}
          <input aria-label={ro ? 'Caută destinația' : 'Search destination'} placeholder={ro ? 'Caută un loc sau o stație…' : 'Search a place or stop…'} value={destinationSearch} onChange={(e) => setDestinationSearch(e.target.value)} />
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">
              {ro ? "Alege destinația" : "Choose destination"}
            </option>
            {options(destinationSearch, to)}
          </select>
        </label>
      )}
      <button
        className="primary journey-plan"
        disabled={busy}
        onClick={() => void plan()}
      >
        {busy
          ? ro
            ? "Calculez traseul…"
            : "Planning…"
          : ro
            ? "Găsește traseul"
            : "Find my route"}{" "}
        →
      </button>
      {error && (
        <p className="journey-error" role="alert">
          {error}
        </p>
      )}
      {results.length > 0 && (
        <div className="journey-options">
          {results.map((i, index) => (
            <button
              key={index}
              className={active === index ? "chosen" : ""}
              onClick={() => {
                setActive(index);
                onRoute(i);
              }}
            >
              <strong>{minutes(i.duration)} min</strong>
              <span>
                {i.legs
                  .filter((l) => l.mode !== "WALK")
                  .map((l) => l.route)
                  .join(" → ") || (ro ? "Pe jos" : "Walk")}
              </span>
              <small>
                {time(i.startTime)}–{time(i.endTime)}
              </small>
            </button>
          ))}
        </div>
      )}
      {results[active] && (
        <>
          <div className="journey-summary">
            <span>🚶 {minutes(results[active].walkTime)} min</span>
            <span>▣ {minutes(results[active].transitTime)} min</span>
            <span>
              {results[active].transfers} {ro ? "schimbări" : "changes"}
            </span>
          </div>
          <ol className="journey-steps">
            {results[active].legs.map((l, index) => (
              <li
                key={index}
                className={l.mode === "WALK" ? "walk-leg" : "tram-leg"}
              >
                <span className="leg-symbol">
                  {l.mode === "WALK" ? "↗" : l.route || "▣"}
                </span>
                <div>
                  <strong>
                    {legName(l.mode)} {l.route}
                  </strong>
                  <p>
                    {l.from.name === "Origin"
                      ? ro
                        ? "Punctul de plecare"
                        : "Start"
                      : l.from.name}{" "}
                    →{" "}
                    {l.to.name === "Destination"
                      ? ro
                        ? "Destinație"
                        : "Destination"
                      : l.to.name}
                  </p>
                  <small>
                    {minutes(l.duration)} min
                    {l.mode === "WALK"
                      ? ` · ${Math.round(l.distance || 0)} m`
                      : ` · ${time(l.startTime)}–${time(l.endTime)}`}
                    {l.headsign ? ` · ${l.headsign}` : ""}
                  </small>
                </div>
              </li>
            ))}
          </ol>
          <p className="journey-note">
            {ro
              ? "Estimări furnizate de serviciul Transport Public Arad. Duratele și plecările se pot modifica. Verifică direcția în stație."
              : "Estimates from Transport Public Arad. Times and departures can change; check the direction at the stop."}
          </p>
        </>
      )}
      {network && (
        <details className="network-browser">
          <summary>
            {ro ? "Linii și stații" : "Lines and stops"} ·{" "}
            {network.routes.length}
          </summary>
          <select
            aria-label={ro ? "Alege linia" : "Choose line"}
            value={lineId}
            onChange={(e) => {
              const id = Number(e.target.value);
              setLineId(id);
              setPatternId(0);
              setResults([]);
              const route = network.routes.find((r) => r.id === id);
              if (route?.patterns[0]?.geometry)
                onLine?.(route.patterns[0].geometry);
            }}
          >
            <option value={0}>{ro ? "Alege linia" : "Choose line"}</option>
            {network.routes.map((r) => (
              <option value={r.id} key={r.id}>
                {r.type === 0 ? "Tramvai" : "Bus"} {r.shortName} · {r.longName}
              </option>
            ))}
          </select>
          {lineId > 0 && (
            <>
              <select
                aria-label={ro ? "Sensul de mers" : "Direction"}
                value={patternId}
                onChange={(e) => {
                  const i = Number(e.target.value);
                  setPatternId(i);
                  const pattern = network.routes.find((r) => r.id === lineId)
                    ?.patterns[i];
                  if (pattern?.geometry) onLine?.(pattern.geometry);
                }}
              >
                {network.routes
                  .find((r) => r.id === lineId)
                  ?.patterns.map((p, index) => (
                    <option key={index} value={index}>
                      {network.stops.find((s) => s.id === p.stops[0])?.name} →{" "}
                      {
                        network.stops.find(
                          (s) => s.id === p.stops[p.stops.length - 1],
                        )?.name
                      }
                    </option>
                  ))}
              </select>
              <ol>
                {network.routes
                  .find((r) => r.id === lineId)
                  ?.patterns[patternId]?.stops.map((id, index) => (
                    <li key={index}>
                      {network.stops.find((s) => s.id === id)?.name || id}
                    </li>
                  ))}
              </ol>
            </>
          )}
        </details>
      )}
      <button
        className="ticket-button"
        onClick={() => void props.onExternalLink(official + "ticketing")}
      >
        ▣{" "}
        {ro
          ? "Cumpără bilet · Transport Public Arad"
          : "Buy ticket · Transport Public Arad"}{" "}
        ↗
      </button>
      <div className="transit-links">
        <button onClick={() => void props.onExternalLink(official + "planner")}>
          {ro ? "Planificator oficial" : "Official planner"} ↗
        </button>
        <button
          onClick={() =>
            void props.onExternalLink(
              "https://play.google.com/store/apps/details?id=com.modeshift.arad",
            )
          }
        >
          {ro ? "Aplicația Android" : "Android app"} ↗
        </button>
      </div>
      <small className="ticket-note">
        {ro
          ? "Plata și validarea se fac în serviciul oficial. MyArad nu emite bilete."
          : "Payment and validation happen in the official service. MyArad does not issue tickets."}
      </small>
    </section>
  );
}
