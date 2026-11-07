import { useEffect, useState } from 'react';
import type { Language, Place } from './types';
import './place-favorites.css';

const storageKey = 'myarad.place-favorites.v1';
const changed = 'myarad:favorites-changed';
function readFavorites(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : [];
  } catch { return []; }
}
function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const refresh = () => setIds(readFavorites());
    queueMicrotask(refresh);
    window.addEventListener(changed, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(changed, refresh); window.removeEventListener('storage', refresh); };
  }, []);
  function toggle(id: string) {
    const current = readFavorites();
    const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id];
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setIds(next); setError(''); window.dispatchEvent(new Event(changed));
    } catch { setError('storage'); }
  }
  return { ids, toggle, error };
}

export function FavoritePlaceButton({ place, lang }: { place: Place; lang: Language }) {
  const { ids, toggle, error } = useFavorites();
  const liked = ids.includes(place.id), ro = lang === 'ro';
  return <div className="favorite-place-action">
    <button className={`favorite-place-button ${liked ? 'is-favorite' : ''}`} aria-pressed={liked} onClick={() => toggle(place.id)}><span aria-hidden="true">{liked ? '♥' : '♡'}</span>{liked ? (ro ? 'Salvat la favorite' : 'Saved to favorites') : (ro ? 'Adaugă la favorite' : 'Add to favorites')}</button>
    {error && <p role="alert">{ro ? 'Browserul nu permite salvarea. Verifică setările de stocare.' : 'Your browser blocked saving. Check storage settings.'}</p>}
  </div>;
}

export function FavoritePlaces({ places, lang, onSelect, page = false, onOpen, onBack }: { places: Place[]; lang: Language; onSelect: (place: Place) => void; page?: boolean; onOpen?: () => void; onBack?: () => void }) {
  const { ids, toggle, error } = useFavorites();
  const ro = lang === 'ro', favorites = places.filter(place => ids.includes(place.id));
  if (!page) return <div className="favorite-places-control"><button className="chip favorites-open-button" onClick={onOpen}><span aria-hidden="true">♥</span>{ro ? 'Favorite' : 'Favorites'}<span className="favorites-count">{favorites.length}</span></button></div>;
  return <section className="favorites-page favorites-dialog" aria-label={ro ? 'Locuri favorite' : 'Favorite places'}>
    <header><h1>{ro ? 'Locuri favorite' : 'Favorite places'}</h1><button onClick={onBack} aria-label={ro ? 'Inapoi la harta' : 'Back to map'}>←</button></header>
    <p className="favorites-storage-note">{ro ? 'Salvate pe acest dispozitiv.' : 'Saved on this device.'}</p>
    {error && <p role="alert">{ro ? 'Nu am putut salva modificarea.' : 'Could not save changes.'}</p>}
    {favorites.length ? <ul>{favorites.map(place => <li key={place.id}><button className="favorite-place-link" onClick={() => onSelect(place)}><span><strong>{lang === 'en' ? place.name_en || place.name : place.name}</strong><small>{place.address}</small></span><span aria-hidden="true">↗</span></button><button className="favorite-remove" aria-label={`Remove: ${place.name}`} onClick={() => toggle(place.id)}>♥</button></li>)}</ul> : <div className="favorites-empty"><h2>{ro ? 'Niciun loc salvat' : 'No saved places'}</h2><p>{ro ? 'Deschide un loc si adauga-l la favorite.' : 'Open a place and save it to favorites.'}</p></div>}
  </section>;
}
