export type CalendarEntry = {
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
};
export type CalendarProvider = 'device' | 'google' | 'outlook' | 'ics';

export function validateEntry(entry: CalendarEntry) {
  const start = new Date(entry.startsAt), end = new Date(entry.endsAt);
  if (!entry.title.trim() || !Number.isFinite(+start) || !Number.isFinite(+end) || end <= start)
    throw new Error('Alege o dată validă și o oră de încheiere după început.');
  return { start, end };
}
const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
export function calendarUrl(provider: 'google' | 'outlook', entry: CalendarEntry) {
  const { start, end } = validateEntry(entry);
  const url = new URL(provider === 'google' ? 'https://calendar.google.com/calendar/render' : 'https://outlook.live.com/calendar/0/deeplink/compose');
  const params = provider === 'google'
    ? { action: 'TEMPLATE', text: entry.title, dates: `${stamp(start)}/${stamp(end)}`, details: entry.description, location: entry.location, ctz: 'Europe/Bucharest' }
    : { subject: entry.title, startdt: start.toISOString(), enddt: end.toISOString(), body: entry.description, location: entry.location, path: '/calendar/action/compose', rru: 'addevent' };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.href;
}
export function calendarFile(entry: CalendarEntry) {
  const { start, end } = validateEntry(entry);
  const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  // Fold at 75 UTF-8 octets, preserving complete Unicode characters (RFC 5545).
  const fold = (line: string) => {
    let result = '', count = 0;
    for (const char of line) {
      const bytes = new TextEncoder().encode(char).length;
      if (count + bytes > 75) { result += '\r\n '; count = 1; }
      result += char; count += bytes;
    }
    return result;
  };
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@myarad.app`;
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MyArad//Events//RO', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escape(entry.title)}`, `DESCRIPTION:${escape(entry.description)}`, `LOCATION:${escape(entry.location)}`, 'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}
