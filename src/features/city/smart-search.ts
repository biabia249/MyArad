const groups = [
  ['scoala', 'scoli', 'scolii', 'school', 'schools', 'generala', 'gimnaziala', 'gimnazial'],
  ['cafenea', 'cafenele', 'cafe', 'cafea', 'coffee'],
  ['restaurant', 'restaurante', 'mancare', 'food', 'bistro'],
  ['muzeu', 'muzee', 'muzeul', 'museum'],
  ['parc', 'parcuri', 'parcul', 'park'],
  ['concert', 'concerte', 'muzica', 'music', 'muzical'],
  ['teatru', 'teatrul', 'theatre', 'theater'],
  ['expozitie', 'expozitii', 'arta', 'art', 'galerie', 'galeria'],
  ['copii', 'copil', 'familie', 'family', 'children'],
  ['sport', 'sportiv', 'sportive', 'alergare', 'running'],
  ['eveniment', 'evenimente', 'event', 'events'],
];
const ignored = new Set(['vreau', 'caut', 'cauta', 'gaseste', 'arata', 'unde', 'este', 'sunt', 'un', 'o', 'la', 'in', 'din', 'de', 'pe', 'cu', 'si', 'pentru', 'the', 'a', 'an', 'find', 'show', 'me', 'near', 'my', 'nr', 'numarul']);
export const searchNormalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/([a-z])(\d)/g, '$1 $2').replace(/[^a-z0-9]+/g, ' ').trim();
const aliases = new Map(groups.flatMap((group) => group.map((word) => [word, group] as const)));
function distance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i), before = previous;
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], before[j - 2] + 1);
    }
    before = previous; previous = row;
  }
  return previous[b.length];
}
export function smartSearchScore(query: string, title: string, details = '') {
  const q = searchNormalize(query).slice(0, 200), name = searchNormalize(title);
  if (!q) return 1;
  if (name === q) return 100;
  if (name.includes(q)) return 90;
  const full = `${name} ${searchNormalize(details)}`;
  if (full.includes(q)) return 75;
  const tokens = q.split(' ').filter((w) => !ignored.has(w));
  if (!tokens.length) return 1;
  const words = [...new Set(full.split(' ').filter(Boolean))];
  let score = 0;
  for (const token of tokens) {
    let variants = aliases.get(token) || [token];
    if (variants.length === 1 && token.length >= 4) {
      const corrected = [...aliases.keys()].find((word) => Math.abs(word.length - token.length) <= 1 && distance(token, word) <= 1);
      if (corrected) variants = aliases.get(corrected)!;
    }
    let best = 0;
    for (const word of words) {
      if (variants.includes(word)) best = Math.max(best, 1);
      else if (token.length >= 3 && word.startsWith(token)) best = Math.max(best, .85);
      else if (token.length >= 4 && !/\d/.test(token) && !/\d/.test(word)) {
        const limit = token.length >= 8 ? 2 : 1;
        if (Math.abs(token.length - word.length) <= limit && distance(token, word) <= limit) best = Math.max(best, .7);
      }
    }
    if (!best) return 0;
    score += best;
  }
  return 40 + score / tokens.length * 25;
}
