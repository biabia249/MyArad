import { ButtonSoundProvider } from "@/components/button-sound";
import { AppThemeProvider, useAppTheme } from "@/features/app-theme";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from 'expo-font';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { ActivityIndicator, View } from 'react-native';
import { MotionProvider, useReducedMotion } from '@/components/motion-provider';
import { palette } from '@/features/design-system';
function Layout() {
  const { theme } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, Manrope_700Bold,
  });
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme === 'dark' ? palette.night : palette.paper }}>
        <ActivityIndicator color={palette.primary} accessibilityLabel="Loading MyArad" />
      </View>
    );
  }
  return (
    <ButtonSoundProvider>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: reducedMotion ? 'none' : 'fade',
          animationDuration: 220,
          contentStyle: {
            backgroundColor: theme === "dark" ? palette.night : palette.paper,
          },
        }}
      />
    </ButtonSoundProvider>
  );
}
export default function Root() {
  return (
    <AppThemeProvider>
      <MotionProvider>
        <Layout />
      </MotionProvider>
    </AppThemeProvider>
  );
}
