import { SoundPressable as Pressable } from '@/components/sound-pressable';
import { AuthShell, coral, ui } from '@/features/auth/auth-ui';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';

export default function WelcomeScreen() {
  return <AuthShell variant="welcome"><Text accessibilityRole="header" style={ui.title}>Welcome</Text>
    <Text style={[ui.small, { color: '#999', lineHeight: 20, marginTop: 8 }]}>Your city. Your community. Your MyArad.{'\n'}Sign in to feel right at home.</Text>
    <View style={[ui.actions, { alignItems: 'flex-end', paddingBottom: 20 }]}><Link href="/signin" asChild><Pressable accessibilityRole="link" accessibilityLabel="Continue to sign in" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}><Text style={ui.small}>Continue</Text><View style={{ backgroundColor: coral, borderRadius: 24, height: 36, width: 36, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: 'white', fontSize: 27, lineHeight: 32 }}>→</Text></View></Pressable></Link></View>
  </AuthShell>;
}
