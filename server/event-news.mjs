import { createHash } from 'node:crypto';
import { discoverEvents, parseOfficialListing, sourceKind, officialHosts, eventPhase, searchConfigured } from './event-discovery.mjs';

const sources = [
  ['Arad Culture', 'https://aradculture.ro/category/evenimente/feed/'],
  ['Aradon', 'https://www.aradon.ro/evenimente/feed/'],
];
export const plain = (s = '') => String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 1114111))).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const safeUrl = (s) => { try { const u = new URL(s); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
const tag = (s, name) => s.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1] || '';
const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export function parseFeed(xml, source) {
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, 16).map(([, item]) => {
    const content = tag(item, 'content:encoded') || tag(item, 'description');
    const url = safeUrl(plain(tag(item, 'link')));
    const title = plain(tag(item, 'title'));
    const date = new Date(plain(tag(item, 'pubDate')));
    const image = content.match(/<img[^>]+src=["']([^"']+)/i)?.[1] || item.match(/<(?:media:content|enclosure)[^>]+url=["']([^"']+)/i)?.[1];
    return { id: createHash('sha256').update(url).digest('hex').slice(0, 20), title, url, source,
      description: plain(content).slice(0, 650), image: safeUrl(image),
      published_at: Number.isFinite(+date) ? date.toISOString() : null };
  }).filter((a) => a.url && a.title);
}
export function locateArticle(article, places) {
  const text = normalize(`${article.title} ${article.description}`);
  const matches = places.filter((p) => p.name.length >= 10 && text.includes(normalize(p.name)));
  const place = matches.sort((a, b) => b.name.length - a.name.length)[0];
  const category = /concert|muzic|jazz|filarmonic/.test(text) ? 'music' : /teatru|expoz|galeri|arta/.test(text) ? 'art' : /sport|alerg|maraton|meci/.test(text) ? 'sport' : /copii|famil|atelier/.test(text) ? 'family' : 'community';
  return { ...article, category, location: place ? { name: place.name, lat: place.lat, lng: place.lng, address: place.address } : null };
}
export function eventMetadata(html) {
  const walk = (value) => {
    if (!value || typeof value !== 'object') return null;
    if ([value['@type']].flat().some((t) => typeof t === 'string' && /Event$/.test(t))) return value;
    for (const child of Object.values(value)) {
      if (typeof child === 'object') {
        for (const v of [child].flat()) { const found = walk(v); if (found) return found; }
      }
    }
    return null;
  };
  for (const [, json] of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const event = walk(JSON.parse(json));
      if (!event) continue;
      const date = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v) && Number.isFinite(Date.parse(v)) ? v : null;
      const lat = Number(event.location?.geo?.latitude), lng = Number(event.location?.geo?.longitude);
      return { starts_at: date(event.startDate), ends_at: date(event.endDate), event_status: plain(event.eventStatus || ''),
        confirmed_location: lat >= 46.13 && lat <= 46.23 && lng >= 21.23 && lng <= 21.39 ? { name: plain(event.location.name), lat, lng, address: plain(event.location.address?.streetAddress || '') } : null };
    } catch { /* Publisher metadata may be malformed. */ }
  }
  return {};
}
export function createEventNews(send = fetch) {
  const caches = new Map(), pendingRequests = new Map();
  async function read(url, headers = {}, options = {}) {
    const response = await send(url, { ...options, headers: { Accept: 'application/rss+xml, application/json, text/html, text/xml', ...headers }, signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const value = await response.text();
    if (value.length > 3000000) throw new Error('Feed too large');
    return value;
  }
  return async (places, search = '') => {
    const query = String(search).trim().slice(0, 100);
    const key = normalize(query);
    const cache = caches.get(key);
    // Coalesce refreshes across clients; do not exhaust publishers or paid search quotas.
    if (cache && Date.now() - cache.checked < 300000) return cache.value;
    if (pendingRequests.has(key)) return pendingRequests.get(key);
    if (pendingRequests.size >= 3) return cache?.value || { articles: [], sources: [], updated_at: null, stale: true, socialEnabled: searchConfigured() };
    const pending = (async () => {
      const results = await Promise.allSettled(sources.map(async ([name, url]) => ({ name, articles: parseFeed(await read(url), name) })));
      const articles = [], status = [];
      results.forEach((r, i) => { status.push({ name: sources[i][0], ok: r.status === 'fulfilled' }); if (r.status === 'fulfilled') articles.push(...r.value.articles); });
      try {
        const official = parseOfficialListing(await read('https://www.cmcarad.ro/public/ro/evenimente'), plain);
        articles.unshift(...official);
        status.push({ name: 'CMC Arad · calendar oficial', ok: official.length > 0 });
      } catch { status.push({ name: 'CMC Arad · calendar oficial', ok: false }); }
      const discovery = await discoverEvents(read, plain, query);
      articles.push(...discovery.articles);
      status.push(...discovery.sources);
      const enrichable = articles.filter((article) => officialHosts.has(new URL(article.url).hostname) || ['aradculture.ro', 'www.aradon.ro'].includes(new URL(article.url).hostname));
      await Promise.allSettled(enrichable.slice(0, 20).map(async (article) => {
        // Only retrieve publisher pages, never arbitrary links supplied by a feed.
        const metadata = eventMetadata(await read(article.url));
        Object.assign(article, metadata);
      }));
      const unique = [...new Map(articles.map((a) => [a.url, { ...locateArticle(a, places), source_kind: a.source_kind || sourceKind(a.url), phase: eventPhase(a), ...(a.confirmed_location ? { location: a.confirmed_location } : {}) }])).values()].filter((a) => !query || normalize(`${a.title} ${a.description}`).includes(normalize(query)) || a.discovery_lane).sort((a, b) => {
        const rank = { now: 0, upcoming: 1, unconfirmed: 2, changed: 3, past: 4 };
        return rank[a.phase] - rank[b.phase] || (Date.parse(b.published_at) || 0) - (Date.parse(a.published_at) || 0);
      });
      const ok = status.some((s) => s.ok);
      const value = { articles: ok ? unique : cache?.value.articles || [], sources: status, updated_at: ok ? new Date().toISOString() : cache?.value.updated_at || null, stale: !ok, socialEnabled: searchConfigured() };
      if (caches.size >= 20 && !caches.has(key)) caches.delete(caches.keys().next().value);
      caches.set(key, { checked: Date.now(), value });
      return value;
    })().finally(() => { pendingRequests.delete(key); });
    pendingRequests.set(key, pending);
    return pending;
  };
}
