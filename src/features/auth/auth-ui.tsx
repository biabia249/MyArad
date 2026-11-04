import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const coral = '#ff8085';
const svg = (body: string, box: string) => ({ uri: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${body}</svg>`)}` });
const contours = Array.from({ length: 15 }, (_, i) => {
  const r = 20 + i * 15;
  return `<path d="M ${185-r} 120 C ${150-r} ${75-r}, ${210+r} ${60-r}, ${215+r} 110 S ${230+r} ${160+r}, 180 ${155+r} S ${125-r} ${180+r}, ${185-r} 120 Z"/>`;
}).join('');
const pattern = svg(`<rect width="400" height="600" fill="${coral}"/><g fill="none" stroke="#ffb0b2" stroke-width="1.15" opacity=".7">${contours}<g transform="translate(-180 310) rotate(-30 180 120)">${contours}</g><g transform="translate(220 340)">${contours}</g></g>`, '0 0 400 600');
const wave = svg('<path fill="white" d="M0 20 C90 -8 135 20 200 64 S325 129 400 88 V140 H0Z"/>', '0 0 400 140');
const icons = {
  user: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/>',
  lock: '<rect x="4" y="10" width="16" height="12" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="m2 2 20 20M9 5c8-2 14 7 14 7s-1 3-5 5M5 6c-3 3-4 6-4 6s5 9 14 6"/>',
};
function Icon({ name }: { name: keyof typeof icons }) {
  return <Image accessible={false} source={svg(`<g fill="none" stroke="#929292" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</g>`, '0 0 24 24')} style={{ width: 16, height: 16 }} />;
}
export function AuthShell({ children, variant = 'signin' }: { children: ReactNode; variant?: 'welcome' | 'signin' | 'signup' }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerHeight = variant === 'welcome' ? height * .65 : variant === 'signup' ? Math.min(height * .30, 250) : Math.min(height * .47, 410);
  return <View style={ui.screen}><KeyboardAvoidingView style={ui.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[ui.scroll, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={[ui.hero, { height: Math.max(headerHeight, insets.top + 100) }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Image source={pattern} style={StyleSheet.absoluteFill} contentFit="cover" />
        <Image source={wave} style={ui.wave} contentFit="fill" />
      </View>
      <View style={[ui.content, { marginTop: variant === 'welcome' ? 0 : -40, paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]}>{children}</View>
    </ScrollView>
  </KeyboardAvoidingView></View>;
}
export function Title({ children }: { children: string }) {
  return <View style={ui.titleWrap}><Text accessibilityRole="header" style={ui.title}>{children}</Text><View style={ui.titleLine} /></View>;
}
type FieldProps = TextInputProps & { label: string; error?: string; password?: boolean; icon?: 'user' | 'mail' | 'lock' };
export function AuthField({ label, error, password, icon = 'user', ...props }: FieldProps) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return <View style={ui.field}><Text nativeID={`${props.nativeID}-label`} style={ui.label}>{label}</Text>
    <View style={[ui.inputRow, (focused || !!error) && { borderBottomColor: error ? '#b52236' : coral }]}><Icon name={icon} />
      <TextInput {...props} accessibilityLabel={label} accessibilityHint={error} accessibilityLabelledBy={`${props.nativeID}-label`} secureTextEntry={password && !visible} autoCorrect={false} onFocus={() => setFocused(true)} onBlur={event => { setFocused(false); props.onBlur?.(event); }} placeholderTextColor="#a0a0a0" underlineColorAndroid="transparent" style={ui.input} />
      {password && <Pressable accessibilityRole="button" accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} accessibilityState={{ checked: visible }} onPress={() => setVisible(!visible)} style={ui.eye}><Icon name={visible ? 'eyeOff' : 'eye'} /></Pressable>}
    </View>{!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}</View>;
}
export function AuthButton({ title, onPress, loading = false }: { title: string; onPress: () => void; loading?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={onPress} style={({ pressed }) => [ui.button, (pressed || loading) && { opacity: .7 }]}>{loading ? <ActivityIndicator color="white" /> : <Text style={ui.buttonText}>{title}</Text>}</Pressable>;
}
export function GoogleButton({ onPress, disabled, loading, signup }: { onPress: () => void; disabled: boolean; loading: boolean; signup: boolean }) {
  const label = signup ? 'Sign up with Google' : 'Sign in with Google';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy: loading }} disabled={disabled} onPress={onPress} style={({ pressed }) => [{ minHeight: 50, borderWidth: 1, borderColor: '#dadce0', borderRadius: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12, padding: 12 }, (pressed || disabled) && { opacity: .65 }]}>
    {loading ? <ActivityIndicator color="#454545" /> : <><Image source={require('../../../assets/signup/google.svg')} style={{ width: 20, height: 20 }} accessible={false} /><Text style={{ color: '#454545', fontSize: 16, fontWeight: '600' }}>{label}</Text></>}
  </Pressable>;
}
export const ui = StyleSheet.create({
  fill: { flex: 1 }, screen: { flex: 1, backgroundColor: 'white' }, scroll: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center' },
  hero: { width: '100%', overflow: 'hidden', backgroundColor: coral }, wave: { position: 'absolute', bottom: -1, width: '100%', height: 125 },
  content: { flexGrow: 1, paddingTop: 4 }, titleWrap: { alignSelf: 'flex-start', marginBottom: 30 }, title: { color: '#454545', fontSize: 34, fontWeight: '800', letterSpacing: -.7 }, titleLine: { height: 2, backgroundColor: coral, marginTop: -2, width: '100%' },
  field: { marginBottom: 16 }, label: { color: '#454545', fontSize: 14, fontWeight: '500' }, inputRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: '#c5c5c5' }, input: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 12, color: '#454545' }, eye: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#b52236', fontSize: 12, lineHeight: 18, marginTop: 4 }, button: { backgroundColor: coral, minHeight: 50, borderRadius: 7, alignItems: 'center', justifyContent: 'center', padding: 12 }, buttonText: { color: 'white', fontSize: 17, fontWeight: '700' },
  actions: { marginTop: 'auto', paddingTop: 42 }, footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 4 }, small: { color: '#656565', fontSize: 13 }, link: { color: '#c23848', fontSize: 13, paddingVertical: 14, paddingHorizontal: 4 }, notice: { color: '#777', fontSize: 11, textAlign: 'center', marginTop: 4 }, message: { color: '#454545', fontSize: 15, lineHeight: 23, marginBottom: 24 },
});
