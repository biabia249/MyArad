import { useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { authService, type Profile } from './auth-service';
import { AuthButton, AuthField, ui } from './auth-ui';

export function SetPasswordForm({ onSaved }: { onSaved: (profile: Profile) => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (busy) return;
    if (password.length < 8 || password.length > 128) { setError('Use a password with 8–128 characters.'); return; }
    if (password !== confirmation) { setError('Passwords do not match.'); return; }
    Keyboard.dismiss(); setBusy(true); setError('');
    try { const profile = await authService.setPassword(password); setPassword(''); setConfirmation(''); onSaved(profile); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save your password. Please try again.'); }
    finally { setBusy(false); }
  }
  return <View>
    <Text style={ui.message}>Add a MyArad password to sign in with your email as well as Google.</Text>
    <AuthField nativeID="set-password" label="New password" icon="lock" password autoCapitalize="none" autoComplete="new-password" value={password} editable={!busy} onChangeText={value => { setPassword(value); setError(''); }} />
    <AuthField nativeID="confirm-set-password" label="Confirm password" icon="lock" password autoCapitalize="none" autoComplete="new-password" value={confirmation} editable={!busy} onChangeText={value => { setConfirmation(value); setError(''); }} onSubmitEditing={save} returnKeyType="done" />
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    <AuthButton title="Set password" onPress={save} loading={busy} />
  </View>;
}
