import { useState } from 'react';
import type { CityProps, Language } from './types';

export function ProfileConnections({ username, friends, props, lang }: {
  username: string; friends: number; props: CityProps; lang: Language;
}) {
  const [selected, setSelected] = useState(false);
  const [users, setUsers] = useState<{ username: string; fullName: string; public: number }[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const ro = lang === 'ro';
  async function open() {
    if (busy) return;
    if (selected) { setSelected(false); return; }
    if (!props.userName) { await props.onSignIn(); return; }
    setSelected(true); setUsers([]); setBusy(true); setError('');
    try {
      const response = await props.onRequest(`/city/citizens/${encodeURIComponent(username)}/friends`, null);
      if (!response.ok) throw Error(response.error || (ro ? 'Lista nu poate fi încărcată.' : 'Unable to load this list.'));
      setUsers(JSON.parse(response.data).users);
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }
  return <section className="profile-connections">
    <div className="connection-buttons"><button aria-expanded={selected} disabled={busy} onClick={() => void open()}><strong>{friends}</strong>{ro ? 'Prieteni' : 'Friends'}</button></div>
    {selected && <div className="connection-list" aria-live="polite"><h3>{ro ? 'Prieteni' : 'Friends'}</h3>{busy ? <p>{ro ? 'Se încarcă…' : 'Loading…'}</p> : error ? <p role="alert">{error}</p> : users.length ? <ul>{users.map(person => <li key={person.username}><button className="friend-profile-button" disabled={!person.public} onClick={() => void props.onNavigate('/citizen/' + person.username)} aria-label={`${ro ? 'Vezi profilul' : 'View profile'} ${person.fullName}`}><strong>{person.fullName}</strong><small>@{person.username}</small></button></li>)}</ul> : <p>{ro ? 'Niciun utilizator în această listă.' : 'No users in this list yet.'}</p>}</div>}
  </section>;
}
