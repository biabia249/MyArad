import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

export type Profile = { fullName: string; username: string; email: string; hasPassword: boolean };
type Session = { token: string; profile: Profile };
const tokenKey = 'myarad.session';
const verifierKey = 'myarad.google-verifier';
let memoryToken: string | null = null;
let exchange: Promise<Profile> | null = null;
let completedGoogle: { code: string; profile: Profile } | null = null;

function apiUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!configured) throw new Error('The server address is missing. Set EXPO_PUBLIC_API_URL and restart the app.');
  const url = new URL(configured);
  if (url.protocol !== 'https:' && !(__DEV__ && url.protocol === 'http:')) throw new Error('The authentication server must use HTTPS.');
  return configured;
}
class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
async function request<T>(path: string, data?: object, token?: string): Promise<T> {
  const base = apiUrl();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { method: data ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(20000) });
  } catch { throw new Error('Cannot reach the server. Check your connection and try again.'); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, result.error || 'Unable to complete your request.');
  return result as T;
}
async function readToken() {
  if (Platform.OS === 'web') return memoryToken;
  return SecureStore.getItemAsync(tokenKey);
}
async function saveSession(session: Session) {
  if (Platform.OS !== 'web') await SecureStore.setItemAsync(tokenKey, session.token);
  memoryToken = session.token;
  return session.profile;
}
async function removeToken() {
  memoryToken = null;
  if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(tokenKey);
}
async function getVerifier() {
  return Platform.OS === 'web' ? window.sessionStorage.getItem(verifierKey) : SecureStore.getItemAsync(verifierKey);
}
async function clearVerifier() {
  if (Platform.OS === 'web') window.sessionStorage.removeItem(verifierKey);
  else await SecureStore.deleteItemAsync(verifierKey);
}
async function completeGoogleRedirect(code: string | null, error: string | null): Promise<Profile> {
  if (code && completedGoogle?.code === code) return completedGoogle.profile;
  if (exchange) return exchange;
  exchange = (async () => {
    if (error) throw new Error(error);
    const verifier = await getVerifier();
    if (!code || !verifier) throw new Error('Google sign-in expired. Please try again.');
    const session = await request<Session>('/auth/google/exchange', { code, verifier });
    const result = await saveSession(session);
    completedGoogle = { code, profile: result };
    return result;
  })();
  try { return await exchange; }
  finally { await clearVerifier(); exchange = null; }
}
export const authService = {
  async signUp(profile: Omit<Profile, 'hasPassword'>, password: string) {
    return saveSession(await request<Session>('/auth/signup', { ...profile, password }));
  },
  async signIn(identifier: string, password: string) {
    return saveSession(await request<Session>('/auth/signin', { identifier, password }));
  },
  async getProfile(): Promise<Profile | null> {
    const token = await readToken();
    if (!token) return null;
    try { return (await request<{ profile: Profile }>('/auth/me', undefined, token)).profile; }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) { await removeToken(); return null; }
      throw error;
    }
  },
  async signOut() {
    const token = await readToken();
    if (token) {
      try { await request('/auth/signout', {}, token); }
      catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
    }
    await removeToken();
    completedGoogle = null;
  },
  async setPassword(password: string) {
    const token = await readToken();
    if (!token) throw new Error('Please sign in with Google first.');
    const result = await request<{ profile: Profile }>('/auth/password/set', { password }, token);
    completedGoogle = null;
    return result.profile;
  },
  async resetPassword(email: string) {
    return (await request<{ message: string }>('/auth/password/reset', { email })).message;
  },
  completeGoogleRedirect,
  async signInWithGoogle(): Promise<Profile | null> {
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient && Platform.OS !== 'web') {
      throw new Error('Google sign-in needs the MyArad development app. Please install a development build instead of using Expo Go.');
    }
    const verifier = Crypto.randomUUID().replace(/-/g, '') + Crypto.randomUUID().replace(/-/g, '');
    const challenge = (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const { authorizationUrl } = await request<{ authorizationUrl: string }>('/auth/google/start', { challenge, platform: Platform.OS });
    if (Platform.OS === 'web') {
      window.sessionStorage.setItem(verifierKey, verifier);
      window.location.assign(authorizationUrl);
      return null;
    }
    await SecureStore.setItemAsync(verifierKey, verifier);
    try {
      const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, 'myarad://auth/callback');
      if (result.type !== 'success') { await clearVerifier(); return null; }
      const redirect = new URL(result.url);
      if (redirect.protocol !== 'myarad:' || redirect.host !== 'auth' || redirect.pathname !== '/callback') throw new Error('Unexpected sign-in response. Please try again.');
      return await completeGoogleRedirect(redirect.searchParams.get('code'), redirect.searchParams.get('error'));
    } catch (error) { await clearVerifier(); throw error; }
  },
};
