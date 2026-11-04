import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export const unstable_settings = { initialRouteName: 'index' };

export default function TabLayout() {
  return (
    <><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'white' } }} /></>
  );
}
