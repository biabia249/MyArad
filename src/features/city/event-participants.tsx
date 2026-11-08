import { useState } from 'react';
import type { EventDetails } from './types';

function ParticipantAvatar({ person }: { person: EventDetails['participants'][number] }) {
  const [failed, setFailed] = useState(false);
  const initials = person.fullName.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toLocaleUpperCase('ro-RO');
  return <span className="participant-avatar" aria-hidden="true">{person.photo && !failed ? <img src={person.photo} alt="" onError={() => setFailed(true)} /> : initials}</span>;
}

export function EventParticipants({ people }: { people: EventDetails['participants'] }) {
  return <section className="event-participants" aria-label="Utilizatori care participă">
    <h3>Cine vine <span>{people.length}</span></h3>
    {people.length ? <ul>{people.map(person => <li key={person.username}>
      <ParticipantAvatar key={person.photo || person.username} person={person} />
      <span><strong>{person.fullName}</strong><small>@{person.username}</small></span>
      <span className="participant-confirmed" aria-label="Participare confirmată">✓</span>
    </li>)}</ul> : <p>Fii primul care confirmă că vine la eveniment.</p>}
  </section>;
}
