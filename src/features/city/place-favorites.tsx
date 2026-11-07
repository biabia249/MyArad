import { useEffect, useRef, useState } from 'react';
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

export function FavoritePlaces({ places, lang, onSelect }: { places: Place[]; lang: Language; onSelect: (place: Place) => void }) {
  const { ids, toggle, error } = useFavorites();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  function close() { setOpen(false); trigger.current?.focus(); }
  const ro = lang === 'ro';
  const favorites = places.filter(place => ids.includes(place.id));
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);
  return <div className="favorite-places-control">
    <button ref={trigger} className="chip favorites-open-button" aria-expanded={open} onClick={() => setOpen(!open)}><span aria-hidden="true">♥</span>{ro ? 'Favorite' : 'Favorites'}<span className="favorites-count">{favorites.length}</span></button>
    {open && <div className="favorites-backdrop" onClick={close}><section className="favorites-dialog" role="dialog" aria-modal="true" aria-label={ro ? 'Locurile tale favorite' : 'Your favorite places'} onClick={event => event.stopPropagation()}>
      <header><div><span className="eyebrow">MYARAD / {ro ? 'COLECȚIA TA' : 'YOUR COLLECTION'}</span><h2>{ro ? 'Locuri pe care le iubești' : 'Places you love'}</h2></div><button autoFocus aria-label={ro ? 'Închide favoritele' : 'Close favorites'} onClick={close}>×</button></header>
      <p className="favorites-storage-note">{ro ? 'Salvate în acest browser sau pe acest dispozitiv.' : 'Saved in this browser or on this device.'}</p>
      {error && <p role="alert">{ro ? 'Nu am putut salva modificarea.' : 'Could not save this change.'}</p>}
      {favorites.length ? <ul>{favorites.map(place => <li key={place.id}><button className="favorite-place-link" onClick={() => { setOpen(false); onSelect(place); }}><span className="favorite-place-symbol" aria-hidden="true">♥</span><span><strong>{lang === 'en' ? place.name_en || place.name : place.name}</strong><small>{place.address}</small></span><span aria-hidden="true">↗</span></button><button className="favorite-remove" aria-label={`${ro ? 'Elimină din favorite' : 'Remove from favorites'}: ${place.name}`} onClick={() => toggle(place.id)}>♥</button></li>)}</ul> : <div className="favorites-empty"><span aria-hidden="true">♡</span><h3>{ro ? 'Începe colecția ta' : 'Start your collection'}</h3><p>{ro ? 'Deschide un loc de pe hartă sau din rezultate și apasă „Adaugă la favorite”.' : 'Open a place from the map or results and choose “Add to favorites”.'}</p></div>}
    </section></div>}
  </div>;
}
