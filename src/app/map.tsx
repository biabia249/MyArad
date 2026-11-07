import { useCallback, useRef, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import * as Location from "expo-location";
import { useAppTheme } from "@/features/app-theme";
import CityExplorer from "@/features/city/city-explorer";
import { authService } from "@/features/auth/auth-service";
import type { CityProps } from "@/features/city/types";
import { addToDeviceCalendar, shareCalendarFile } from "@/features/city/device-calendar";
import { browserLocation } from '@/features/city/browser-location';
import { withLocationDeadline } from '@/features/city/location-deadline';
import { enablePush } from '@/features/push';

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
  initialPlaceId,
}: {
  initialPage?: string;
  publicUsername?: string;
  initialPlaceId?: string;
}) {
  const { theme, toggle } = useAppTheme();
  const [name, setName] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const latestLocation = useRef<{ lat: number; lng: number } | null>(null);
  const latestLocationTime = useRef(0);
  const locationFailure = useRef('unavailable');
  const locationRefresh = useRef<Promise<void> | null>(null);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    let active = true;
    void authService
      .getProfile()
      .then((p) => { if (active) setName(p?.fullName || null); })
      .catch(() => {});
    return () => { active = false; setFocused(false); };
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
      if (Date.now() - latestLocationTime.current > 120000) latestLocation.current = null;
      if (!latestLocation.current) {
        const lastKnown = await withLocationDeadline(Location.getLastKnownPositionAsync({
          maxAge: 120_000,
          requiredAccuracy: 500,
        }), 2000).catch(() => null);
        if (lastKnown) {
          latestLocationTime.current = lastKnown.timestamp;
          latestLocation.current = {
            lat: lastKnown.coords.latitude,
            lng: lastKnown.coords.longitude,
          };
        }
      }
      if (!locationRefresh.current) {
        locationRefresh.current = withLocationDeadline(Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }), 20000)
          .then((position) => {
            latestLocationTime.current = position.timestamp;
            latestLocation.current = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
          })
          .catch((error: unknown) => {
            locationFailure.current = (error as { code?: string })?.code === 'E_LOCATION_TIMEOUT' ? 'timeout' : 'unavailable';
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
      return { lat: 0, lng: 0, error: locationFailure.current };
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
        isFocused={focused}
        onEnablePush={enablePush}
        calendarPlatform={Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web'}
        onAddToCalendar={addToDeviceCalendar}
        onShareCalendar={shareCalendarFile}
        dom={{
          style: { flex: 1, width: "100%" },
          webviewDebuggingEnabled: __DEV__,
          // SDK 58's DOM WebView injects the native bridge before page scripts.
          useExpoDOMWebView: true,
        }}
        initialPage={initialPage}
        publicUsername={publicUsername}
        initialPlaceId={initialPlaceId}
        onNavigate={async (path) => {
          const target=new URL(path,"https://myarad.local");
          if(!path.startsWith("/") || target.origin!=="https://myarad.local" || !/^\/(map|events|people|vasile|schedule|schools|transport|citizen\/[a-zA-Z0-9_]+)$/.test(target.pathname)) throw new Error("Invalid page.");
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
  const {place}=useLocalSearchParams<{place?:string}>();
  return <CityScreen initialPlaceId={typeof place === "string" ? place.slice(0,200) : undefined} />;
}
