import { isGamblingLink, isGamblingPlace } from './link-policy';
import type { Bootstrap } from './types';

export const emptyBootstrap = (): Bootstrap => ({ places: [], events: [], canPost: false, postingPolicy: 'signed-in' });
export function parseBootstrap(value: unknown): Bootstrap {
  if (!value || typeof value !== 'object' || !('places' in value) || !Array.isArray(value.places) || !('events' in value) || !Array.isArray(value.events)) {
    throw new Error('Răspuns invalid pentru hartă. Reîncearcă încărcarea datelor.');
  }
  return {
    places: value.places.map(place => {
      const cleaned = { ...place };
      for (const key of ['website', 'source', 'wiki_source', 'cnipt_source', 'image', 'image_source']) {
        if (typeof cleaned[key] === 'string' && (isGamblingLink(cleaned[key]) || (key === 'website' && isGamblingPlace(cleaned.name || '')))) cleaned[key] = '';
      }
      return cleaned;
    }),
    events: value.events,
    canPost: 'canPost' in value && value.canPost === true,
    postingPolicy: 'postingPolicy' in value && typeof value.postingPolicy === 'string' ? value.postingPolicy : 'signed-in',
  };
}
export function safeBootstrap(value: unknown): Bootstrap {
  try { return parseBootstrap(value); } catch { return emptyBootstrap(); }
}
