import { SoundPressable as Pressable } from '@/components/sound-pressable';
import { AuthShell, Title, coral, ui } from '@/features/auth/auth-ui';
import { useAppTheme } from '@/features/app-theme';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';

export default function WelcomeScreen() {
  const { theme } = useAppTheme();
  const muted = theme === 'dark' ? '#bac7e4' : '#596485';
  return <AuthShell variant="welcome"><Title>Welcome</Title>
    <Text style={[ui.small, { color: muted, lineHeight: 24, marginTop: 8 }]}>Your city. Your community. Your MyArad.{'\n'}Sign in to feel right at home.</Text>
    <Link href="/map" style={[ui.link, { marginTop: 18 }]}>Explorează Aradul / Explore Arad →</Link>
    <View style={[ui.actions, { alignItems: 'flex-end', paddingBottom: 20 }]}><Link href="/signin" asChild><Pressable accessibilityRole="link" accessibilityLabel="Continue to sign in" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}><Text style={[ui.small, { color: muted }]}>Continue</Text><View style={{ backgroundColor: coral, borderRadius: 24, height: 44, width: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#3D0000', fontSize: 27, lineHeight: 32 }}>→</Text></View></Pressable></Link></View>
  </AuthShell>;
}
