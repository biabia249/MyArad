import { useLocalSearchParams } from "expo-router";
import { CityScreen } from "../map";
export default function Citizen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return <CityScreen initialPage="schedule" publicUsername={username} />;
}
