import { useLocalSearchParams } from "expo-router";
import { CityScreen } from "./map";
export default function Transport() {
  const q = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    name?: string;
  }>();
  const lat = Number(q.lat),
    lng = Number(q.lng);
  const destination =
    q.lat &&
    q.lng &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
      ? { lat, lng, name: (q.name || "Destinație").slice(0, 200) }
      : undefined;
  return (
    <CityScreen initialPage="transport" initialDestination={destination} />
  );
}
