import { useEffect, useState } from 'react';
import { smartSearchScore } from './smart-search';
import type { Place } from './types';

type School = { id: string; name: string; short_name: string; locality: string; address: string; phone: string; parent_name: string; source: string; mapped_place_id?: string };
type Catalog = { total: number; mapped: number; school_year: string; schools: School[] };
export function SchoolDirectory({ query, places, request, onSelect }: { query: string; places: Place[]; request: <T,>(path: string) => Promise<T>; onSelect: (place: Place) => void }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null), [error, setError] = useState('');
  const [locality, setLocality] = useState(''), [expanded, setExpanded] = useState(''), [limit, setLimit] = useState(50);
  const load = () => { setError(''); void request<Catalog>('/city/schools').then(setCatalog).catch(() => setError('Registrul școlar nu poate fi încărcat.')); };
  useEffect(() => {
    let active = true;
    void request<Catalog>('/city/schools').then((data) => { if (active) setCatalog(data); }).catch(() => { if (active) setError('Registrul școlar nu poate fi încărcat.'); });
    return () => { active = false; };
  }, [request]);
  const matches = (catalog?.schools || []).map((school) => ({ school, score: smartSearchScore(query, school.name, `${school.short_name} ${school.locality} ${school.address} ${school.id} ${places.find((p) => p.id === school.mapped_place_id)?.tags.join(' ') || ''}`) })).filter(({ school, score }) => score > 0 && (!locality || school.locality === locality)).sort((a, b) => b.score - a.score || a.school.locality.localeCompare(b.school.locality, 'ro') || a.school.name.localeCompare(b.school.name, 'ro'));
  const universities = places.filter((p) => p.category === 'education' && /universitat/i.test(p.name) && (!locality || locality === 'ARAD') && smartSearchScore(query, p.name, p.address) > 0);
  return <section className="school-directory results-list" aria-label="Registrul școlar al județului Arad">
    <div className="school-coverage"><strong>Rețeaua școlară · județul Arad</strong><p>{catalog ? `${catalog.total} unități în registrul oficial ${catalog.school_year}. ${catalog.mapped} corelate cu un punct pe hartă.` : 'Se încarcă registrul oficial…'}</p><p>Include școli, licee, grădinițe și structuri arondate. Pozițiile neconfirmate sunt indicate separat. Sursa disponibilă este din 2025–2026; reorganizările ulterioare pot modifica denumirile.</p>
      <label>Localitate<select value={locality} onChange={(e) => { setLocality(e.target.value); setLimit(50); }}><option value="">Toate localitățile</option>{[...new Set(catalog?.schools.map((s) => s.locality) || [])].sort((a, b) => a.localeCompare(b, 'ro')).map((name) => <option key={name}>{name}</option>)}</select></label>
      <small>{matches.length} rezultate</small>
    </div>
    {error && <p role="alert">{error} <button onClick={load}>Reîncearcă</button></p>}
    {universities.length > 0 && <div className="school-coverage"><strong>Universități · învățământ superior</strong>{universities.map((place) => <button key={place.id} className="school-entry-button" onClick={() => onSelect(place)}><strong>{place.name}</strong><small>{place.address}</small></button>)}</div>}
    {matches.slice(0, limit).map(({ school }) => <article className="school-entry" key={school.id}>
      <button className="school-entry-button" onClick={() => { const place = places.find((p) => p.id === school.mapped_place_id); if (place) onSelect(place); setExpanded(expanded === school.id ? '' : school.id); }}><span className="place-kind">{school.locality} · {school.mapped_place_id ? 'Pe hartă' : 'Poziție neconfirmată'}</span><strong>{school.name}</strong><small>{school.address}</small></button>
      {expanded === school.id && <div className="school-entry-details"><p>Cod SIIIR: {school.id}</p><p>Unitate coordonatoare: {school.parent_name}</p>{!school.mapped_place_id && <p>Școala există în registrul oficial. Coordonatele nu sunt confirmate, de aceea nu afișăm un marcaj aproximativ.</p>}{school.phone && <a href={`tel:${school.phone}`}>{school.phone}</a>}<a href={school.source}>Registrul oficial ↗</a><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${school.name}, ${school.address}, România`)}`}>Caută adresa în Google Maps ↗</a></div>}
    </article>)}
    {catalog && !matches.length && <p className="empty-state">Nu am găsit unități pentru această căutare.</p>}
    {matches.length > limit && <button className="secondary" onClick={() => setLimit(limit + 50)}>Arată încă 50</button>}
  </section>;
}
