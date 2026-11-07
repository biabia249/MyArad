import { useCallback, useEffect, useRef, useState } from "react";
import { enablePush, disablePush } from "@/features/push";
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
  initialDestination,
}: {
  initialPage?: string;
  publicUsername?: string;
  initialDestination?: { lat: number; lng: number; name: string };
}) {
  const { theme, toggle } = useAppTheme();
  const [name, setName] = useState<string | null>(null);
  const latestLocation = useRef<{ lat: number; lng: number } | null>(null);
  const locationRefresh = useRef<Promise<void> | null>(null);
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

      // iOS can take several seconds to acquire a brand-new high-accuracy fix.
      // Use a recent cached fix immediately, then improve it in the background.
      if (!latestLocation.current) {
        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 120_000,
          requiredAccuracy: 500,
        });
        if (lastKnown)
          latestLocation.current = {
            lat: lastKnown.coords.latitude,
            lng: lastKnown.coords.longitude,
          };
      }
      if (!locationRefresh.current) {
        locationRefresh.current = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
          .then((position) => {
            latestLocation.current = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
          })
          .catch(() => {
            // A cached position remains useful when a fresh GPS fix is unavailable.
          })
          .finally(() => {
            locationRefresh.current = null;
          });
      }
      if (latestLocation.current) return latestLocation.current;

      // There is no cached position yet, so wait once for the first usable fix.
      await locationRefresh.current;
      if (latestLocation.current) return latestLocation.current;
      return { lat: 0, lng: 0, error: "unavailable" };
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
          style: { flex: 1, width: "100%" },
          webviewDebuggingEnabled: __DEV__,
          // Expo's native DomWebView can try to resolve an async DOM call after
          // the view has already unmounted during navigation. The standard
          // WebView keeps the bridge alive for the complete component lifecycle.
          useExpoDOMWebView: false,
        }}
        onEnablePush={enablePush}
        initialPage={initialPage}
        publicUsername={publicUsername}
        initialDestination={initialDestination}
        onNavigate={async (path) => {
          const target = new URL(path, "https://myarad.local");
          if (
            target.origin !== "https://myarad.local" ||
            !/^\/(map|events|schedule|schools|transport|people|citizen\/[a-zA-Z0-9_]+)$/.test(
              target.pathname,
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
          await disablePush();
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
