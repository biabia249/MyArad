import { useCallback, useEffect, useRef, useState } from "react";
import { smartSearchScore } from "./smart-search";
import { itineraryLabel, itineraryBreakdown, routeModeName, pickModeItinerary, travelModeName, type TravelMode } from './route-presentation';
import { ResultsSplitter } from './results-splitter';
import { locationErrorMessage } from './location-errors';
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
  onPosition,
  routeRequest = 0,
}: {
  lang: Language;
  props: CityProps;
  destination?: { lat: number; lng: number; name: string };
  places: Place[];
  onRoute: (i: Itinerary | null) => void;
  position?: { lat: number; lng: number } | null;
  onLine?: (encoded: string) => void;
  onPosition?: (point: { lat: number; lng: number }) => void;
  routeRequest?: number;
}) {
  const ro = lang === "ro";
  const { onRequest, onLocate } = props;
  const [origin, setOrigin] = useState(""),
    [to, setTo] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [results, setResults] = useState<Itinerary[]>([]),
    [active, setActive] = useState(0),
    [network, setNetwork] = useState<TransitNetwork | null>(null);
  const [useGps, setUseGps] = useState(true);
  const [unavailable, setUnavailable] = useState<{mode: TravelMode; failed: boolean}[]>([]);
  const [requestedAt, setRequestedAt] = useState(0);
  const handledRequest = useRef(0);
  const planVersion = useRef(0);
  useEffect(() => () => { planVersion.current++; }, []);
  const [originSearch, setOriginSearch] = useState(''), [destinationSearch, setDestinationSearch] = useState('');
  const [lineId, setLineId] = useState(0),
    [patternId, setPatternId] = useState(0);
  useEffect(() => {
    let live = true;
    onRequest("/city/transit/network", null)
      .then((r) => {
        if (live && r.ok) setNetwork(JSON.parse(r.data));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [onRequest]);
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
  const locateOption = useCallback((id: string) => {
    if (id.startsWith("stop:")) {
      const s = network?.stops.find((s) => String(s.id) === id.slice(5));
      return s ? { lat: s.latitude, lng: s.longitude } : null;
    }
    return places.find((p) => p.id === id) || null;
  }, [network, places]);
  const plan = useCallback(async (forceGps = false) => {
    const version = ++planVersion.current;
    setBusy(true);
    setRequestedAt(Date.now());
    setError("");
    setResults([]);
    setUnavailable([]);
    onRoute(null);
    try {
      const gps = forceGps || useGps;
      if (forceGps) setUseGps(true);
      const dest = destination || locateOption(to);
      if (!dest) throw new Error(ro ? 'Alege destinația.' : 'Choose a destination.');
      let from = gps ? position : locateOption(origin);
      if (gps) {
        const p = await onLocate();
        if (version !== planVersion.current) return;
        if (p.error)
          throw new Error(locationErrorMessage(p.error, ro));
        from = p;
        onPosition?.(p);
      }
      if (!from || !dest)
        throw new Error(
          ro
            ? "Alege plecarea și destinația."
            : "Choose a start and destination.",
        );
      const modes: TravelMode[] = ['walking', 'driving', 'bicycling', 'transit'];
      const responses = await Promise.allSettled(modes.map(async travelMode => {
        const r = await onRequest('/city/transit/plan', JSON.stringify({ from: {lat:from.lat,lng:from.lng}, to: {lat:dest.lat,lng:dest.lng}, mode:travelMode }));
        if (!r.ok) throw new Error(r.error);
        const j=JSON.parse(r.data);
        if (!Array.isArray(j.itineraries)) throw new Error('Invalid route service response.');
        return pickModeItinerary(j.itineraries,travelMode);
      }));
      if (version !== planVersion.current) return;
      const available: Itinerary[] = [];
      const missing: {mode:TravelMode;failed:boolean}[] = [];
      responses.forEach((result,index) => {
        if (result.status === 'fulfilled' && result.value) available.push(result.value);
        else missing.push({mode:modes[index],failed:result.status === 'rejected'});
      });
      available.sort((a,b)=>a.endTime-b.endTime);
      setResults(available); setUnavailable(missing); setActive(0);
      if (!available.length) throw new Error(ro ? 'Nu am găsit un traseu disponibil. Reîncearcă sau verifică planificatorul oficial.' : 'No route found. Retry or check the official planner.');
      onRoute(available[0]);
    } catch (e) {
      if (version !== planVersion.current) return;
      const message = (e as Error).message;
      setError(
        ro && message.includes("Transport service")
          ? "Serviciul de transport nu răspunde acum. Reîncearcă sau deschide planificatorul oficial."
          : message,
      );
    } finally {
      if (version === planVersion.current) setBusy(false);
    }
  }, [useGps, position, locateOption, origin, destination, to, onLocate, onRequest, onPosition, onRoute, ro]);
  useEffect(() => {
    if (!routeRequest || handledRequest.current === routeRequest) return;
    handledRequest.current = routeRequest;
    void plan(true);
  }, [routeRequest, plan]);
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
      <div className="journey-filter-panel">
      <div className="journey-heading">
        <span className="eyebrow">
          MYARAD / {ro ? "RUTA TA" : "YOUR ROUTE"}
        </span>
        <h3>{ro ? "Cum ajung?" : "How do I get there?"}</h3>
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
      </div>
      <ResultsSplitter page={routeRequest ? 'transport-results' : destination ? 'journey-detail-results' : 'transport-results'} />
      <div className="journey-results-panel">
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
                {itineraryLabel(i,ro)}
              </span>
              <small>
                {time(i.startTime)}–{time(i.endTime)}
              </small>
            </button>
          ))}
        </div>
      )}
      {unavailable.length > 0 && <div className="journey-unavailable" role="status">{unavailable.map(item => <p key={item.mode}><strong>{travelModeName(item.mode,ro)}:</strong> {item.failed ? (ro ? 'serviciul nu răspunde momentan.' : 'service currently unavailable.') : (ro ? 'nicio variantă pentru această plecare în rezultatele serviciului.' : 'no matching journey returned for this departure.')}</p>)}</div>}
      {results[active] && results[active].startTime * 1000 > requestedAt + 60000 && <p className="journey-note">{ro ? 'Plecare disponibilă la' : 'Available departure at'} {time(results[active].startTime)}.</p>}
      {results[active] && (
        <>
          <div className="journey-summary">
            {itineraryBreakdown(results[active]).map(part => <span key={part.mode}>{routeModeName(part.mode,ro)}: {minutes(part.duration)} min</span>)}
            {results[active].waitingTime > 0 && <span>{ro ? 'Așteptare' : 'Waiting'}: {minutes(results[active].waitingTime)} min</span>}
            {results[active].transfers > 0 && <span>{results[active].transfers} {ro ? 'schimbări' : 'changes'}</span>}
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
      </div>
    </section>
  );
}
