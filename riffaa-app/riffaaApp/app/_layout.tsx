import {
    IBMPlexSansArabic_300Light,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
    useFonts,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { QueryClientProvider } from '@tanstack/react-query';
import { Redirect, Stack, useSegments, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { colorScheme } from 'nativewind';
import { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OfflineBanner } from '../components/OfflineBanner';
import { PomodoroRuntime } from '../components/PomodoroRuntime';
import { AppBackground, ErrorState } from '../components/ui';
import { BlurTargetContext } from '../components/ui/blurTarget';
import '../global.css';
import { useBootstrap } from '../hooks/useBootstrap';
import { createAppQueryClient, setupQueryManagers } from '../services/queryClient';
import { useDirection } from '../hooks/useDirection';
import { useThemeVars } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { setLocale } from '../services/i18n';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

// Hold the native splash until fonts, settings and the auth session are ready.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const segments = useSegments();
  useBootstrap();

  const theme = useSettingsStore((state) => state.theme);
  const locale = useSettingsStore((state) => state.locale);
  const hasHydrated = useSettingsStore((state) => state.hasHydrated);
  const user = useAuthStore((state) => state.user);
  const sessionLoading = useAuthStore((state) => state.loading);
  const applyAccessibilityReduceGlass = useSettingsStore(
    (state) => state.applyAccessibilityReduceGlass,
  );
  const { isRTL } = useDirection();
  const themeVars = useThemeVars();

  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSansArabic_300Light,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  const queryClient = useMemo(() => createAppQueryClient(), []);
  // Android glass samples this single backdrop target (SDK 57 BlurView API).
  const blurTargetRef = useRef<View | null>(null);

  // Refetch on foreground and respect real connectivity.
  useEffect(() => setupQueryManagers(), []);

  // Keep NativeWind and i18n in sync with the persisted user preference.
  useEffect(() => {
    colorScheme.set(theme);
  }, [theme]);

  useEffect(() => {
    setLocale(locale);
  }, [locale]);

  // Respect the OS "Reduce Transparency" preference until the user chooses.
  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then(applyAccessibilityReduceGlass)
      .catch(() => {});
  }, [applyAccessibilityReduceGlass]);

  const ready = (fontsLoaded || fontError !== null) && hasHydrated && !sessionLoading;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  // Single source of truth for auth routing. Rendering a redirect (rather than
  // navigating from an effect) stops protected screens from mounting — and
  // firing authenticated requests — for a frame before the login redirect.
  const inAuthGroup = segments[0] === '(auth)';
  const isDevKit = __DEV__ && segments[0] === 'dev-kit';
  if (!user && !inAuthGroup && !isDevKit) {
    return <Redirect href="/login" />;
  }
  if (user && inAuthGroup) {
    return <Redirect href="/home" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {/* Remount on language change so every `translate()` call re-evaluates. */}
          <View
            key={locale}
            className="flex-1 bg-bg"
            style={[themeVars, { direction: isRTL ? 'rtl' : 'ltr' }]}
          >
            {/* Rendered once, behind every navigator/screen. */}
            <BlurTargetContext.Provider value={blurTargetRef}>
              <AppBackground blurTargetRef={blurTargetRef} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_right',
          animationDuration: 280,
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            animation: isRTL ? 'slide_from_left' : 'slide_from_right',
            animationDuration: 280,
          }}
        />
        <Stack.Screen
          name="(auth)"
          options={{
            animation: isRTL ? 'slide_from_left' : 'slide_from_right',
            animationDuration: 280,
          }}
        />
        <Stack.Screen
          name="create-schedule"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', animationDuration: 280 }}
        />
        <Stack.Screen
          name="study-session"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            animationDuration: 280,
          }}
        />
        <Stack.Screen
          name="survey/[id]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', animationDuration: 280 }}
        />
        <Stack.Screen
          name="goals/edit"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', animationDuration: 280 }}
        />
        <Stack.Screen
          name="analytics"
          options={{ animation: 'fade', animationDuration: 240 }}
        />
        {/* Fade transitions for detail screens for a softer feel. */}
        <Stack.Screen
          name="player/[lessonId]"
          options={{ animation: 'fade', animationDuration: 240 }}
        />
        <Stack.Screen
          name="course/[id]"
          options={{ animation: 'fade', animationDuration: 240 }}
        />
      </Stack>
              <PomodoroRuntime />
              <OfflineBanner />
            </BlurTargetContext.Provider>
          </View>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Friendly crash screen for any route-level error. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <RootErrorState error={error} retry={retry} />;
}

function RootErrorState({
  error,
  retry,
}: {
  error: Error;
  retry: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const themeVars = useThemeVars();
  return (
    <View
      className="flex-1 items-center justify-center bg-bg px-6 py-16"
      style={[themeVars, { direction: useDirection().isRTL ? 'rtl' : 'ltr' }]}
    >
      <ErrorState
        error={error}
        onRetry={() => {
          void retry();
        }}
        retryLabel={t('reload')}
      />
    </View>
  );
}
