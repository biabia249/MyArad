import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Text, View } from 'react-native';
import { AuthButton, AuthField, AuthShell, GoogleButton, Title, ui } from './auth-ui';
import { authService, type Profile } from './auth-service';
import { validate, type Errors, type Values } from './validation';

const empty: Values = { fullName: '', username: '', email: '', password: '', confirmPassword: '', identifier: '' };
export default function AuthScreen({ signup = false }: { signup?: boolean }) {
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [googleBusy, setGoogleBusy] = useState(false);
  useEffect(() => {
    let mounted = true;
    authService.getProfile().then(result => { if (mounted) setProfile(result); }).catch(error => { if (mounted) setMessage(error instanceof Error ? error.message : 'Unable to restore your session.'); }).finally(() => { if (mounted) setRestoring(false); });
    return () => { mounted = false; };
  }, []);
  async function googleSignIn() {
    if (busy) return;
    Keyboard.dismiss(); setBusy(true); setGoogleBusy(true); setMessage('');
    try { const result = await authService.signInWithGoogle(); if (result) { setProfile(result); setValues(empty); } }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Google sign-in failed. Please try again.'); }
    finally { setBusy(false); setGoogleBusy(false); }
  }
  async function signOut() {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await authService.signOut(); setProfile(null); setSubmitted(false); setErrors({}); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to sign out. Please try again.'); }
    finally { setBusy(false); }
  }
  async function submit() {
    if (busy) return;
    setSubmitted(true);
    const next = validate(values, signup);
    setErrors(next); setMessage('');
    if (Object.keys(next).length) return;
    Keyboard.dismiss(); setBusy(true);
    try {
      const result = signup ? await authService.signUp({ fullName: values.fullName.trim(), username: values.username.trim(), email: values.email.trim() }, values.password) : await authService.signIn(values.identifier, values.password);
      setProfile(result); setValues(empty);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }
  const fields: { key: keyof Values; label: string; icon: 'user' | 'mail' | 'lock'; placeholder: string }[] = signup ? [
    { key: 'fullName', label: 'Full name', icon: 'user', placeholder: 'Your full name' },
    { key: 'username', label: 'Username', icon: 'user', placeholder: 'Choose a username' },
    { key: 'email', label: 'Email', icon: 'mail', placeholder: 'you@example.com' },
    { key: 'password', label: 'Password', icon: 'lock', placeholder: 'At least 8 characters' },
    { key: 'confirmPassword', label: 'Confirm password', icon: 'lock', placeholder: 'Re-enter your password' },
  ] : [
    { key: 'identifier', label: 'Username or email', icon: 'mail', placeholder: 'Your username or email' },
    { key: 'password', label: 'Password', icon: 'lock', placeholder: 'Enter your password' },
  ];
  if (restoring) return <AuthShell variant={signup ? 'signup' : 'signin'}><ActivityIndicator accessibilityLabel="Restoring your session" color="#ff8085" /></AuthShell>;
  return <AuthShell variant={signup ? 'signup' : 'signin'}>
    <Title>{profile ? (signup ? 'You’re all set' : 'Welcome back') : signup ? 'Sign up' : 'Sign in'}</Title>
    {profile ? <>
      <Text style={ui.message}>{`You’re signed in as ${profile.fullName}.`}</Text>
      {!!message && <Text accessibilityRole="alert" style={ui.error}>{message}</Text>}
      <View style={ui.actions}><AuthButton title="Sign out" onPress={signOut} loading={busy} /></View>
    </> : <>
      {fields.map(({ key, label, icon, placeholder }) => <AuthField key={key} nativeID={key} label={label} icon={icon} placeholder={placeholder} value={values[key]} error={errors[key]} editable={!busy} password={key === 'password' || key === 'confirmPassword'} autoCapitalize={key === 'fullName' ? 'words' : 'none'} keyboardType={key === 'email' ? 'email-address' : 'default'} autoComplete={key === 'fullName' ? 'name' : key === 'email' ? 'email' : key === 'username' || key === 'identifier' ? 'username' : signup ? 'new-password' : 'current-password'} returnKeyType="done" onSubmitEditing={submit} onBlur={() => setErrors(previous => ({ ...previous, [key]: validate(values, signup)[key] }))} onChangeText={value => {
        const next = { ...values, [key]: value }; setValues(next);
        if (submitted) setErrors(validate(next, signup));
        else setErrors(previous => ({ ...previous, [key]: undefined }));
        setMessage('');
      }} />)}
      {!signup && <Link href="/forgot-password" style={[ui.link, { alignSelf: 'flex-end' }]}>Forgot password?</Link>}
      {!!message && <Text accessibilityRole="alert" style={ui.error}>{message}</Text>}
      <View style={ui.actions}><AuthButton title={signup ? 'Sign Up' : 'Sign In'} onPress={submit} loading={busy} />
        <GoogleButton onPress={googleSignIn} disabled={busy} loading={googleBusy} signup={signup} />
        <View style={ui.footer}><Text style={ui.small}>{signup ? 'Already have an account?' : 'Don’t have an account?'}</Text><Link href={signup ? '/signin' : '/signup'} replace style={ui.link}>{signup ? 'Sign in' : 'Sign up'}</Link></View>
      </View>
    </>}
  </AuthShell>;
}
