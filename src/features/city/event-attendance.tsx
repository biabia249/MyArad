import { useEffect, useState } from 'react';
import type { CityProps, EventDetails } from './types';
import { EventParticipants } from './event-participants';

export function EventAttendance({ eventId, initialCount = 0, initialGoing = false, props, onChanged }: {
  eventId: string; initialCount?: number; initialGoing?: boolean; props: CityProps; onChanged: () => Promise<void>;
}) {
  const [status, setStatus] = useState<Pick<EventDetails, 'attending' | 'going' | 'participants'> | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const { onRequest, userName } = props;
  useEffect(() => {
    let active = true;
    void onRequest(`/city/events/${eventId}`, null).then((r) => {
      if (!active) return;
      if (!r.ok) throw new Error(r.error || 'Nu pot încărca participarea.');
      const details: EventDetails = JSON.parse(r.data);
      setStatus({ attending: details.attending, going: details.going, participants: details.participants || [] });
    }).catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [eventId, onRequest, userName]);
  async function toggle() {
    if (!props.userName) { await props.onSignIn(); return; }
    if (!status) return;
    setBusy(true); setError('');
    try {
      const response = await props.onRequest(`/city/events/${eventId}/attend`, JSON.stringify({ going: !status.going }));
      if (!response.ok) throw new Error(response.error || 'Participarea nu a putut fi salvată.');
      const refreshed = await props.onRequest(`/city/events/${eventId}`, null);
      if (!refreshed.ok) throw new Error('Participarea a fost trimisă. Reîncarcă pentru a verifica numărul.');
      const details: EventDetails = JSON.parse(refreshed.data);
      setStatus({ attending: details.attending, going: details.going, participants: details.participants || [] });
      await onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  const count = status?.attending ?? initialCount, going = status?.going ?? initialGoing;
  return <section className="event-participation"><strong aria-live="polite">{count} {count === 1 ? 'persoană merge' : 'persoane merg'}</strong><p>Participanți confirmați în MyArad</p><button type="button" className={`primary ${going ? 'attendance-going' : ''}`} aria-pressed={going} disabled={busy || (!!props.userName && !status)} onClick={() => void toggle()}>{busy ? 'Se salvează…' : !props.userName ? 'Conectează-te ca să participi' : going ? '✓ Merg · Renunță la participare' : 'Merg la eveniment'}</button><p className="participation-note">Când confirmi, numele și username-ul tău apar în lista participanților.</p>{status && <EventParticipants people={status.participants} />}{error && <p role="alert">{error}</p>}</section>;
}
