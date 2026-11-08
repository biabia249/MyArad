type EventProgram = { starts_at?: string | null; ends_at?: string | null; description?: string; title?: string; published_at?: string | null };

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
