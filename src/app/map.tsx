import { useCallback, useRef, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, type Href } from "expo-router";
import * as Location from "expo-location";
import { useAppTheme } from "@/features/app-theme";
import CityExplorer from "@/features/city/city-explorer";
import { authService } from "@/features/auth/auth-service";
import type { CityProps } from "@/features/city/types";
import { addToDeviceCalendar, shareCalendarFile } from "@/features/city/device-calendar";
import { browserLocation } from '@/features/city/browser-location';

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
  const latestLocation = useRef<{ lat: number; lng: number } | null>(null);
  const locationRefresh = useRef<Promise<void> | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    void authService
      .getProfile()
      .then((p) => { if (active) setName(p?.fullName || null); })
      .catch(() => {});
    return () => { active = false; };
  }, []));
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
    if (Platform.OS === 'web') return browserLocation({ secure: window.isSecureContext, geolocation: navigator.geolocation });
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        if (!permission.canAskAgain) Alert.alert('Acces la locație', 'Activează locația pentru MyArad din permisiunile aplicației.', [
          { text: 'Anulează', style: 'cancel' },
          { text: 'Deschide setările', onPress: () => { void Linking.openSettings(); } },
        ]);
        return { lat: 0, lng: 0, error: permission.canAskAgain ? 'permission' : 'permission-blocked' };
      }
      if (!await Location.hasServicesEnabledAsync()) return { lat: 0, lng: 0, error: 'services-disabled' };

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
        backgroundColor: theme === "dark" ? "#10182e" : "#f1f3ff",
      }}
    >
      <CityExplorer
        calendarPlatform={Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web'}
        onAddToCalendar={addToDeviceCalendar}
        onShareCalendar={shareCalendarFile}
        dom={{
          style: { flex: 1, width: "100%" },
          webviewDebuggingEnabled: __DEV__,
          // Expo's native DomWebView can try to resolve an async DOM call after
          // the view has already unmounted during navigation. The standard
          // WebView keeps the bridge alive for the complete component lifecycle.
          useExpoDOMWebView: false,
        }}
        initialPage={initialPage}
        publicUsername={publicUsername}
        onNavigate={async (path) => {
          if (
            !/^\/(map|events|people|schedule|schools|transport|citizen\/[a-zA-Z0-9_]+)$/.test(
              path,
            )
          )
            throw new Error("Invalid page.");
          router.navigate(path as Href);
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
