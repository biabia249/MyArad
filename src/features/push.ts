import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { authService } from "./auth/auth-service";
let registeredToken: string | null = null;
export async function enablePush() {
  if (Platform.OS === "web")
    throw new Error(
      "Push se activează din aplicația Android/iOS, după instalarea noului build.",
    );
  if (!Device.isDevice)
    throw new Error("Testează notificările push pe un telefon fizic.");
  let Notifications: typeof import('expo-notifications');
  try { Notifications = await import('expo-notifications'); }
  catch { throw new Error('Instalează noul build Android/iOS pentru a activa notificările push.'); }
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("social", {
      name: "Prieteni și mesaje",
      importance: Notifications.AndroidImportance.HIGH,
    });
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;
  if (!projectId) throw new Error("Lipsește proiectul EAS pentru notificări.");
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted")
    permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted")
    throw new Error("Permite notificările în setările telefonului.");
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await authService.cityRequest("/city/social/push", { token, enabled: true });
  registeredToken = token;
  await SecureStore.setItemAsync("myarad.pushToken", token);
}
export async function disablePush() {
  if (Platform.OS === "web") return;
  registeredToken ||= await SecureStore.getItemAsync("myarad.pushToken");
  if (registeredToken) {
    await authService.cityRequest("/city/social/push", {
      token: registeredToken,
      enabled: false,
    });
    registeredToken = null;
    await SecureStore.deleteItemAsync("myarad.pushToken");
  }
}
