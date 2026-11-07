import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Platform, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
export type AppTheme = "light" | "dark";
const Context = createContext<{ theme: AppTheme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [theme, setTheme] = useState<AppTheme>("light");
  useEffect(() => {
    let active = true;
    const read = async () => {
      let saved: string | null = null;
      try {
        saved =
          Platform.OS === "web"
            ? window.localStorage.getItem("myarad.theme")
            : await SecureStore.getItemAsync("myarad.theme");
      } catch {}
      if (active)
        setTheme(
          saved === "dark" || saved === "light"
            ? saved
            : system === "dark"
              ? "dark"
              : "light",
        );
    };
    void read();
    return () => {
      active = false;
    };
  }, [system]);
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (Platform.OS === "web") {
      try {
        window.localStorage.setItem("myarad.theme", next);
      } catch {}
    } else void SecureStore.setItemAsync("myarad.theme", next).catch(() => {});
  };
  return <Context value={{ theme, toggle }}>{children}</Context>;
}
export const useAppTheme = () => useContext(Context);
