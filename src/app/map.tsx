import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import * as Location from "expo-location";
import { useAppTheme } from "@/features/app-theme";
import CityExplorer from "@/features/city/city-explorer";
import { authService } from "@/features/auth/auth-service";
import type { CityProps } from "@/features/city/types";

function reportError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  if (Platform.OS === "web") window.alert(message);
  else Alert.alert("MyArad", message);
}
async function safely(action: () => Promise<void>) {
  try {
    await action();
  } catch (e) {
    reportError(e);
  }
}
export function CityScreen({
  initialPage = "map",
  publicUsername,
}: {
  initialPage?: string;
  publicUsername?: string;
}) {
  const { theme, toggle } = useAppTheme();
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    authService
      .getProfile()
      .then((p) => setName(p?.fullName || null))
      .catch(() => {});
  }, []);
  const request = useCallback<CityProps["onRequest"]>(async (path, data) => {
    try {
      return {
        ok: true,
        data: JSON.stringify(
          await authService.cityRequest(
            path,
            data ? JSON.parse(data) : undefined,
          ),
        ),
      };
    } catch (e) {
      return {
        ok: false,
        data: "",
        error: e instanceof Error ? e.message : "Connection failed",
      };
    }
  }, []);
  const locate = useCallback<CityProps["onLocate"]>(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        return { lat: 0, lng: 0, error: "permission" };
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return { lat: position.coords.latitude, lng: position.coords.longitude };
    } catch {
      return { lat: 0, lng: 0, error: "unavailable" };
    }
  }, []);
  const directions = useCallback<CityProps["onDirections"]>(
    async (lat, lng, mode, origin) => {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${encodeURIComponent(mode)}${origin ? `&origin=${encodeURIComponent(origin)}` : ""}`;
      if (Platform.OS === "web")
        window.open(url, "_blank", "noopener,noreferrer");
      else await Linking.openURL(url);
    },
    [],
  );
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme === "dark" ? "#111925" : "#f7f8fa",
      }}
    >
      <CityExplorer
        dom={{
          useExpoDOMWebView: false,
          style: { flex: 1, width: "100%" },
          webviewDebuggingEnabled: __DEV__,
        }}
        initialPage={initialPage}
        publicUsername={publicUsername}
        onNavigate={async (path) => {
          if (
            !/^\/(map|events|schedule|schools|transport|citizen\/[a-zA-Z0-9_]+)$/.test(
              path,
            )
          )
            throw new Error("Invalid page.");
          router.push(path as Href);
        }}
        theme={theme}
        onToggleTheme={async () => toggle()}
        userName={name}
        onExternalLink={async (url) =>
          safely(async () => {
            if (!/^(https?:|tel:)/.test(url))
              throw new Error("Unsupported link.");
            if (Platform.OS === "web")
              window.open(url, "_blank", "noopener,noreferrer");
            else {
              if (!(await Linking.canOpenURL(url)))
                throw new Error("No app is available to open this link.");
              await Linking.openURL(url);
            }
          })
        }
        onRequest={request}
        onLocate={locate}
        onDirections={async (...args) => safely(() => directions(...args))}
        onSignIn={async () => router.push("/signin")}
        onSignOut={async () => {
          await authService.signOut();
          setName(null);
        }}
      />
    </SafeAreaView>
  );
}

export default function MapScreen() {
  return <CityScreen />;
}
