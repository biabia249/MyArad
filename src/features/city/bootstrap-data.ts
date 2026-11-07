import type { Bootstrap } from './types';

export const emptyBootstrap = (): Bootstrap => ({ places: [], events: [], canPost: false, postingPolicy: 'signed-in' });
export function parseBootstrap(value: unknown): Bootstrap {
  if (!value || typeof value !== 'object' || !('places' in value) || !Array.isArray(value.places) || !('events' in value) || !Array.isArray(value.events)) {
    throw new Error('Răspuns invalid pentru hartă. Reîncearcă încărcarea datelor.');
  }
  return {
    places: value.places,
    events: value.events,
    canPost: 'canPost' in value && value.canPost === true,
    postingPolicy: 'postingPolicy' in value && typeof value.postingPolicy === 'string' ? value.postingPolicy : 'signed-in',
  };
}
export function safeBootstrap(value: unknown): Bootstrap {
  try { return parseBootstrap(value); } catch { return emptyBootstrap(); }
}
