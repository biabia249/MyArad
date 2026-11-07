export type TravelLeg = {
  mode: string;
  route: string;
  routeLongName?: string;
  headsign?: string;
  duration: number;
  distance: number;
  startTime: number;
  endTime: number;
  realTime: boolean;
  from: { name: string; lat: number; lon: number };
  to: { name: string; lat: number; lon: number };
  legGeometry?: { points: string };
  steps?: { distance: number; streetName: string; relativeDirection: string }[];
};
export type Itinerary = {
  duration: number;
  startTime: number;
  endTime: number;
  walkTime: number;
  transitTime: number;
  waitingTime: number;
  walkDistance: number;
  transfers: number;
  legs: TravelLeg[];
};
export type TransitStop = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};
export type TransitNetwork = {
  stops: TransitStop[];
  routes: {
    id: number;
    shortName: string;
    longName: string;
    type: number;
    color: string;
    patterns: { geometry: string; stops: number[] }[];
  }[];
  source: string;
};
export function decodePath(encoded: string): [number, number][] {
  const result: [number, number][] = [];
  let index = 0,
    lat = 0,
    lng = 0;
  while (index < encoded.length) {
    const read = () => {
      let shift = 0,
        value = 0,
        byte = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        value |= (byte & 31) << shift;
        shift += 5;
      } while (byte >= 32 && index < encoded.length);
      return value & 1 ? ~(value >> 1) : value >> 1;
    };
    lat += read();
    lng += read();
    result.push([lat / 1e5, lng / 1e5]);
  }
  return result;
}
