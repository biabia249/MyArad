type EventProgram = { starts_at?: string | null; ends_at?: string | null; description?: string; title?: string; published_at?: string | null; event_status?: string };

export function formatEventDate(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) || !Number.isFinite(Date.parse(value))) return '';
  return new Date(value).toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest', day: 'numeric', month: 'short', ...(value.includes('T') ? { hour: '2-digit', minute: '2-digit' } : {}) });
}

// Preserve the organiser's literal schedule when its feed lacks Event metadata.
// In particular, never turn the RSS publication timestamp into an event date.
export function eventProgramLabel(event: EventProgram) {
  const confirmed = formatEventDate(event.starts_at);
  if (confirmed) return confirmed;
  const day = '(?:0?[1-9]|[12]\\d|3[01])';
  const month = '(?:ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)';
  const date = `${day}(?:\\s*[-–—]\\s*${day})?\\s+${month}(?:\\s+20\\d{2})?`;
  const pattern = new RegExp(`\\b${date}(?:\\s*[-–—]\\s*${date})?(?:(?:,\\s*|\\s+ora\\s+)(?:[01]?\\d|2[0-3])[:.][0-5]\\d)?`, 'i');
  for (const source of [event.description, event.title]) {
    const match = source?.slice(0, 250).match(pattern);
    if (match) return match[0];
  }
  return '';
}

const months = ['ianuarie','februarie','martie','aprilie','mai','iunie','iulie','august','septembrie','octombrie','noiembrie','decembrie'];
export function eventProgramDays(event: EventProgram): { from: string; to: string } | null {
  const day = (value: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
  if (formatEventDate(event.starts_at)) {
    const start = Date.parse(event.starts_at!); const end = Date.parse(event.ends_at || '');
    return { from: day(start), to: day(Number.isFinite(end) && end > start ? end - 1 : start) };
  }
  // Text schedules only enter the calendar when the organiser states the year.
  const label = eventProgramLabel(event);
  const dates = [...label.matchAll(new RegExp(`(\\d{1,2})\\s+(${months.join('|')})\\s+(20\\d{2})`, 'gi'))].map(match => {
    const year = Number(match[3]), month = months.indexOf(match[2].toLowerCase()), date = Number(match[1]);
    const value = new Date(Date.UTC(year, month, date));
    return value.getUTCFullYear() === year && value.getUTCMonth() === month && value.getUTCDate() === date ? value.toISOString().slice(0,10) : '';
  });
  if (!dates[0] || dates.some(value => !value)) return null;
  const to = dates[1] || dates[0];
  return to >= dates[0] ? { from: dates[0], to } : null;
}

export function eventProgramPhase(event: EventProgram, now = Date.now()) {
  if (/Cancelled|Postponed/.test(event.event_status || '')) return 'changed';
  const start = formatEventDate(event.starts_at) ? Date.parse(event.starts_at!) : NaN;
  const end = Date.parse(event.ends_at || '');
  if (Number.isFinite(start)) {
    if (start > now) return 'upcoming';
    return Number.isFinite(end) && end > start ? end > now ? 'now' : 'past' : 'unconfirmed';
  }
  const range = eventProgramDays(event);
  if (!range) return 'unconfirmed';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/Bucharest', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date(now));
  return range.from > today ? 'upcoming' : range.to < today ? 'past' : 'now';
}
