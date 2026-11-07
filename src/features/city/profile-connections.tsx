import { useState } from 'react';
import type { CityProps, Language } from './types';

export function ProfileConnections({ username, followers, following, props, lang }: {
  username: string; followers: number; following: number; props: CityProps; lang: Language;
}) {
  const [selected, setSelected] = useState<'followers' | 'following' | null>(null);
  const [users, setUsers] = useState<{ username: string; fullName: string; public: number }[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const ro = lang === 'ro';
  async function open(kind: 'followers' | 'following') {
    if (busy) return;
    if (selected === kind) { setSelected(null); return; }
    if (!props.userName) { await props.onSignIn(); return; }
    setSelected(kind); setUsers([]); setBusy(true); setError('');
    try {
      const response = await props.onRequest(`/city/citizens/${encodeURIComponent(username)}/${kind}`, null);
      if (!response.ok) throw Error(response.error || (ro ? 'Lista nu poate fi încărcată.' : 'Unable to load this list.'));
      setUsers(JSON.parse(response.data).users);
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }
  return <section className="profile-connections">
    <div className="connection-buttons">{(['followers', 'following'] as const).map(kind => <button key={kind} aria-expanded={selected === kind} disabled={busy} onClick={() => void open(kind)}><strong>{kind === 'followers' ? followers : following}</strong>{kind === 'followers' ? (ro ? 'Urmăritori' : 'Followers') : (ro ? 'Urmăriri' : 'Following')}</button>)}</div>
    {selected && <div className="connection-list" aria-live="polite"><h3>{selected === 'followers' ? (ro ? 'Cine te urmărește' : 'Followers') : (ro ? 'Conturi urmărite' : 'Following')}</h3>{busy ? <p>{ro ? 'Se încarcă…' : 'Loading…'}</p> : error ? <p role="alert">{error}</p> : users.length ? <ul>{users.map(person => <li key={person.username}><span><strong>{person.fullName}</strong><small>@{person.username}</small></span>{!!person.public && <button onClick={() => void props.onNavigate('/citizen/' + person.username)} aria-label={`${ro ? 'Vezi profilul' : 'View profile'} ${person.fullName}`}>↗</button>}</li>)}</ul> : <p>{ro ? 'Niciun utilizator în această listă.' : 'No users in this list yet.'}</p>}</div>}
  </section>;
}
