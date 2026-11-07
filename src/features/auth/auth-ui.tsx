import { useAppTheme } from "@/features/app-theme";
import { SoundPressable as Pressable } from "@/components/sound-pressable";
import { Image } from "expo-image";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, palette } from '@/features/design-system';

export const coral = "#8E93CB";
const svg = (body: string, box: string) => ({
  uri: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${body}</svg>`)}`,
});
const contours = Array.from({ length: 15 }, (_, i) => {
  const r = 20 + i * 15;
  return `<path d="M ${185 - r} 120 C ${150 - r} ${75 - r}, ${210 + r} ${60 - r}, ${215 + r} 110 S ${230 + r} ${160 + r}, 180 ${155 + r} S ${125 - r} ${180 + r}, ${185 - r} 120 Z"/>`;
}).join("");
const pattern = svg(
  `<rect width="400" height="600" fill="${coral}"/><g fill="none" stroke="#B4BDDB" stroke-width="1.15" opacity=".7">${contours}<g transform="translate(-180 310) rotate(-30 180 120)">${contours}</g><g transform="translate(220 340)">${contours}</g></g>`,
  "0 0 400 600",
);
const wave = svg(
  '<path fill="white" d="M0 20 C90 -8 135 20 200 64 S325 129 400 88 V140 H0Z"/>',
  "0 0 400 140",
);
const icons = {
  user: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/>',
  lock: '<rect x="4" y="10" width="16" height="12" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:
    '<path d="m2 2 20 20M9 5c8-2 14 7 14 7s-1 3-5 5M5 6c-3 3-4 6-4 6s5 9 14 6"/>',
};
function Icon({ name }: { name: keyof typeof icons }) {
  return (
    <Image
      accessible={false}
      source={svg(
        `<g fill="none" stroke="#929292" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</g>`,
        "0 0 24 24",
      )}
      style={{ width: 16, height: 16 }}
    />
  );
}
export function AuthShell({
  children,
  variant = "signin",
}: {
  children: ReactNode;
  variant?: "welcome" | "signin" | "signup";
}) {
  const { theme } = useAppTheme();
  const dark = theme === "dark";
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerHeight =
    variant === "welcome"
      ? height * 0.65
      : variant === "signup"
        ? Math.min(height * 0.3, 250)
        : Math.min(height * 0.47, 410);
  return (
    <View style={[ui.screen, dark && { backgroundColor: "#10182e" }]}>
      <KeyboardAvoidingView
        style={ui.fill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          // Keep focused fields mounted while the keyboard resizes the form.
          removeClippedSubviews={false}
          contentContainerStyle={[
            ui.scroll,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View
            style={[
              ui.hero,
              { height: Math.max(headerHeight, insets.top + 100) },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Image
              source={pattern}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <Image
              source={wave}
              style={ui.wave}
              contentFit="fill"
              tintColor={dark ? "#10182e" : "#f1f3ff"}
            />
          </View>
          <View
            style={[
              ui.content,
              {
                marginTop: variant === "welcome" ? 0 : -40,
                paddingLeft: Math.max(insets.left, 20),
                paddingRight: Math.max(insets.right, 20),
              },
            ]}
          >
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
export function Title({ children }: { children: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={ui.titleWrap}>
      <Text
        accessibilityRole="header"
        style={[ui.title, theme === "dark" && { color: "#f1f3ff" }]}
      >
        {children}
      </Text>
      <View style={ui.titleLine} />
    </View>
  );
}
type FieldProps = TextInputProps & {
  label: string;
  error?: string;
  password?: boolean;
  icon?: "user" | "mail" | "lock";
};
export function AuthField({
  label,
  error,
  password,
  icon = "user",
  ...props
}: FieldProps) {
  const { theme } = useAppTheme();
  const dark = theme === "dark";
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={ui.field}>
      <Text
        nativeID={`${props.nativeID}-label`}
        style={[ui.label, dark && { color: "#f1f3ff" }]}
      >
        {label}
      </Text>
      <View
        style={[
          ui.inputRow,
          { backgroundColor: dark ? '#1b2743' : '#ffffff', borderColor: dark ? '#344568' : '#cdd2eb' },
          (focused || !!error) && { borderColor: error ? '#b52236' : coral },
        ]}
      >
        <Icon name={icon} />
        <TextInput
          {...props}
          accessibilityLabel={label}
          accessibilityHint={error}
          accessibilityLabelledBy={`${props.nativeID}-label`}
          secureTextEntry={password && !visible}
          autoCorrect={false}
          onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          placeholderTextColor={dark ? '#bac7e4' : palette.muted}
          underlineColorAndroid="transparent"
          style={[ui.input, dark && { color: "#f1f3ff" }]}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            accessibilityState={{ checked: visible }}
            onPress={() => setVisible(!visible)}
            style={ui.eye}
          >
            <Icon name={visible ? "eyeOff" : "eye"} />
          </Pressable>
        )}
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
export function AuthButton({
  title,
  onPress,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        (pressed || loading) && { opacity: 0.7 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={ui.buttonText}>{title}</Text>
      )}
    </Pressable>
  );
}
export function GoogleButton({
  onPress,
  disabled,
  loading,
  signup,
}: {
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
  signup: boolean;
}) {
  const { theme } = useAppTheme();
  const label = signup ? "Sign up with Google" : "Sign in with Google";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 50,
          borderWidth: 1,
          borderColor: theme === 'dark' ? '#344568' : '#cdd2eb',
          backgroundColor: theme === 'dark' ? '#1b2743' : '#ffffff',
          borderRadius: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          marginTop: 12,
          padding: 12,
        },
        (pressed || disabled) && { opacity: 0.65 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#454545" />
      ) : (
        <>
          <Image
            source={require("../../../assets/signup/google.svg")}
            style={{ width: 20, height: 20 }}
            accessible={false}
          />
          <Text
            style={{
              color: theme === "dark" ? "#f1f3ff" : "#3D0000",
              fontSize: 16,
              fontWeight: "600",
              fontFamily: fonts.semibold,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
export const ui = StyleSheet.create({
  fill: { flex: 1 },
  screen: { flex: 1, backgroundColor: "#f1f3ff" },
  scroll: { flexGrow: 1, width: "100%", maxWidth: 520, alignSelf: "center" },
  hero: { width: "100%", overflow: "hidden", backgroundColor: coral },
  wave: { position: "absolute", bottom: -1, width: "100%", height: 125 },
  content: { flexGrow: 1, paddingTop: 4, paddingBottom: 24 },
  titleWrap: { alignSelf: "flex-start", marginBottom: 30 },
  title: {
    color: "#3D0000",
    fontSize: 34,
    fontFamily: fonts.heading,
    fontWeight: "700",
    lineHeight: 44,
    letterSpacing: -0.7,
  },
  titleLine: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FFEB99",
    marginTop: -2,
    width: "100%",
  },
  field: { marginBottom: 16 },
  label: { color: "#3D0000", fontSize: 14, fontFamily: fonts.medium, marginBottom: 8 },
  inputRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontFamily: fonts.body,
    paddingVertical: 12,
    color: "#3D0000",
  },
  eye: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { color: "#b52236", fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 6 },
  button: {
    backgroundColor: coral,
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  buttonText: { color: palette.accent, fontSize: 16, fontFamily: fonts.semibold },
  actions: { marginTop: "auto", paddingTop: 42 },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  small: { color: palette.muted, fontSize: 14, fontFamily: fonts.body, lineHeight: 22 },
  link: {
    color: "#8E93CB",
    fontSize: 13,
    fontFamily: fonts.semibold,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  notice: { color: palette.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 8 },
  message: { color: "#3D0000", fontFamily: fonts.body, fontSize: 15, lineHeight: 24, marginBottom: 24 },
});
