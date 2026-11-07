import { useState } from 'react';
import { calendarFile, calendarUrl, validateEntry, type CalendarProvider } from './calendar-export';
import type { CityProps, CityEvent, Place, Language } from './types';

export function CalendarChoices({ item, props, lang }: { item: Place | CityEvent; props: CityProps; lang: Language }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const ro = lang === 'ro';
  async function exportTo(provider: CalendarProvider, button: HTMLButtonElement) {
    const form = button.closest('form');
    if (!form || !form.reportValidity()) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const data = new FormData(form);
      const entry = {
        title: 'title' in item ? item.title : item.name,
        description: item.description,
        location: 'venue' in item ? item.venue : `${item.name}${item.address ? ` · ${item.address}` : ''}`,
        startsAt: new Date(String(data.get('start'))).toISOString(),
        endsAt: new Date(String(data.get('end'))).toISOString(),
      };
      validateEntry(entry);
      if (provider === 'device') {
        const result = await props.onAddToCalendar(entry);
        setMessage(result === 'saved' ? (ro ? 'Eveniment salvat în calendar.' : 'Event saved to calendar.') : result === 'canceled' ? (ro ? 'Adăugare anulată.' : 'Canceled.') : (ro ? 'Verifică în calendar dacă ai confirmat salvarea evenimentului.' : 'Check your calendar to confirm the event was saved.'));
      } else if (provider === 'ics') {
        if (props.calendarPlatform !== 'web') {
          await props.onShareCalendar(entry);
          setMessage(ro ? 'Alege aplicația de calendar sau salvează fișierul .ics din meniul telefonului.' : 'Choose your calendar app or save the .ics file from the phone share menu.');
          return;
        }
        const url = URL.createObjectURL(new Blob([calendarFile(entry)], { type: 'text/calendar;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = 'myarad-event.ics';
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        setMessage(ro ? 'Deschide fișierul .ics și confirmă importul în calendarul tău.' : 'Open the .ics file and confirm the import in your calendar.');
      } else {
        await props.onExternalLink(calendarUrl(provider, entry));
        setMessage(ro ? 'Conectează-te în calendarul deschis, alege contul și apasă Salvează. Evenimentul este precompletat.' : 'Sign in to your calendar, choose an account and save the prefilled event.');
      }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  const providers: [CalendarProvider, string, string][] = [
    ...(props.calendarPlatform && props.calendarPlatform !== 'web' ? [['device', props.calendarPlatform === 'ios' ? 'Apple Calendar / iCloud' : 'Calendar Android', ro ? 'Alege un calendar configurat pe telefon' : 'Choose a calendar set up on your phone'] as [CalendarProvider, string, string]] : []),
    ['google', 'Google Calendar', ro ? 'Cont Google personal sau Workspace' : 'Personal Google or Workspace account'],
    ['outlook', 'Outlook Calendar', ro ? 'Cont Microsoft / Outlook.com' : 'Microsoft / Outlook.com account'],
    ['ics', ro ? 'Alte calendare (.ics)' : 'Other calendars (.ics)', props.calendarPlatform === 'web' ? 'Apple Calendar · Thunderbird · Outlook' : (ro ? 'Partajează sau salvează fișierul pe telefon' : 'Share or save the file on your phone')],
  ];
  return <fieldset className="calendar-choices"><legend>{ro ? 'Sau adaugă în calendarul personal' : 'Or add to your personal calendar'}</legend>
    <p className="calendar-help">{ro ? 'Confirmă data și ora de mai sus, apoi alege calendarul. Orele sunt afișate în fusul orar al dispozitivului.' : 'Confirm the date and time above, then choose a calendar. Times use your device timezone.'}</p>
    {providers.map(([id, name, hint]) => <button key={id} type="button" className="calendar-choice" disabled={busy} onClick={(e) => void exportTo(id, e.currentTarget)}><span><strong>{name}</strong><small>{hint}</small></span><span aria-hidden="true">↗</span></button>)}
    <p className="calendar-help">{ro ? 'Salvarea se confirmă în aplicația aleasă. Modificările ulterioare ale evenimentului nu se sincronizează automat.' : 'Confirm saving in the selected app. Later event changes do not sync automatically.'}</p>
    {busy && <p role="status">{ro ? 'Se deschide calendarul…' : 'Opening calendar…'}</p>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </fieldset>;
}

export function EventCalendarForm({ item, props }: { item: CityEvent; props: CityProps }) {
  const local = (value: string) => {
    const d = new Date(value);
    return Number.isFinite(+d) ? new Date(+d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  };
  return <form className="add-plan news-calendar-form" onSubmit={(e) => e.preventDefault()}>
    <label>Început<input type="datetime-local" name="start" required defaultValue={local(item.starts_at)} /></label>
    <label>Încheiere<input type="datetime-local" name="end" required defaultValue={local(item.ends_at)} /></label>
    <CalendarChoices item={item} props={props} lang="ro" />
  </form>;
}
