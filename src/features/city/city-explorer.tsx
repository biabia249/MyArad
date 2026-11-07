"use dom";

import { VasileView } from "./vasile-view";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFonts } from 'expo-font';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./city.css";
import "./brand.css";
import './route-interface.css';
import './social-design.css';
import './notifications.css';
import { Journey } from "./journey";
import { SocialView } from './social-view';
import { Notifications } from './notifications';
import { EventParticipants } from './event-participants';
import { RouteSearch } from './route-search';
import { routeBurgundy, travelerMarkup } from './map-traveler';
import { locationErrorMessage } from './location-errors';
import { emptyBootstrap, parseBootstrap, safeBootstrap } from "./bootstrap-data";
import { SchoolDirectory } from "./school-directory";
import { ResultsSplitter } from "./results-splitter";
import { smartSearchScore } from "./smart-search";
import { PanelResizers } from "./panel-resizers";
import { EventNews } from "./event-news";
import { decodePath, type Itinerary } from "./transit-types";
import { ScheduleView, AddPlan } from "./schedule-view";
import coatOfArms from "./coat-of-arms.json";
import { copy } from "./i18n";
import type {
  Bootstrap,
  CityEvent,
  CityProps,
  EventDetails,
  Language,
  Place,
} from "./types";

const center: [number, number] = [46.1753, 21.3192];
const bounds: Leaflet.LatLngBoundsExpression = [
  [45.9, 20.7],
  [46.85, 22.9],
];
const categories = [
  "all",
  "landmark",
  "food",
  "cafe",
  "culture",
  "park",
  "nightlife",
  "education",
  "events",
] as const;
const eventCategories = [
  "music",
  "coffee",
  "art",
  "outdoors",
  "community",
  "sport",
  "other",
] as const;
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    search: "m21 21-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    arrow: "M5 12h14 m-6-6 6 6-6 6",
    close: "m6 6 12 12 M6 18 18 6",
    locate:
      "M12 2v3 M12 19v3 M2 12h3 M19 12h3 M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
    plus: "M12 5v14 M5 12h14",
    calendar: "M5 5h14v16H5Z M8 2v6 M16 2v6 M5 10h14",
    clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 6v6l4 2",
    user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 22v-3a8 8 0 0 1 16 0v3",
    layers: "m12 2 10 6-10 6L2 8Z M2 12l10 6 10-6 M2 16l10 6 10-6",
    landmark: "m3 8 9-5 9 5Z M5 10v9 M10 10v9 M14 10v9 M19 10v9 M2 21h20",
    cafe: "M4 3h12v12a5 5 0 0 1-10 0V3 M16 5h2a3 3 0 0 1 0 6h-2 M3 22h16",
    food: "M4 2v7c0 3 6 3 6 0V2 M7 2v20 M19 2c-4 4-4 10 0 10V2v20",
    culture: "M4 20 12 3l8 17 M8 13h8",
    park: "m12 2-7 9h4l-6 7h18l-6-7h4Z M12 18v4",
    nightlife: "M4 3h16l-8 10Z M12 13v8 M8 21h8",
    events: "M5 5h14v16H5Z M8 2v6 M16 2v6 M5 10h14",
    globe:
      "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3c-5 5-5 13 0 18 5-5 5-13 0-18",
    phone: "m5 3 4 4-2 3c2 3 4 5 7 7l3-2 4 4c-5 7-21-9-16-16Z",
    message: "M21 3H3v14h5l4 4v-4h9Z",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.pin} />
    </svg>
  );
}
function validUrl(s: string) {
  try {
    const u = new URL(s);
    return ["https:", "http:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
}
function validImageUrl(s: string) {
  if (s.startsWith("data:image/svg+xml;charset=UTF-8,")) return s;
  return validUrl(s);
}
function isEvent(p: Place | CityEvent): p is CityEvent {
  return "starts_at" in p;
}

export default function CityExplorer(props: CityProps) {
  useFonts({ 'DM Sans': DMSans_400Regular, Manrope: Manrope_700Bold });
  const [lang, setLang] = useState<Language>("ro");
  const t = copy[lang];
  const [loadedData, setData] = useState<Bootstrap>(emptyBootstrap);
  // Fast Refresh can preserve stale state; never spread unvalidated payloads.
  const data = safeBootstrap(loadedData);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState<string>(
      props.initialPage === "events"
        ? "events"
        : props.initialPage === "schools"
          ? "education"
          : "all",
    ),
    [dateFilter, setDateFilter] = useState("anytime");
  const [selected, setSelected] = useState<Place | CityEvent | null>(null),
    [details, setDetails] = useState<EventDetails | null>(null);
  const [mapZoom, setMapZoom] = useState(14);
  const [newsMap, setNewsMap] = useState(false);
  const [mapOnly, setMapOnly] = useState(false);
  const [publishedEvent, setPublishedEvent] = useState<CityEvent | null>(null);
  const [cycling, setCycling] = useState(false);
  const [journey, setJourney] = useState<Itinerary | null>(null);
  const [transportDestination, setTransportDestination] = useState<{ lat: number; lng: number; name: string }>();
  const [routeRequest, setRouteRequest] = useState(0);
  const chooseRouteDestination = useCallback((place: { lat: number; lng: number; name: string }) => {
    setTransportDestination({ lat: place.lat, lng: place.lng, name: place.name });
    setRouteRequest(value => value + 1);
    setSelected(null);
  }, [setSelected, setTransportDestination, setRouteRequest]);
  const journeyLayer = useRef<Leaflet.LayerGroup | null>(null);
  const [satellite, setSatellite] = useState(props.initialPage !== 'transport'),
    [mapReady, setMapReady] = useState<Leaflet.Map | null>(null),
    [mobileList, setMobileList] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
      null,
    ),
    [tracking, setTracking] = useState(false),
    [locating, setLocating] = useState(false);
  const [composer, setComposer] = useState(false),
    [busy, setBusy] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null),
    [venue, setVenue] = useState("");
  const [correction, setCorrection] = useState(false),
    [comment, setComment] = useState(""),
    [suggestion, setSuggestion] = useState("");
  const mapElement = useRef<HTMLDivElement>(null),
    map = useRef<Leaflet.Map | null>(null),
    lib = useRef<typeof Leaflet | null>(null),
    tiles = useRef<Leaflet.TileLayer | null>(null),
    markers = useRef<Leaflet.LayerGroup | null>(null),
    locationMarker = useRef<Leaflet.Marker | null>(null),
    pinMarker = useRef<Leaflet.CircleMarker | null>(null);
  const currentItems = useRef<(Place | CityEvent)[]>([]);
  const composerRef = useRef(false);
  useEffect(() => {
    composerRef.current = composer;
  }, [composer]);
  const { onRequest, onLocate } = props;
  const api = useCallback(
    async <T,>(path: string, value?: object): Promise<T> => {
      const r = await onRequest(path, value ? JSON.stringify(value) : null);
      if (!r.ok) throw new Error(r.error || "Connection failed");
      return JSON.parse(r.data);
    },
    [onRequest],
  );
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(parseBootstrap(await api<unknown>("/city/bootstrap")));
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setLoading(false);
    }
  }, [api, setLoading, setError, setData]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load, props.userName]);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage?.getItem("myarad.language");
    } catch {}
    queueMicrotask(() => {
      if (saved === "en" || saved === "ro") setLang(saved);
    });
  }, []);
  useEffect(() => {
    try {
      window.localStorage?.setItem("myarad.language", lang);
    } catch {}
  }, [lang]);
  useEffect(() => {
    let cancelled = false;
    import("leaflet")
      .then((L) => {
        if (cancelled || !mapElement.current) return;
        lib.current = L;
        const m = L.map(mapElement.current, {
          center,
          zoom: 14,
          minZoom: 8,
          maxZoom: 19,
          maxBounds: bounds,
          maxBoundsViscosity: 0.8,
          zoomControl: false,
        });
        map.current = m;
        L.control.zoom({ position: "bottomright" }).addTo(m);
        L.control.scale({ position: "bottomleft", imperial: false }).addTo(m);
        markers.current = L.layerGroup().addTo(m);
        m.on("zoomend", () => { if (!cancelled) setMapZoom(m.getZoom()); });
        m.on("click", (e: Leaflet.LeafletMouseEvent) => {
          if (composerRef.current) {
            setPin({ lat: e.latlng.lat, lng: e.latlng.lng });
            return;
          }
          // A tap on the imagery selects the closest mapped place, including building footprints.
          const point = m.latLngToContainerPoint(e.latlng);
          let best: Place | CityEvent | null = null,
            dist = 36;
          for (const item of currentItems.current) {
            const d = point.distanceTo(
              m.latLngToContainerPoint([item.lat, item.lng]),
            );
            if (d < dist) {
              dist = d;
              best = item;
            }
          }
          if (best) {
            if (props.initialPage === 'transport') {
              chooseRouteDestination({ ...best, name: isEvent(best) ? best.title : best.name });
              return;
            }
            setSelected(best);
            setMobileList(false);
          }
        });
        const observer = new ResizeObserver(() => {
          if (!cancelled && mapElement.current?.clientWidth && mapElement.current.clientHeight) m.invalidateSize({ pan: false });
        });
        observer.observe(mapElement.current);
        (m as Leaflet.Map & { disposeResize?: () => void }).disposeResize =
          () => observer.disconnect();
        setMapReady(m);
      })
      .catch((e) => { if (!cancelled) setError(String(e)); });
    return () => {
      cancelled = true;
      if (map.current) {
        (
          map.current as Leaflet.Map & { disposeResize?: () => void }
        ).disposeResize?.();
        map.current.remove();
        map.current = null;
      }
      markers.current = null;
      tiles.current = null;
      journeyLayer.current = null;
      locationMarker.current = null;
      pinMarker.current = null;
    };
  }, [chooseRouteDestination, props.initialPage]);
  useEffect(() => {
    if (!mapReady || !map.current || !lib.current) return;
    tiles.current?.remove();
    tiles.current = lib.current
      .tileLayer(
        cycling
          ? "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
          : satellite
            ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution: cycling
            ? "© CyclOSM · OpenStreetMap contributors · OSM France"
            : satellite
              ? "Imagery © Esri, Vantor, Earthstar Geographics, GIS User Community"
              : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      )
      .addTo(map.current);
  }, [mapReady, satellite, cycling]);
  useEffect(() => {
    journeyLayer.current?.remove();
    journeyLayer.current = null;
    if (!journey || !mapReady || !lib.current || !map.current) return;
    const L = lib.current,
      group = L.layerGroup().addTo(map.current);
    journeyLayer.current = group;
    const points: [number, number][] = [];
    for (const leg of journey.legs) {
      if (!leg.legGeometry?.points) continue;
      const path = decodePath(leg.legGeometry.points);
      points.push(...path);
      L.polyline(path, { color: "#fff", weight: 8, opacity: 0.9 }).addTo(group);
      L.polyline(path, {
        color: routeBurgundy,
        weight: 6,
        dashArray: leg.mode === "WALK" ? "5 8" : undefined,
        opacity: 1,
      }).addTo(group);
      L.circleMarker([leg.from.lat, leg.from.lon], {
        radius: 5,
        color: routeBurgundy,
        fillColor: "#fff",
        fillOpacity: 1,
        weight: 2,
      }).addTo(group);
    }
    const last = journey.legs.at(-1);
    if (last) L.marker([last.to.lat, last.to.lon], {
      title: lang === 'ro' ? 'Destinație' : 'Destination',
      icon: L.divIcon({ className: 'route-destination-marker', html: '<span aria-hidden="true">⚑</span>', iconSize: [34, 34], iconAnchor: [17, 30] }),
      zIndexOffset: 1200,
    }).addTo(group);
    if (points.length)
      map.current.fitBounds(L.latLngBounds(points), {
        paddingTopLeft: [30, props.initialPage === 'transport' ? 155 : 65],
        paddingBottomRight: [
          30,
          window.innerWidth <= 700
            ? Math.round(props.initialPage === 'transport'
              ? document.querySelector('.transport-sidebar')?.getBoundingClientRect().height || map.current.getSize().y * 0.4
              : map.current.getSize().y * 0.57) + 20
            : 35,
        ],
        maxZoom: 16,
      });
    return () => {
      group.remove();
      if (journeyLayer.current === group) journeyLayer.current = null;
    };
  }, [journey, mapReady, lang, props.initialPage]);
  const now = new Date();
  const endToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  const endWeek = new Date(+now + 7 * 86400000);
  const items: (Place | CityEvent)[] = [...data.places, ...data.events].filter(
    (p) => {
      const event = isEvent(p);
      if (category === "events" && !event) return false;
      if (
        category !== "all" &&
        category !== "events" &&
        (event || p.category !== category)
      )
        return false;
      if (
        event &&
        dateFilter !== "anytime" &&
        new Date(p.starts_at) > (dateFilter === "today" ? endToday : endWeek)
      )
        return false;
      const synonyms: Record<string, string> = {
        cafe: "coffee cafe cafea cafenea",
        food: "restaurant food mancare pizza",
        landmark: "attraction sights atractii turism",
        park: "park parc outdoors natura",
        culture: "culture cultura arta museum muzeu",
        nightlife: "bar pub nightlife seara",
        music: "music muzica concert",
        coffee: "coffee cafea",
        art: "art arta",
        outdoors: "outdoors natura parc",
      };
      return smartSearchScore(query, event ? p.title : p.name,
        [
          event ? p.title : p.name,
          p.description,
          p.category,
          event ? p.venue : p.address,
          event ? "" : p.tags.join(" "),
          synonyms[p.category] || "",
        ].join(" "),
      ) > 0;
    },
  );
  if (props.initialPage === "events" && selected && !items.some((item) => item.id === selected.id)) items.push(selected);
  useEffect(() => {
    currentItems.current = items;
  }, [items]);
  useEffect(() => {
    const currentMap = map.current;
    const currentMarkers = markers.current;
    if (!mapReady || !currentMap || mapReady !== currentMap || !lib.current || !currentMarkers) return;
    const L = lib.current;
    currentMarkers.clearLayers();
    const grouped = new Map<string, (Place | CityEvent)[]>();
    for (const item of items) {
      const p = currentMap.project([item.lat, item.lng], mapZoom);
      const key =
        mapZoom < 17 && item.id !== selected?.id
          ? `${Math.floor(p.x / 46)}:${Math.floor(p.y / 46)}`
          : item.id;
      const list = grouped.get(key) || [];
      list.push(item);
      grouped.set(key, list);
    }
    for (const group of grouped.values()) {
      if (group.length > 1) {
        const lat = group.reduce((s, p) => s + p.lat, 0) / group.length,
          lng = group.reduce((s, p) => s + p.lng, 0) / group.length;
        L.marker([lat, lng], {
          icon: L.divIcon({
            className: "city-cluster",
            html: `<span>${group.length}</span>`,
            iconSize: [37, 37],
          }),
          title: `${group.length} places`,
        })
          .addTo(currentMarkers)
          .on("click", () => map.current?.flyTo([lat, lng], mapZoom + 2));
        continue;
      }
      const item = group[0];
      const ev = isEvent(item),
        active = item.id === selected?.id;
      const icon = L.divIcon({
        className: "city-pin-wrapper",
        html: `<div class="city-pin ${ev ? "event-pin" : ""} ${active ? "active-pin" : ""}"><span>${ev ? "♪" : item.category === "cafe" ? "☕" : item.category === "food" ? "♜" : item.category === "park" ? "♧" : "●"}</span></div>`,
        iconSize: [34, 42],
        iconAnchor: [17, 40],
      });
      const marker = L.marker([item.lat, item.lng], {
        icon,
        zIndexOffset: active ? 1000 : ev ? 300 : 0,
        keyboard: true,
        title: ev ? item.title : item.name,
      }).addTo(currentMarkers);
      marker.on("click", () => {
        if (composerRef.current) {
          setPin({ lat: item.lat, lng: item.lng });
          setVenue(ev ? item.venue : item.name);
        } else {
          if (props.initialPage === 'transport') {
            chooseRouteDestination({ ...item, name: ev ? item.title : item.name });
            return;
          }
          setSelected(item);
          setMobileList(false);
        }
      });
    }
  }, [mapReady, mapZoom, items.map((p) => p.id).join("|"), selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selected || !map.current) return;
    // Keep selection stable when Expo hides this screen during navigation.
    if (Number.isFinite(selected.lat) && Number.isFinite(selected.lng))
      map.current.setView(
        [selected.lat, selected.lng],
        Math.max(map.current.getZoom(), 16),
        { animate: false },
      );
    setDetails(null);
    setComment("");
    setCorrection(false);
    setSuggestion("");
    let cancelled = false;
    if (isEvent(selected))
      api<EventDetails>(`/city/events/${selected.id}`)
        .then((d) => {
          if (!cancelled) setDetails(d);
        })
        .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [selected, api, mapReady]);
  useEffect(() => {
    if (!position) { locationMarker.current?.remove(); locationMarker.current = null; return; }
    if (!mapReady || !lib.current || !map.current) return;
    if (locationMarker.current) locationMarker.current.setLatLng([position.lat, position.lng]);
    else locationMarker.current = lib.current.marker([position.lat, position.lng], {
      icon: lib.current.divIcon({ className: 'traveler-marker', html: travelerMarkup, iconSize: [48, 64], iconAnchor: [24, 58] }),
      title: lang === 'ro' ? 'Locația ta curentă' : 'Your current location',
      zIndexOffset: 2000,
      interactive: false,
      keyboard: false,
    }).addTo(map.current);
  }, [position, mapReady, lang]);
  const updateRoutePosition = useCallback((point: { lat: number; lng: number }) => {
    setPosition(point);
    setTracking(true);
  }, [setPosition, setTracking]);
  useEffect(() => {
    pinMarker.current?.remove();
    if (pin && lib.current && map.current)
      pinMarker.current = lib.current
        .circleMarker([pin.lat, pin.lng], {
          radius: 12,
          color: "#fff",
          weight: 3,
          fillColor: "#e8845c",
          fillOpacity: 1,
        })
        .addTo(map.current);
  }, [pin, mapReady]);
  const locate = useCallback(async () => {
    setLocating(true);
    try {
      const p = await onLocate();
      if (p.error) {
        setPosition(null);
        setNotice(locationErrorMessage(p.error, lang === 'ro'));
        setTracking(false);
        return;
      }
      setPosition(p);
      setTracking(true);
      if (p.lat >= 45.9 && p.lat <= 46.85 && p.lng >= 20.7 && p.lng <= 22.9)
        map.current?.flyTo([p.lat, p.lng], 16);
      else setNotice(t.locationOutside);
    } finally {
      setLocating(false);
    }
  }, [onLocate, t, lang]);
  useEffect(() => {
    if (!tracking) return;
    const timer = setInterval(() => {
      if (!document.hidden)
        onLocate()
          .then((p) => {
            if (!p.error) setPosition(p);
            else {
              setPosition(null);
        setNotice(locationErrorMessage(p.error, lang === 'ro'));
              setTracking(false);
            }
          })
          .catch(() => setTracking(false));
    }, 10000);
    return () => clearInterval(timer);
  }, [tracking, onLocate, t, lang]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function openComposer() {
    if (!props.userName) {
      void props.onSignIn();
      return;
    }
    setSelected(null);
    setComposer(true);
    setMapOnly(false);
    setPin(null);
    setVenue("");
    setMobileList(false);
    setNotice(t.pinHint);
  }
  async function publish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (!pin) {
      setError(t.pinHint);
      return;
    }
    const starts = new Date(String(form.get("starts_at"))),
      ends = new Date(String(form.get("ends_at")));
    if (!Number.isFinite(+starts) || !Number.isFinite(+ends)) {
      setError(t.dateError);
      return;
    }
    await action(async () => {
      const result = await api<{ event: CityEvent }>("/city/events", {
        title: form.get("title"),
        description: form.get("description"),
        category: form.get("category"),
        venue,
        lat: pin.lat,
        lng: pin.lng,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
      });
      setComposer(false);
      setPin(null);
      await load();
      setSelected(result.event);
      setPublishedEvent(result.event);
      setNotice(t.published);
    });
  }
  const date = (s: string) =>
    new Date(s).toLocaleString(lang === "ro" ? "ro-RO" : "en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  const placeName = (p: Place) =>
    lang === "en" ? p.name_en || p.name : p.name;
  const placeDescription = (p: Place) =>
    lang === "ro"
      ? p.description_ro || p.description
      : p.description_en || p.description;
  useEffect(() => {
    if (!props.initialPlaceId || loading) return;
    let active = true;
    void Promise.resolve().then(() => {
      if(!active) return;
      const place=data.places.find(p=>p.id===props.initialPlaceId || p.alias_ids?.includes(props.initialPlaceId!));
      if(place) {setSelected(place);setMobileList(false);}
    });
    return () => {active=false;};
  }, [props.initialPlaceId, loading, data.places]);
  const selectedEvent = selected && isEvent(selected) ? selected : null;
  const selectedPlace = selected && !isEvent(selected) ? selected : null;
  const label = (key: string) => (t as Record<string, string>)[key] || key;
  const drawLine = (encoded: string) => {
    if (!lib.current || !map.current) return;
    journeyLayer.current?.remove();
    const L = lib.current,
      points = decodePath(encoded);
    const group = L.layerGroup().addTo(map.current);
    journeyLayer.current = group;
    L.polyline(points, { color: "#fff", weight: 8 }).addTo(group);
    L.polyline(points, { color: routeBurgundy, weight: 6 }).addTo(group);
    if (points.length)
      map.current.fitBounds(L.latLngBounds(points), {
        paddingTopLeft: [30, 65],
        paddingBottomRight: [
          30,
          window.innerWidth <= 700
            ? Math.round(map.current.getSize().y * 0.57)
            : 35,
        ],
        maxZoom: 16,
      });
  };
  const clearJourney = () => {
    setJourney(null);
    journeyLayer.current?.remove();
    journeyLayer.current = null;
  };
  const vasilePage = props.initialPage === "vasile";
  const schedulePage = props.initialPage === "schedule";
  const socialPage = props.initialPage === 'people';
  const transportPage = props.initialPage === "transport";
  const eventsPage = props.initialPage === "events";
  return (
    <main
      data-theme={props.theme}
      className={`city-app ${mapOnly ? 'map-only' : ''} ${transportPage ? 'transport-page' : ''} ${journey ? "route-active" : ""} ${eventsPage ? "events-page" : ""} ${newsMap ? "news-map-open" : ""} ${composer ? "event-composing" : ""}`}
      onClick={(e) => {
        const a = (e.target as Element).closest("a");
        if (a && /^(https?:|tel:)/.test(a.getAttribute("href") || "")) {
          e.preventDefault();
          void action(() => props.onExternalLink(a.href));
        }
      }}
    >
      <header className="city-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setSelected(null);
            setComposer(false);
            map.current?.flyTo(center, 14);
          }}
          aria-label="MyArad"
        >
          <span className="brand-mark">
            <img src={coatOfArms.uri} alt="Stema municipiului Arad" />
          </span>
          <span>
            My<span className="brand-serif">Arad</span>
            <small>{t.about}</small>
          </span>
        </a>
        <nav className="top-nav">
          {[
            ["/map", t.explore],
            ["/transport", lang === "ro" ? "Cum ajung?" : "Get there"],
            ["/events", t.events],
            ['/people', lang === 'ro' ? 'Mesaje' : 'Messages'],
            ["/schools", lang === "ro" ? "Școli & UAV" : "Schools & UAV"],
            ["/schedule", lang === "ro" ? "Programul meu" : "My schedule"],
          ].map(([path, title]) => (
            <button
              key={path}
              className={
                "/" + (props.initialPage || "map") === path ? "nav-active" : ""
              }
              onClick={() => void props.onNavigate(path)}
            >
              {title}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          {props.calendarPlatform === 'web' && <button className="theme-toggle" title={lang === 'ro' ? 'Descarcă aplicația Android' : 'Download Android app'} aria-label={lang === 'ro' ? 'Descarcă aplicația Android' : 'Download Android app'} onClick={() => void props.onExternalLink(window.location.origin + '/download')}><span aria-hidden="true">↓</span></button>}
          {props.userName && props.isFocused !== false && <Notifications api={api} ro={lang === 'ro'} onEnablePush={props.onEnablePush} onOpen={() => void props.onNavigate('/people')} />}
          <button
            className="theme-toggle"
            aria-label={
              props.theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            title={props.theme === "dark" ? "Light mode" : "Dark mode"}
            onClick={() => void props.onToggleTheme()}
          >
            {props.theme === "dark" ? "☀" : "☾"}
          </button>
          <button
            className="language"
            onClick={() => setLang(lang === "ro" ? "en" : "ro")}
            aria-label="Change language"
          >
            <Icon name="globe" size={16} />
            {lang.toUpperCase()}
          </button>
          {props.userName ? (
            <button
              className="account"
              title={lang === "ro" ? "Programul meu" : "My schedule"}
              onClick={() => void props.onNavigate("/schedule")}
            >
              <Icon name="user" size={17} />
              <span>{props.userName.split(" ")[0]}</span>
            </button>
          ) : (
            <button className="account" onClick={() => void props.onSignIn()}>
              <Icon name="user" size={17} />
              <span>{t.signIn}</span>
            </button>
          )}
          <button className="primary add-top" onClick={openComposer}>
            <Icon name="plus" size={17} />
            {t.addEvent}
          </button>
        </div>
      </header>
      {vasilePage && <VasileView key={props.userName || "guest"} api={api} lang={lang} signedIn={!!props.userName} onSignIn={() => void props.onSignIn()} onPlace={id => void action(() => props.onNavigate("/map?place=" + encodeURIComponent(id)))} />}
      {socialPage && <SocialView active={props.isFocused !== false} api={api} lang={lang} signedIn={!!props.userName} onSignIn={() => void props.onSignIn()} onProfile={username => void props.onNavigate('/citizen/' + username)} />}
      {schedulePage && (
        <ScheduleView
          lang={lang}
          props={props}
          username={props.publicUsername}
        />
      )}
      <div
        className="city-workspace"
        style={schedulePage || socialPage || vasilePage ? { display: "none" } : undefined}
      >
        <PanelResizers onResize={() => map.current?.invalidateSize({ pan: false })} />
        <button className="mobile-map-toggle" aria-expanded={!mapOnly} onClick={event => {
          const showMap = !mapOnly;
          setMapOnly(showMap);
          setMobileList(!showMap);
          setNewsMap(showMap);
          if (showMap) {
            event.currentTarget.closest('.city-workspace')?.querySelectorAll('details[open]').forEach(menu => menu.removeAttribute('open'));
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          }
          requestAnimationFrame(() => map.current?.invalidateSize({ pan: false }));
        }}><Icon name={mapOnly ? 'search' : 'layers'} size={18} />{mapOnly ? (lang === 'ro' ? 'Deschide panoul' : 'Open panel') : (lang === 'ro' ? 'Doar harta' : 'Map only')}</button>
        {eventsPage && <EventNews publishedEvent={publishedEvent} onEventsChanged={load} calendarProps={props} request={api} events={data.events} onSelect={(place) => { setSelected(place); setNewsMap(false); setMapOnly(false); }} onCloseMap={() => { setNewsMap(true); setMapOnly(true); setTimeout(() => { map.current?.invalidateSize(); if (selected) map.current?.setView([selected.lat, selected.lng], 16); }, 50); }} onPublish={openComposer} />}
        {transportPage && (
          <aside className="transport-sidebar">
            <div className="transport-title">
              <span className="eyebrow">MYARAD / TRANSPORT</span>
              <h1>
                {lang === "ro" ? "Orașul, mai aproape." : "The city, closer."}
              </h1>
              <p>
                {lang === "ro"
                  ? "Pe jos, cu tramvaiul sau cu autobuzul."
                  : "On foot, by tram or by bus."}
              </p>
            </div>
            <Journey
              lang={lang}
              props={props}
              places={data.places}
              position={position}
              onRoute={setJourney}
              onPosition={updateRoutePosition}
              destination={transportDestination}
              routeRequest={routeRequest}
              onLine={drawLine}
            />
          </aside>
        )}
        <aside
          style={transportPage || eventsPage ? { display: "none" } : undefined}
          className={`discovery ${mobileList ? "mobile-open" : ""}`}
        >
          <div className="discovery-controls">
          <div className="discovery-heading">
            <span className="eyebrow">PE MALUL MUREȘULUI / ON THE MUREȘ</span>
            <h1>
              {t.discover}
              <span>.</span>
            </h1>
            <p>{t.subtitle}</p>
          </div>
          <label className="search-box">
            <Icon name="search" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setMobileList(true);
              }}
              placeholder={t.search}
              aria-label={t.search}
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label={t.close}>
                <Icon name="close" size={16} />
              </button>
            )}
          </label>
          <div className="filter-chips">
            {categories.filter((c) => props.initialPage !== 'schools' || c === 'all' || c === 'education').map((c) => (
              <button
                key={c}
                className={category === c ? "chip selected-chip" : "chip"}
                onClick={() => {
                  if (c === 'events') { void props.onNavigate('/events'); return; }
                  setCategory(c);
                  setSelected(null);
                }}
              >
                {c !== "all" && <Icon name={c} size={15} />} {label(c)}
              </button>
            ))}
          </div>
          </div>
          <ResultsSplitter page={props.initialPage || 'map'} />
          <div className="results-heading" style={props.initialPage === 'schools' ? { display: 'none' } : undefined}>
            <span>
              {category === "events" ? t.events : t.nearby}
              <small>
                {items.length} {t.results}
              </small>
            </span>
            {category === "events" && (
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                aria-label={t.starts}
              >
                {["anytime", "today", "week"].map((d) => (
                  <option key={d} value={d}>
                    {label(d)}
                  </option>
                ))}
              </select>
            )}
            <button
              className="mobile-close-list"
              onClick={() => setMobileList(false)}
            >
              {t.street} <Icon name="arrow" size={16} />
            </button>
          </div>
          {props.initialPage === 'schools' && <SchoolDirectory query={query} places={data.places} request={api} onSelect={(place) => { setSelected(place); setMobileList(false); }} />}
          <div className="results-list" style={props.initialPage === 'schools' ? { display: 'none' } : undefined}>
            {loading ? (
              <div className="empty-state">
                <span className="loader" />
                {t.loading}
              </div>
            ) : items.length ? (
              items.map((item) => {
                const ev = isEvent(item);
                return (
                  <button
                    key={item.id}
                    className={`place-row ${selected?.id === item.id ? "selected-row" : ""}`}
                    onClick={() => {
                      setSelected(item);
                      setMobileList(false);
                    }}
                  >
                    <span className={`place-thumb ${item.category}`}>
                      {!ev && validImageUrl(item.image) ? (
                        <img
                          src={validImageUrl(item.image)}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <Icon
                          name={ev ? "calendar" : item.category}
                          size={24}
                        />
                      )}
                    </span>
                    <span className="place-row-copy">
                      <span className="place-kind">
                        {ev ? t.event : label(item.category)}
                      </span>
                      <strong>{ev ? item.title : placeName(item)}</strong>
                      <small>
                        {ev
                          ? date(item.starts_at)
                          : item.address || "Arad, România"}
                      </small>
                      {ev && (
                        <span className="event-venue">
                          {item.venue} · {item.attending || 0} {t.attendees}
                        </span>
                      )}
                    </span>
                    <span className="row-arrow">
                      <Icon name="arrow" size={16} />
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="empty-state">
                <Icon
                  name={category === "events" ? "calendar" : "search"}
                  size={32}
                />
                <h3>
                  {category === "events" && !query ? t.noEvents : t.empty}
                </h3>
                <p>
                  {category === "events" && !query
                    ? t.noEventsHint
                    : t.suggestions}
                </p>
                {category === "events" && (
                  <button className="primary" onClick={openComposer}>
                    <Icon name="plus" size={17} />
                    {t.addEvent}
                  </button>
                )}
              </div>
            )}
          </div>
          <footer className="sidebar-footer">
            <span className="status-dot" /> {t.about}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              © OpenStreetMap
            </a>
          </footer>
        </aside>
        <section className="map-area" aria-label={t.street}>
          <div ref={mapElement} className="map-canvas" />
          {transportPage && !mapOnly && <RouteSearch places={data.places} lang={lang} onChoose={chooseRouteDestination} />}
          {transportPage && !position && <button className="route-enable-location" disabled={locating} onClick={() => void locate()}><Icon name="locate" size={18} />{locating ? (lang === 'ro' ? 'Te localizez…' : 'Locating…') : (lang === 'ro' ? 'Arată locația mea' : 'Show my location')}</button>}
          <div className="map-top-controls">
            <span className="city-label">
              <span className="status-dot" /> ARAD{" "}
              <span>46.1753° N · 21.3192° E</span>
            </span>
            <button
              className="map-button"
              onClick={() =>
                map.current?.fitBounds(bounds, { padding: [20, 20] })
              }
            >
              {lang === "ro" ? "Județul Arad" : "Arad County"}
            </button>
            <button
              className={`map-button ${cycling ? "tracking" : ""}`}
              onClick={() => setCycling(!cycling)}
            >
              ♧ {lang === "ro" ? "Bicicletă" : "Cycling"}
            </button>
            <button
              className="map-button layers-button"
              onClick={() => {
                setCycling(false);
                setSatellite(!satellite);
              }}
            >
              <Icon name="layers" size={17} />
              {satellite ? t.street : t.satellite}
            </button>
          </div>
          <button
            className={`map-button locate-button ${tracking ? "tracking" : ""}`}
            aria-label={transportPage ? (lang === 'ro' ? 'Recentrează pe locația mea' : 'Recenter on my location') : tracking ? t.stopLocation : t.locate}
            disabled={locating}
            onClick={() => {
              if (transportPage) { void locate(); return; }
              if (tracking) {
                setTracking(false);
                setNotice("");
              } else void locate();
            }}
            title={transportPage ? (lang === 'ro' ? 'Recentrează pe locația mea' : 'Recenter on my location') : tracking ? t.stopLocation : t.locate}
          >
            <Icon name="locate" />
            {transportPage ? null : locating ? "…" : tracking ? t.live : t.locate}
          </button>
          <button
            className="mobile-results primary"
            onClick={() => { setMapOnly(false); if (eventsPage) setNewsMap(false); else setMobileList(!mobileList); }}
          >
            <Icon name="search" size={17} />
            {eventsPage ? "Înapoi la știri" : mobileList ? t.street : `${items.length} ${t.results}`}
          </button>
          <button
            className="mobile-add"
            aria-label={t.addEvent}
            onClick={openComposer}
          >
            <Icon name="plus" size={23} />
          </button>
          {!mapReady && (
            <div className="map-loading">
              <span className="loader" />
              {t.loading}
            </div>
          )}
          {composer && (
            <div className="pin-banner">
              <Icon name="pin" size={16} />
              {pin ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : t.pinHint}
            </div>
          )}
        </section>
        {selected && !eventsPage && (
          <aside className="detail-panel" aria-label={t.details}>
            <button
              className="detail-close"
              onClick={() => {
                setSelected(null);
                setDetails(null);
                clearJourney();
              }}
              aria-label={t.close}
            >
              <Icon name="close" />
            </button>
            <div className={`detail-hero ${selected.category}`}>
              {selectedPlace && validImageUrl(selectedPlace.image) ? (
                <img
                  src={validImageUrl(selectedPlace.image)}
                  alt={selectedPlace.name}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="detail-illustration">
                  <Icon
                    name={selectedEvent ? "calendar" : selected.category}
                    size={60}
                  />
                  <span>{selectedEvent ? t.events : t.noPhoto}</span>
                </div>
              )}
              <span className="hero-label">
                {selectedEvent ? t.event : label(selected.category)}
              </span>
            </div>
            <ResultsSplitter page="place-details" />
            <div className="detail-body">
              <span className="eyebrow">
                ARAD · {selectedEvent ? t.events : label(selected.category)}
              </span>
              <h2>
                {selectedEvent
                  ? selectedEvent.title
                  : selectedPlace
                    ? placeName(selectedPlace)
                    : ""}
              </h2>
              <p className="detail-description">
                {(selectedPlace
                  ? placeDescription(selectedPlace)
                  : selected.description) || t.noDescription}
              </p>
              {selectedPlace?.cnipt_source && (
                <div className="cnipt-metadata">
                  {selectedPlace.cnipt_type && <span>{selectedPlace.cnipt_type}</span>}
                  {selectedPlace.cnipt_category && (
                    <span>{selectedPlace.cnipt_category}</span>
                  )}
                  {selectedPlace.locality && <span>{selectedPlace.locality}</span>}
                  {selectedPlace.municipality && <span>UAT: {selectedPlace.municipality}</span>}
                  {selectedPlace.cnipt_area && <span>{selectedPlace.cnipt_area}</span>}
                </div>
              )}
              {selectedPlace?.cnipt_photos &&
                selectedPlace.cnipt_photos.filter(validUrl).length > 1 && (
                  <div className="place-gallery" aria-label={t.photoSource}>
                    {selectedPlace.cnipt_photos
                      .filter(validUrl)
                      .slice(1, 7)
                      .map((photo, index) => (
                        <a
                          href={photo}
                          target="_blank"
                          rel="noreferrer"
                          key={`${photo}-${index}`}
                        >
                          <img
                            src={photo}
                            alt={`${placeName(selectedPlace)} ${index + 2}`}
                            loading="lazy"
                          />
                        </a>
                      ))}
                  </div>
                )}
              {selectedEvent ? (
                <>
                  <div className="info-row">
                    <Icon name="calendar" />
                    <div>
                      <strong>{date(selectedEvent.starts_at)}</strong>
                      <small>→ {date(selectedEvent.ends_at)}</small>
                    </div>
                  </div>
                  <div className="info-row">
                    <Icon name="pin" />
                    <div>
                      <strong>{selectedEvent.venue}</strong>
                      <small>
                        {t.by} {selectedEvent.author}
                      </small>
                    </div>
                  </div>
                  {details && <EventParticipants people={details.participants || []} />}
                  <button
                    className={`primary attendance ${details?.going ? "attendance-going" : ""}`}
                    disabled={busy || !details}
                    onClick={() => {
                      if (!props.userName) {
                        void props.onSignIn();
                        return;
                      }
                      void action(async () => {
                        await api(`/city/events/${selected.id}/attend`, {
                          going: !details?.going,
                        });
                        setDetails(
                          await api<EventDetails>(
                            `/city/events/${selected.id}`,
                          ),
                        );
                        await load();
                      });
                    }}
                  >
                    <Icon name="user" size={18} />
                    {details?.going ? t.notGoing : t.going}
                    <span>
                      {details?.attending ?? selectedEvent.attending ?? 0}{" "}
                      {t.attendees}
                    </span>
                  </button>
                </>
              ) : (
                <div className="place-info">
                  {[
                    ["pin", "address", selectedPlace?.address],
                    ["clock", "hours", selectedPlace?.hours],
                    ["phone", "phone", selectedPlace?.phone],
                  ]
                    .filter(([, , value]) => String(value || "").trim())
                    .map(([icon, key, value]) => (
                    <div className="info-row" key={key}>
                      <Icon name={icon || "pin"} size={19} />
                      <div>
                        <small>{label(key || "")}</small>
                        {key === "phone" ? (
                          <a href={`tel:${String(value).replace(/[^+\d;]/g, "")}`}>
                            {value}
                          </a>
                        ) : (
                          <strong>{value}</strong>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedPlace?.website &&
                    validUrl(selectedPlace.website) && (
                      <a
                        className="website-link"
                        href={validUrl(selectedPlace.website)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Icon name="globe" size={17} />
                        {t.website}
                        <Icon name="arrow" size={17} />
                      </a>
                    )}
                  {selectedPlace?.facebook && validUrl(selectedPlace.facebook) && (
                    <a
                      className="website-link"
                      href={validUrl(selectedPlace.facebook)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="globe" size={17} />
                      Facebook
                      <Icon name="arrow" size={17} />
                    </a>
                  )}
                  {selectedPlace?.cnipt_category_url &&
                    validUrl(selectedPlace.cnipt_category_url) && (
                      <a
                        className="website-link"
                        href={validUrl(selectedPlace.cnipt_category_url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Icon name="globe" size={17} />
                        {selectedPlace.cnipt_category}
                        <Icon name="arrow" size={17} />
                      </a>
                    )}
                </div>
              )}
              <AddPlan
                item={selected}
                lang={lang}
                props={props}
                onDone={() =>
                  setNotice(
                    lang === "ro"
                      ? "Adăugat în programul tău."
                      : "Added to your schedule.",
                  )
                }
              />
              <Journey
                key={selected.id}
                lang={lang}
                props={props}
                destination={{
                  lat: selected.lat,
                  lng: selected.lng,
                  name: isEvent(selected) ? selected.title : selected.name,
                }}
                places={data.places}
                position={position}
                onRoute={setJourney}
                onPosition={updateRoutePosition}
                onLine={drawLine}
              />
              {selectedPlace && (
                <>
                  <a
                    className="source-link"
                    href={selectedPlace.wiki_source || selectedPlace.source}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selectedPlace.wiki_source
                      ? "Wikipedia"
                      : selectedPlace.cnipt_source
                        ? "CNIPT Arad / visitarad.ro"
                        : t.source} ↗
                  </a>
                  {selectedPlace.image && (
                    <a
                      className="photo-credit"
                      href={
                        selectedPlace.image_source ||
                        selectedPlace.wiki_source ||
                        selectedPlace.source
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {selectedPlace.image_credit || t.photoSource}
                      {selectedPlace.image_license
                        ? ` · ${selectedPlace.image_license}`
                        : ""}{" "}
                      ↗
                    </a>
                  )}
                  {selectedPlace.retrieved_at && (
                    <small className="data-freshness">
                      {lang === "ro" ? "Date colectate" : "Data collected"}: {" "}
                      {new Date(selectedPlace.retrieved_at).toLocaleDateString(
                        lang === "ro" ? "ro-RO" : "en-GB",
                      )}
                    </small>
                  )}
                  <button
                    className="correction-link"
                    onClick={() => {
                      if (!props.userName) {
                        void props.onSignIn();
                        return;
                      }
                      setCorrection(!correction);
                    }}
                  >
                    {t.correction}
                  </button>
                  {correction && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void action(async () => {
                          await api("/city/corrections", {
                            place_id: selected.id,
                            body: suggestion,
                          });
                          setCorrection(false);
                          setSuggestion("");
                          setNotice(t.saved);
                        });
                      }}
                    >
                      <textarea
                        required
                        maxLength={2000}
                        placeholder={t.correctionHint}
                        value={suggestion}
                        onChange={(e) => setSuggestion(e.target.value)}
                      />
                      <button className="primary" disabled={busy}>
                        {t.send}
                      </button>
                    </form>
                  )}
                </>
              )}
              {selectedEvent && (
                <section className="comments">
                  <h3>
                    <Icon name="message" size={19} />
                    {t.comments}
                  </h3>
                  {details?.comments.length ? (
                    details.comments.map((c) => (
                      <article className="comment" key={c.id}>
                        <div>
                          <strong>{c.author}</strong>
                          <time>{date(c.created_at)}</time>
                        </div>
                        <p>{c.body}</p>
                      </article>
                    ))
                  ) : (
                    <p className="muted">{t.noComments}</p>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!props.userName) {
                        void props.onSignIn();
                        return;
                      }
                      void action(async () => {
                        await api(`/city/events/${selected.id}/comments`, {
                          body: comment,
                        });
                        setComment("");
                        setDetails(
                          await api<EventDetails>(
                            `/city/events/${selected.id}`,
                          ),
                        );
                      });
                    }}
                  >
                    <textarea
                      required
                      maxLength={2000}
                      placeholder={t.commentHint}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <button className="primary" disabled={busy}>
                      {props.userName ? t.send : t.signIn}
                    </button>
                  </form>
                </section>
              )}
            </div>
          </aside>
        )}
        {composer && (
          <aside className="detail-panel composer-panel">
            <div className="composer-heading">
              <span className="eyebrow">MYARAD / {t.community}</span>
              <button
                onClick={() => {
                  setComposer(false);
                  setPin(null);
                }}
                aria-label={t.close}
              >
                <Icon name="close" />
              </button>
              <h2>{t.addEvent}</h2>
              <p>{t.eventHint}</p>
            </div>
            <form className="event-form" onSubmit={publish}>
              <label>
                {t.title}
                <input
                  name="title"
                  required
                  maxLength={120}
                  placeholder={
                    lang === "ro"
                      ? "O seară de jazz în oraș"
                      : "An evening of jazz in the city"
                  }
                />
              </label>
              <label>
                {t.category}
                <select name="category">
                  {eventCategories.map((c) => (
                    <option value={c} key={c}>
                      {label(c)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.venue}
                <input
                  required
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  maxLength={200}
                  placeholder={t.selectPlace}
                />
              </label>
              <select
                aria-label={t.selectPlace}
                value=""
                onChange={(e) => {
                  const p = data.places.find((p) => p.id === e.target.value);
                  if (p) {
                    setVenue(p.name);
                    setPin({ lat: p.lat, lng: p.lng });
                    map.current?.flyTo([p.lat, p.lng], 16);
                  }
                }}
              >
                <option value="">{t.selectPlace}…</option>
                {data.places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <small className="pin-coordinates">
                <Icon name="pin" size={14} />
                {pin
                  ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`
                  : t.pinHint}
              </small>
              <div className="date-fields">
                <label>
                  {t.starts}
                  <input type="datetime-local" name="starts_at" required />
                </label>
                <label>
                  {t.ends}
                  <input type="datetime-local" name="ends_at" required />
                </label>
              </div>
              <label>
                {t.description}
                <textarea
                  required
                  name="description"
                  maxLength={3000}
                  rows={4}
                />
              </label>
              <button
                className="primary publish-button"
                disabled={busy || !pin}
              >
                {busy ? "…" : t.publish}
                <Icon name="arrow" size={17} />
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setComposer(false);
                  setPin(null);
                }}
              >
                {t.cancel}
              </button>
            </form>
          </aside>
        )}
      </div>
      {!vasilePage && !composer && <button
        className="vasile-launcher"
        aria-label={lang === "ro" ? "Vorbește cu Vasile" : "Chat with Vasile"}
        title={lang === "ro" ? "Vorbește cu Vasile" : "Chat with Vasile"}
        onClick={() => void action(() => props.onNavigate("/vasile"))}
      >
        <span className="vasile-launcher-letter" aria-hidden="true">V</span>
        <span className="vasile-launcher-name" aria-hidden="true">Vasile</span>
      </button>}
      <nav className="mobile-page-nav">
        {[
          ["/map", t.street],
          ["/transport", lang === "ro" ? "Cum ajung?" : "Directions"],
          ["/events", t.events],
          ['/people', lang === 'ro' ? 'Mesaje' : 'Messages'],
          ["/schools", lang === "ro" ? "Școli" : "Schools"],
          ["/schedule", lang === "ro" ? "Program" : "Schedule"],
        ].map(([path, title]) => (
          <button
            className={
              "/" + (props.initialPage || "map") === path ? "active" : ""
            }
            key={path}
            onClick={() => void props.onNavigate(path)}
          >
            {title}
          </button>
        ))}
      </nav>
      {(error || notice) && (
        <div
          className={`toast ${error ? "error-toast" : ""}`}
          role={error ? "alert" : "status"}
        >
          <span>{error || notice}</span>
          {error && loading === false && data.places.length === 0 && (
            <button onClick={() => void load()}>{t.retry}</button>
          )}
          <button
            onClick={() => {
              setError("");
              setNotice("");
            }}
            aria-label={t.close}
          >
            <Icon name="close" size={17} />
          </button>
        </div>
      )}
    </main>
  );
}
