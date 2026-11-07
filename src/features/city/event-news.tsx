import { useCallback, useEffect, useState } from 'react';
import type { CityEvent, Place, CityProps } from './types';
import { EventCalendarForm } from './calendar-choices';
import { smartSearchScore } from './smart-search';

type Article = {
  id: string; title: string; description: string; category: string; source: string;
  url: string; image: string; published_at: string | null; starts_at?: string | null; ends_at?: string | null;
  event_status?: string; location: { name: string; address: string; lat: number; lng: number } | null;
  phase?: string; source_kind?: string; discovery_lane?: string;
};
type Feed = { articles: Article[]; updated_at: string | null; stale: boolean; socialEnabled: boolean; sources: { name: string; ok: boolean }[] };
const categories = [['all', 'Toate'], ['music', 'Muzică'], ['art', 'Artă & teatru'], ['family', 'Familie'], ['sport', 'Sport'], ['community', 'Comunitate']];
const phaseLabels: Record<string, string> = { now: 'În desfășurare', upcoming: 'Urmează', unconfirmed: 'Program de confirmat', past: 'Încheiat', changed: 'Program modificat' };
function phaseOf(article: Article) {
  if (/Cancelled|Postponed/.test(article.event_status || '')) return 'changed';
  const start = Date.parse(article.starts_at || ''), end = Date.parse(article.ends_at || '');
  if (!Number.isFinite(start)) return 'unconfirmed';
  if (start > Date.now()) return 'upcoming';
  return Number.isFinite(end) && end > start ? end > Date.now() ? 'now' : 'past' : 'unconfirmed';
}
const fmt = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
export function EventNews({ request, events, onSelect, onCloseMap, onPublish, calendarProps }: {
  calendarProps: CityProps;
  request: <T,>(path: string) => Promise<T>; events: CityEvent[];
  onSelect: (place: Place | null) => void; onCloseMap: () => void; onPublish: () => void;
}) {
  const [feed, setFeed] = useState<Feed | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [category, setCategory] = useState('all'), [query, setQuery] = useState(''), [selected, setSelected] = useState<Article | null>(null);
  const [phase, setPhase] = useState('all'), [sourceFilter, setSourceFilter] = useState('all');
  const [searchedQuery, setSearchedQuery] = useState('');
  const refresh = useCallback(async (term = '') => {
    setBusy(true); setError('');
    try { const next = await request<Feed>(`/city/event-news?q=${encodeURIComponent(term.trim().slice(0, 100))}`); setFeed(next); setSearchedQuery(term); setSelected((old) => old ? next.articles.find((a) => a.id === old.id) || old : null); }
    catch { setError('Nu am putut actualiza știrile. Încearcă din nou.'); }
    finally { setBusy(false); }
  }, [request]);
  useEffect(() => { void Promise.resolve().then(() => refresh()); }, [refresh]);
  const local: Article[] = events.map((event) => ({ ...event, source: event.author, source_kind: 'community', url: '', image: '', published_at: null, location: { name: event.venue, address: '', lat: event.lat, lng: event.lng } }));
  const articles = [...local, ...(feed?.articles || [])].filter((a) => (category === 'all' || a.category === category) && (phase === 'all' ? phaseOf(a) !== 'past' : phaseOf(a) === phase) && (sourceFilter === 'all' || a.source_kind === sourceFilter) && (smartSearchScore(query, a.title, `${a.description} ${a.location?.name || ''}`) > 0 || (!!a.discovery_lane && searchedQuery === query)));
  function choose(article: Article) {
    setSelected(article);
    const location = article.location;
    onSelect(location ? { id: `news-${article.id}`, name: location.name, lat: location.lat, lng: location.lng, address: location.address, category: 'culture', description: article.description, source: article.url, tags: [], phone: '', website: article.url, hours: '', image: article.image, wikipedia: '' } : null);
  }
  return <aside className="event-news" aria-label="Știri și evenimente">
    {selected ? <article className="news-article">
      <button className="news-back" onClick={() => { setSelected(null); onSelect(null); }}>← Înapoi la știri</button>
      <Cover article={selected} />
      <div className="news-article-body"><span className="news-kicker">{selected.source} · {categories.find(([id]) => id === selected.category)?.[1] || 'Eveniment'}</span>
        <h1>{selected.title}</h1><span className={`news-phase phase-${phaseOf(selected)}`}>{phaseLabels[phaseOf(selected)]}</span><p className="news-date">{selected.published_at ? `Publicat ${fmt(selected.published_at)}` : 'Anunț de eveniment'}</p>
        <div className="news-schedule"><strong>Programul evenimentului</strong><p>{fmt(selected.starts_at) || 'Ora și data nu sunt confirmate în fluxul sursei.'}{selected.ends_at ? ` — ${fmt(selected.ends_at)}` : ''}</p></div>
        <h2>Ce trebuie să știi</h2><p className="news-body">{selected.description}</p>
        {selected.event_status?.includes('Cancelled') && <p role="status">Organizatorul marchează evenimentul ca anulat.</p>}
        <div className="news-schedule"><strong>Locație</strong><p>{selected.location ? `${selected.location.name} · ${selected.location.address}` : 'Locația exactă nu este confirmată. Consultă anunțul organizatorului.'}</p>
          {selected.location && <button className="news-link" onClick={onCloseMap}>Vezi pe hartă ↗</button>}</div>
        <p className="news-date">Ultima verificare: {fmt(feed?.updated_at) || 'indisponibilă'}. Programul se poate modifica.</p>
        {selected.url && <a className="news-source" href={selected.url}>Citește anunțul original ↗</a>}
        <details className="news-calendar"><summary>＋ Adaugă în calendarul meu</summary><EventCalendarForm key={selected.id} props={calendarProps} item={{ id: selected.id, title: selected.title, description: selected.description, category: selected.category, venue: selected.location?.name || '', lat: selected.location?.lat || 0, lng: selected.location?.lng || 0, starts_at: selected.starts_at || '', ends_at: selected.ends_at || '', author: selected.source }} /></details>
      </div>
    </article> : <>
      <header className="news-heading"><span className="news-kicker">MYARAD / JURNALUL ORAȘULUI</span><h1>Ce se întâmplă<span>.</span></h1><p>Locuri, oameni și experiențe de descoperit.</p></header>
      <div className="news-controls"><form className="news-search" onSubmit={(e) => { e.preventDefault(); void refresh(query); }}><span>⌕</span><input aria-label="Caută evenimente" maxLength={100} placeholder="Caută o știre, un concert, un loc…" value={query} onChange={(e) => setQuery(e.target.value)} /><button disabled={busy} type="submit">Caută</button></form>
        <div className="news-discovery-filters"><label>Când<select value={phase} onChange={(e) => setPhase(e.target.value)}><option value="all">Actuale și viitoare</option><option value="now">În desfășurare</option><option value="upcoming">Urmează</option><option value="unconfirmed">Program de confirmat</option><option value="past">Încheiate</option></select></label><label>Surse<select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}><option value="all">Toate sursele</option><option value="official">Instituții oficiale</option><option value="social">Rețele sociale</option><option value="editorial">Presă și organizatori</option><option value="community">Comunitate MyArad</option></select></label></div>
        <nav className="news-categories" aria-label="Categorii evenimente">{categories.map(([id, title]) => <button key={id} aria-pressed={category === id} className={category === id ? 'active' : ''} onClick={() => setCategory(id)}>{title}</button>)}</nav>
        <div className="news-refresh"><span>{feed?.stale ? 'Ultimele știri salvate' : `Actualizat ${fmt(feed?.updated_at) || '—'}`}</span><button disabled={busy} onClick={() => void refresh(query)}>{busy ? 'Se actualizează…' : '↻ Actualizează'}</button></div>
      </div>
      {error && <p className="news-warning" role="alert">{error}</p>}
      {feed?.stale && <p className="news-warning">Sursele nu răspund momentan. Reîncearcă actualizarea.</p>}
      <div className="news-stories"><div className="news-section-title"><h2>Ultimele știri</h2><span>{articles.length} articole</span></div>
        {busy && !feed && <p role="status">Căutăm cele mai recente anunțuri…</p>}
        {!busy && !articles.length && <div className="news-empty"><h3>Nicio știre pentru această selecție</h3><p>Încearcă altă categorie sau revino după actualizarea surselor.</p></div>}
        {articles.map((article, index) => <button className={`news-card ${index === 0 ? 'news-featured' : ''}`} key={article.id} onClick={() => choose(article)}><Cover article={article} /><div className="news-card-copy"><span className="news-kicker">{article.source}{article.source_kind === 'official' ? ' · Instituție oficială' : ''}</span><h3>{article.title}</h3><span className={`news-phase phase-${phaseOf(article)}`}>{phaseLabels[phaseOf(article)]}</span><p>{index === 0 ? article.description.slice(0, 145) : fmt(article.starts_at || article.published_at) || 'Vezi detaliile'}</p><span className="news-card-bottom">{article.location?.name || 'Detalii în anunț'} <b>↗</b></span></div></button>)}
      </div><footer className="news-footer"><button onClick={onPublish}>＋ Publică un eveniment</button><p>Surse: {feed?.sources.map((s) => `${s.name}${s.ok ? '' : ' (indisponibil)'}`).join(' · ') || 'Se conectează…'}</p>{feed && !feed.socialEnabled && <p>Căutarea publică Facebook / Instagram / TikTok nu este încă activată.</p>}</footer>
    </>}
  </aside>;
}
function Cover({ article }: { article: Article }) {
  return <div className={`news-cover news-cover-${article.category}`}>{article.image ? <img src={article.image} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <><span>ARAD</span><b>{article.category === 'music' ? '♪' : article.category === 'sport' ? '↗' : '✳'}</b><small>JURNAL CULTURAL & COMUNITATE</small></>}</div>;
}
