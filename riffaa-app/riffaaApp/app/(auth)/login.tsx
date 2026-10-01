import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, NativeModules, Platform, Pressable, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Row,
  Screen,
  Stack,
  TextField,
} from '../../components/ui';
import { config } from '../../services/config';
import { useTranslation } from '../../hooks/useTranslation';
import { signInWithEmail, signInWithGoogle } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

/**
 * Whether the native Google Sign-In module is linked into this build.
 *
 * Checked via `NativeModules` (the JS module registers itself as
 * `RNGoogleSignin`) so we never touch the package when it is absent.
 */
function hasNativeGoogleSignin(): boolean {
  return Boolean(NativeModules.RNGoogleSignin);
}

/**
 * Load the native Google Sign-In module on demand.
 *
 * `@react-native-google-signin/google-signin` evaluates
 * `RNGoogleSignin.SIGN_IN_CANCELLED` at module scope. When the native module is
 * not linked (Expo Go, or a dev client built before the config plugin was
 * added) requiring the package throws and logs the "not correctly linked"
 * error. We therefore check the native module first and only require the JS
 * package when it actually exists, so the rest of the app — and email/password
 * login — keeps working.
 */
function loadGoogleSignin(): GoogleSigninModule | null {
  if (!hasNativeGoogleSignin()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    return null;
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const setUser = useAuthStore((state) => state.setUser);
  const setSession = useAuthStore((state) => state.setSession);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google Sign-In needs both a web client ID and a build that links the
  // native module. When either is missing the button stays disabled rather than
  // crashing on tap. Checking the native module here avoids ever requiring the
  // JS package on renders where it cannot work.
  const googleConfigured =
    Boolean(config.googleWebClientId) && hasNativeGoogleSignin();

  const handleLogin = useCallback(async () => {
    if (!username || !password) {
      setError(t('fillAllFields'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { session, profile } = await signInWithEmail(username, password);
      setSession(session);
      setUser(profile);
      router.replace('/home');
    } catch (caught) {
      const message = (caught as Error).message || '';
      const credentialIssue = /credential|invalid|unauthor|401|403/i.test(message);
      setError(credentialIssue ? t('invalidCredentials') : message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  }, [username, password, t, router, setUser, setSession]);

  const handleGoogleSignIn = useCallback(async () => {
    const googleSignin = loadGoogleSignin();
    if (!googleSignin?.GoogleSignin || !config.googleWebClientId) {
      setError(t('googleSignInUnavailable'));
      return;
    }
    setGoogleLoading(true);
    setError(null);
    try {
      const { GoogleSignin } = googleSignin;
      await GoogleSignin.configure({
        webClientId: config.googleWebClientId,
        iosClientId: config.googleWebClientId,
        scopes: ['openid', 'email', 'profile'],
      });
      const { idToken } = await GoogleSignin.signIn();
      if (!idToken) {
        setError(t('loginFailed'));
        return;
      }
      const { session, profile } = await signInWithGoogle(idToken);
      setSession(session);
      setUser(profile);
      router.replace('/home');
    } catch (caught: any) {
      // The module may not be linked in this build, so `statusCodes` is null.
      if (caught?.code === googleSignin.statusCodes?.SIGN_IN_CANCELLED) return; // user cancelled, no-op
      const message = (caught as Error).message || '';
      const credentialIssue = /credential|invalid|unauthor|401|403/i.test(message);
      setError(credentialIssue ? t('invalidCredentials') : message || t('loginFailed'));
    } finally {
      setGoogleLoading(false);
    }
  }, [t, router, setUser, setSession]);

  return (
    <Screen scroll padded={false} edges={{ top: true }}>
      <KeyboardAvoidingView
        className="flex-1 justify-center px-6"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Stack gap={24}>
          <Stack gap={10} align="center">
            <View className="rounded-hero bg-brand px-7 py-5">
              <AppText variant="display" weight="light" className="text-on-brand">
                {t('appName')}
              </AppText>
            </View>
            <AppText variant="heading" align="center">
              {t('login')}
            </AppText>
            <AppText variant="bodySm" tone="muted" align="center">
              {t('loginSubtitle')}
            </AppText>
          </Stack>

          <Card variant="raised">
            <Stack gap={16}>
              <TextField
                label={t('usernameLabel')}
                placeholder={t('usernameLabel')}
                icon="person-outline"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
              <TextField
                label={t('password')}
                placeholder={t('password')}
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                secureToggle
                returnKeyType="go"
                onSubmitEditing={() => { void handleLogin(); }}
              />

              {error ? (
                <AppText variant="bodySm" tone="danger">
                  {error}
                </AppText>
              ) : null}

              <Button
                label={t('login')}
                fullWidth
                loading={loading}
                onPress={() => void handleLogin()}
              />
            </Stack>
          </Card>

          <Row gap={12} align="center">
            <View className="h-px flex-1 bg-hairline" />
            <AppText variant="caption" tone="muted">
              {t('orContinueWith')}
            </AppText>
            <View className="h-px flex-1 bg-hairline" />
          </Row>

          <Button
            label={t('google')}
            variant="secondary"
            icon="logo-google"
            fullWidth
            loading={googleLoading}
            disabled={!googleConfigured || googleLoading}
            onPress={() => void handleGoogleSignIn()}
          />

          <Row gap={6} justify="center" align="center">
            <AppText variant="bodySm" tone="muted">
              {t('noAccount')}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('register')}
              onPress={() => router.push('/register')}
            >
              <AppText variant="bodySm" weight="medium" tone="brand">
                {t('register')}
              </AppText>
            </Pressable>
          </Row>
        </Stack>
      </KeyboardAvoidingView>
    </Screen>
  );
}
