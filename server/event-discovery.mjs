import { createHash } from 'node:crypto';

export const officialHosts = new Set(['cmcarad.ro', 'www.cmcarad.ro', 'primariaarad.ro', 'www.primariaarad.ro', 'museumarad.ro', 'www.museumarad.ro', 'filarmonicaarad.ro', 'www.filarmonicaarad.ro', 'teatrulclasic.ro', 'www.teatrulclasic.ro']);
export function sourceKind(url) {
  const host = new URL(url).hostname;
  return officialHosts.has(host) ? 'official' : /(^|\.)(facebook|instagram|tiktok)\.com$/.test(host) ? 'social' : 'editorial';
}
export function eventPhase(article, now = Date.now()) {
  if (/Cancelled|Postponed|MovedOnline/.test(article.event_status || '')) return 'changed';
  const start = Date.parse(article.starts_at), end = Date.parse(article.ends_at);
  if (!Number.isFinite(start)) return 'unconfirmed';
  if (start > now) return 'upcoming';
  if (!Number.isFinite(end) || end <= start) return 'unconfirmed';
  return end > now ? 'now' : 'past';
}
export function publicArticle(url, title, description, source, plain) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') return null;
  for (const key of [...parsed.searchParams.keys()]) if (/^utm_|^fbclid$|^gclid$/.test(key)) parsed.searchParams.delete(key);
  parsed.hash = '';
  return { id: createHash('sha256').update(parsed.href).digest('hex').slice(0, 20), title: plain(title), description: plain(description).slice(0, 650), url: parsed.href, source, source_kind: sourceKind(parsed.href), image: '', published_at: null };
}
export function parseOfficialListing(html, plain) {
  const articles = new Map();
  for (const [, href, label] of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = new URL(href.replace(/&amp;/g, '&'), 'https://www.cmcarad.ro');
      if (!['www.cmcarad.ro', 'cmcarad.ro'].includes(url.hostname) || !/^\/public\/ro\/eveniment\/\d+\//.test(url.pathname)) continue;
      const title = plain(label);
      if (title.length < 15 || /^citește|^citeste|^vezi/i.test(title)) continue;
      const article = publicArticle(url.href, title, 'Anunț publicat de Centrul Municipal de Cultură Arad. Consultă sursa pentru programul complet.', 'CMC Arad', plain);
      articles.set(article.url, article);
    } catch { /* Ignore malformed publisher links. */ }
  }
  return [...articles.values()].slice(0, 12);
}
export const searchConfigured = () => !!(process.env.TAVILY_API_KEY?.trim() || process.env.BRAVE_SEARCH_API_KEY?.trim());
export async function discoverEvents(read, plain, query = '', apiKey = process.env.TAVILY_API_KEY?.trim() || process.env.BRAVE_SEARCH_API_KEY?.trim(), provider = process.env.TAVILY_API_KEY?.trim() ? 'tavily' : 'brave') {
  if (!apiKey) return { articles: [], sources: [{ name: 'Căutare web și social media', ok: false, configured: false }] };
  const date = new Date().toLocaleDateString('ro-RO', { timeZone: 'Europe/Bucharest', month: 'long', year: 'numeric' });
  // Separate discovery lanes give small organisers space alongside headline events.
  const searches = [
    ['Surse oficiale', `Arad ${query} evenimente ${date} (site:cmcarad.ro OR site:filarmonicaarad.ro OR site:teatrulclasic.ro OR site:museumarad.ro)`],
    ['Facebook / Instagram / TikTok', `Arad ${query} evenimente ${date} (site:facebook.com/events OR site:instagram.com OR site:tiktok.com)`],
    ['Ateliere și comunitate', `Arad ${query} atelier vernisaj club comunitate lansare eveniment ${date}`],
    ['Concerte și festivaluri', `Arad ${query} concert festival teatru sport bilete ${date}`],
  ];
  const articles = [], sources = [];
  // Run sequentially to avoid bursts against search providers.
  for (const [name, q] of searches) {
    try {
      const result = provider === 'tavily'
        ? JSON.parse(await read('https://api.tavily.com/search', { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, { method: 'POST', body: JSON.stringify({ query: q, search_depth: 'basic', max_results: 12, include_answer: false, include_raw_content: false, auto_parameters: false }) }))
        : JSON.parse(await read(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=12&search_lang=ro`, { 'X-Subscription-Token': apiKey }));
      let count = 0;
      for (const hit of (provider === 'tavily' ? result.results : result.web?.results) || []) {
        try {
          const article = publicArticle(hit.url, hit.title, hit.content || hit.description, new URL(hit.url).hostname.replace(/^www\./, ''), plain);
          if (!article || !/\barad\b/i.test(`${article.title} ${article.description}`)) continue;
          article.discovery_lane = name;
          articles.push(article); count++;
        } catch { /* Search results are untrusted URLs. */ }
      }
      sources.push({ name, ok: true, configured: true, provider, count });
    } catch { sources.push({ name, ok: false, configured: true, provider }); }
  }
  return { articles, sources };
}
