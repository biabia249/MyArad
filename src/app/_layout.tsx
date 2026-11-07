import { ButtonSoundProvider } from "@/components/button-sound";
import { AppThemeProvider, useAppTheme } from "@/features/app-theme";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
function Layout() {
  const { theme } = useAppTheme();
  return (
    <ButtonSoundProvider>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme === "dark" ? "#111925" : "#f7f8fa",
          },
        }}
      />
    </ButtonSoundProvider>
  );
}
export default function Root() {
  return (
    <AppThemeProvider>
      <Layout />
    </AppThemeProvider>
  );
}
