import { useAppTheme } from "@/features/app-theme";
import { useButtonSound } from "@/components/button-sound";
import { authService } from "@/features/auth/auth-service";
import {
  AuthButton,
  AuthField,
  AuthShell,
  Title,
  ui,
} from "@/features/auth/auth-ui";
import { validEmail } from "@/features/auth/validation";
import { Link } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

export default function ForgotPasswordScreen() {
  const { theme } = useAppTheme();
  const dark = theme === "dark";
  const playButtonSound = useButtonSound();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit() {
    if (busy) return;
    if (!validEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setMessage(await authService.resetPassword(email.trim()));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to request a reset. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell>
      <Title>Forgot password</Title>
      <Text style={[ui.message, dark && { color: "#d9e3f3" }]}>
        Enter your account email to request a password reset.
      </Text>
      <AuthField
        nativeID="reset-email"
        label="Email"
        icon="mail"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        editable={!busy}
        onChangeText={(value) => {
          setEmail(value);
          setError("");
          setMessage("");
        }}
        error={error}
        placeholder="you@example.com"
        onSubmitEditing={submit}
      />
      {!!message && (
        <Text
          accessibilityLiveRegion="polite"
          style={[ui.message, dark && { color: "#d9e3f3" }]}
        >
          {message}
        </Text>
      )}
      <View style={ui.actions}>
        <AuthButton title="Request reset" onPress={submit} loading={busy} />
        <Link
          onPress={playButtonSound}
          href="/signin"
          replace
          style={[ui.link, { textAlign: "center" }]}
        >
          Back to Sign In
        </Link>
      </View>
    </AuthShell>
  );
}
