import { useMemo } from 'react';
import { vars } from 'nativewind';
import { cssVariables, glassLevels, palettes } from '../theme/tokens';
import { useSettingsStore } from '../store/settingsStore';

/** NativeWind style object that scopes the theme's `--c-*` variables. */
export function themeVarsFor(theme: 'light' | 'dark') {
  return vars(cssVariables[theme]);
}

/**
 * Theme variables for the current theme. Apply on any root that may render
 * outside the app's main view tree (native modals/sheets) so token classes
 * resolve there too.
 */
export function useThemeVars() {
  const theme = useSettingsStore((state) => state.theme);
  return useMemo(() => themeVarsFor(theme), [theme]);
}

/**
 * Central place for colours that cannot be expressed with NativeWind classes
 * (StatusBar, ActivityIndicator, icon tints, native props, glass fills).
 */
export function useTheme() {
  const theme = useSettingsStore((state) => state.theme);
  const reduceGlass = useSettingsStore((state) => state.reduceGlass);
  const isDark = theme === 'dark';

  return {
    theme,
    isDark,
    /** True when the user (or iOS Reduce Transparency) asked for solid surfaces. */
    reduceGlass,
    /** Semantic design tokens (see `theme/tokens.ts`). */
    tokens: palettes[theme],
    /** Per-level glass fills, borders and blur intensities for this theme. */
    glass: glassLevels[theme],
    colors: {
      background: palettes[theme].bg,
      surface: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.62)',
      surfaceStrong: isDark ? palettes.dark.surface : palettes.light.surface,
      border: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.80)',
      text: palettes[theme].ink,
      textMuted: palettes[theme].inkMuted,
      accent: palettes[theme].brand,
      blurTint: (isDark ? 'dark' : 'light') as 'dark' | 'light',
      statusBar: (isDark ? 'light-content' : 'dark-content') as
        | 'light-content'
        | 'dark-content',
      tabBar: isDark
        ? 'rgba(30, 41, 59, 0.42)'
        : 'rgba(255, 255, 255, 0.50)',
      tabBarBorder: isDark
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.10)',
      tabInactive: palettes[theme].inkSubtle,
    },
  };
}
