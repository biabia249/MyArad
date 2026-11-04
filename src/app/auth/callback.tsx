import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { authService } from '@/features/auth/auth-service';
import { AuthShell, Title, ui } from '@/features/auth/auth-ui';

export default function GoogleCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const [error, setError] = useState('');
  const code = typeof params.code === 'string' ? params.code : null;
  const providerError = typeof params.error === 'string' ? params.error : null;
  useEffect(() => {
    let mounted = true;
    authService.completeGoogleRedirect(code, providerError).then(() => { if (mounted) router.replace('/signin'); }).catch(reason => { if (mounted) setError(reason instanceof Error ? reason.message : 'Sign-in failed.'); });
    return () => { mounted = false; };
  }, [code, providerError]);
  return <AuthShell><Title>Google sign in</Title>{error ? <><Text accessibilityRole="alert" style={ui.error}>{error}</Text><Link href="/signin" replace style={ui.link}>Back to Sign In</Link></> : <ActivityIndicator accessibilityLabel="Completing Google sign-in" color="#ff8085" />}</AuthShell>;
}
