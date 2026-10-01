import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import { I18nManager, Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { setLocale as setI18nLocale } from '../services/i18n';

export type AppLocale = 'ar' | 'en' | 'fr';
export type AppTheme = 'light' | 'dark';

interface SettingsState {
  locale: AppLocale;
  theme: AppTheme;
  /** When true every glass surface renders a solid fill and no blur. */
  reduceGlass: boolean;
  /** Set once the user toggles the switch, so accessibility can't override it. */
  reduceGlassExplicit: boolean;
  hasHydrated: boolean;
  setLocale: (value: AppLocale) => void;
  setTheme: (value: AppTheme) => void;
  toggleTheme: () => void;
  setReduceGlass: (value: boolean) => void;
  /** Applies the iOS "Reduce Transparency" setting unless the user chose first. */
  applyAccessibilityReduceGlass: (enabled: boolean) => void;
  setHasHydrated: (value: boolean) => void;
}

function applyTheme(theme: AppTheme) {
  try {
    colorScheme.set(theme);
  } catch {
    // NativeWind may not be ready during the very first render.
  }
}

function applyLocale(locale: AppLocale) {
  setI18nLocale(locale);
  I18nManager.allowRTL(false);
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      locale: 'ar',
      theme: 'dark',
      reduceGlass: false,
      reduceGlassExplicit: false,
      // On web, storage hydration is unreliable during static rendering, so we
      // don't block the first paint behind it.
      hasHydrated: Platform.OS === 'web',
      setLocale: (locale) => {
        applyLocale(locale);
        set({ locale });
      },
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
      },
      setReduceGlass: (reduceGlass) => set({ reduceGlass, reduceGlassExplicit: true }),
      applyAccessibilityReduceGlass: (enabled) => {
        if (enabled && !get().reduceGlassExplicit) {
          set({ reduceGlass: true });
        }
      },
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'riffaa-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        locale: state.locale,
        theme: state.theme,
        reduceGlass: state.reduceGlass,
        reduceGlassExplicit: state.reduceGlassExplicit,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyLocale(state.locale);
          applyTheme(state.theme);
        }
        state?.setHasHydrated(true);
      },
    },
  ),
);
