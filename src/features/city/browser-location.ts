export type LocationResult = { lat: number; lng: number; error?: string };

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
        position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        error => resolve({ lat: 0, lng: 0, error: error.code === 1 ? 'permission' : error.code === 3 ? 'timeout' : 'unavailable' }),
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 },
      );
    } catch {
      resolve({ lat: 0, lng: 0, error: 'unavailable' });
    }
  });
}
