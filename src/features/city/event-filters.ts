import { eventProgramDays, eventProgramPhase } from './event-program.ts';
export type DatedEvent = { starts_at?: string | null; ends_at?: string | null; published_at?: string | null; event_status?: string; description?: string; title?: string };
export function eventDay(value: string | number) {
  const date = new Date(value);
  if (!Number.isFinite(+date)) return '';
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function inEventRange(event: DatedEvent, from: string, to: string) {
  if (!from && !to) return true;
  const range = eventProgramDays(event);
  return !!range && (!to || range.from <= to) && (!from || range.to >= from);
}
export function compareEvents(a: DatedEvent, b: DatedEvent, now = Date.now()) {
  const rank = (event: DatedEvent) => ({ now:0, upcoming:1, unconfirmed:2, past:3, changed:4 })[eventProgramPhase(event, now)];
  const diff = rank(a) - rank(b);
  if (diff) return diff;
  if (rank(a) <= 1) return Date.parse(a.starts_at || eventProgramDays(a)?.from || '') - Date.parse(b.starts_at || eventProgramDays(b)?.from || '');
  return (Date.parse(b.published_at || '') || Date.parse(b.starts_at || '') || 0) - (Date.parse(a.published_at || '') || Date.parse(a.starts_at || '') || 0);
}
export function eventCategory(category: string, text: string) {
  if (['music', 'art', 'film', 'family', 'sport', 'outdoors', 'coffee', 'food', 'nightlife', 'education'].includes(category)) return category;
  const normalized = text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  if (/cinema|film|documentar/.test(normalized)) return 'film';
  if (/concert|muzic|jazz|festival muzical/.test(normalized)) return 'music';
  if (/expoz|galeri|teatru|vernisaj/.test(normalized)) return 'art';
  if (/sport|alerg|maraton|fotbal|meci/.test(normalized)) return 'sport';
  if (/copii|famil|copil/.test(normalized)) return 'family';
  if (/drumet|natura|aer liber/.test(normalized)) return 'outdoors';
  if (/cafea|coffee|cafenea/.test(normalized)) return 'coffee';
  return category === 'community' ? 'community' : 'other';
}
