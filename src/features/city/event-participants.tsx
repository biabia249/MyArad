import type { EventDetails } from './types';

export function EventParticipants({ people }: { people: EventDetails['participants'] }) {
  return <section className="event-participants" aria-label="Utilizatori care participă">
    <h3>Cine vine <span>{people.length}</span></h3>
    {people.length ? <ul>{people.map(person => <li key={person.username}>
      <span className="participant-avatar" aria-hidden="true">{person.fullName.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toLocaleUpperCase('ro-RO')}</span>
      <span><strong>{person.fullName}</strong><small>@{person.username}</small></span>
      <span className="participant-confirmed" aria-label="Participare confirmată">✓</span>
    </li>)}</ul> : <p>Fii primul care confirmă că vine la eveniment.</p>}
  </section>;
}
