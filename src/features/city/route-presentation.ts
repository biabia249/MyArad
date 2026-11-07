import type { Itinerary } from './transit-types';
export function routeModeName(mode: string, ro: boolean) {
  const names: Record<string, [string,string]> = { WALK:['Pe jos','Walk'], CAR:['Mașină','Car'], BICYCLE:['Bicicletă','Bicycle'], TRAM:['Tramvai','Tram'], BUS:['Autobuz','Bus'], RAIL:['Tren','Train'], SUBWAY:['Metrou','Metro'], FERRY:['Feribot','Ferry'] };
  return names[mode]?.[ro ? 0 : 1] || mode;
}
export function itineraryLabel(itinerary: Pick<Itinerary,'legs'>, ro: boolean) {
  const vehicleLegs = itinerary.legs.filter(leg => leg.mode !== 'WALK');
  return vehicleLegs.length ? vehicleLegs.map(leg => `${routeModeName(leg.mode,ro)}${leg.route ? ' '+leg.route : ''}`).join(' → ') : routeModeName('WALK',ro);
}
export function itineraryBreakdown(itinerary: Pick<Itinerary,'legs'>) {
  const times = new Map<string,number>();
  for (const leg of itinerary.legs) if (Number.isFinite(leg.duration) && leg.duration > 0) times.set(leg.mode,(times.get(leg.mode)||0)+leg.duration);
  return [...times].map(([mode,duration]) => ({mode,duration}));
}
export type TravelMode = 'walking' | 'driving' | 'bicycling' | 'transit';
export function travelModeName(mode: TravelMode, ro: boolean) {
  return ({walking:ro?'Pe jos':'Walk',driving:ro?'Mașină':'Car',bicycling:ro?'Bicicletă':'Bicycle',transit:ro?'Transport public':'Public transport'})[mode];
}
export function pickModeItinerary(itineraries: Itinerary[], mode: TravelMode) {
  const matches = itineraries.filter(i => i.legs.length > 0 && (
    mode === 'walking' ? i.legs.every(l => l.mode === 'WALK') :
    mode === 'driving' ? i.legs.some(l => l.mode === 'CAR') :
    mode === 'bicycling' ? i.legs.some(l => l.mode === 'BICYCLE') :
    i.legs.some(l => !['WALK','CAR','BICYCLE'].includes(l.mode))
  ));
  return matches.sort((a,b)=>a.endTime-b.endTime)[0];
}
