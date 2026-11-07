import { useState } from 'react';
import { smartSearchScore } from './smart-search';
import type { Language, Place } from './types';

export function RouteSearch({ places, lang, onChoose }: {
  places: Place[];
  lang: Language;
  onChoose: (place: Place) => void;
}) {
  const ro = lang === 'ro';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [open, setOpen] = useState(false);
  const matches = places
    .filter(place => !category || place.category === category)
    .map(place => ({ place, score: smartSearchScore(query, place.name, `${place.address} ${place.tags.join(' ')}`) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  function choose(place: Place) {
    setQuery(place.name);
    setOpen(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    onChoose(place);
  }
  return <div className="route-search-overlay" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <form className="route-map-search" role="search" onSubmit={event => {
      event.preventDefault();
      if (matches[0]) choose(matches[0].place);
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6" /></svg>
      <input aria-label={ro ? 'Caută destinația pe hartă' : 'Search map destination'} placeholder={ro ? 'Unde vrei să ajungi?' : 'Where do you want to go?'} value={query} maxLength={120} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }} />
      {query && <button type="button" aria-label={ro ? 'Șterge căutarea' : 'Clear search'} onClick={() => { setQuery(''); setOpen(true); }}>×</button>}
      <button type="submit" aria-label={ro ? 'Calculează ruta către primul rezultat' : 'Route to first result'} disabled={!matches.length}>↗</button>
    </form>
    <nav className="route-quick-categories" aria-label={ro ? 'Destinații rapide' : 'Quick destinations'}>
      {[
        ['food', '♜', ro ? 'Restaurante' : 'Restaurants'],
        ['cafe', '☕', ro ? 'Cafenele' : 'Coffee'],
        ['landmark', '⌂', ro ? 'Obiective' : 'Sights'],
        ['park', '♧', ro ? 'Parcuri' : 'Parks'],
      ].map(([id, icon, label]) => <button key={id} aria-pressed={category === id} onClick={() => { setCategory(category === id ? '' : id); setQuery(''); setOpen(true); }}><span aria-hidden="true">{icon}</span>{label}</button>)}
    </nav>
    {open && <div className="route-search-results" aria-label={ro ? 'Destinații găsite' : 'Destination results'}>
      {matches.length ? matches.map(({ place }) => <button key={place.id} onClick={() => choose(place)}><span aria-hidden="true">↗</span><span><strong>{place.name}</strong><small>{place.address}</small></span></button>) : <p>{ro ? 'Niciun loc găsit. Încearcă altă căutare.' : 'No places found. Try another search.'}</p>}
      <small className="route-search-hint">{ro ? 'Alege un loc pentru ruta din locația ta.' : 'Choose a place for a route from your location.'}</small>
    </div>}
  </div>;
}
