export type LocationResult = { lat: number; lng: number; accuracy?: number; error?: string };

export function locationFromCoordinates(coords: { latitude: number; longitude: number; accuracy: number | null }): LocationResult {
  const { latitude: lat, longitude: lng, accuracy } = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return { lat: 0, lng: 0, error: 'unavailable' };
  if (accuracy === null || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 500)
    return { lat, lng, accuracy: accuracy ?? undefined, error: 'imprecise' };
  return { lat, lng, accuracy };
}

export function browserLocation(context: {
  secure: boolean;
  geolocation?: Pick<Geolocation, 'getCurrentPosition'>;
}): Promise<LocationResult> {
  if (!context.secure) return Promise.resolve({ lat: 0, lng: 0, error: 'insecure' });
  if (!context.geolocation) return Promise.resolve({ lat: 0, lng: 0, error: 'unsupported' });
  return new Promise(resolve => {
    try {
      // Calling geolocation directly also supports browsers without navigator.permissions.
      context.geolocation!.getCurrentPosition(
        position => resolve(locationFromCoordinates(position.coords)),
        error => resolve({ lat: 0, lng: 0, error: error.code === 1 ? 'permission' : error.code === 3 ? 'timeout' : 'unavailable' }),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
      );
    } catch {
      resolve({ lat: 0, lng: 0, error: 'unavailable' });
    }
  });
}
