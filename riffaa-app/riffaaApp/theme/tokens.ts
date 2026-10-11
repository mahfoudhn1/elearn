/**
 * Semantic design tokens: Riffaa's focused, academic product language.
 *
 * Screens must never use raw hex values. They consume these tokens either as
 * NativeWind classes (`bg-surface`, `text-ink-muted`, ...) or, when a native prop
 * needs a colour (StatusBar, ActivityIndicator, icons, glass fills), through
 * `useTheme()`.
 *
 * `palettes` is the single source of truth for opaque colours; `cssVariables`
 * derives the space-separated RGB triplets that NativeWind exposes as `--c-*`
 * variables. Translucent glass values live in `glassLevels` / `glassTone`
 * because rgba fills cannot be expressed as Tailwind colour classes.
 *
 * Deep navy structures the interface; Riffaa orange is reserved for actions.
 */
export type ThemeName = 'light' | 'dark';

export interface Palette {
  /** App background / status bar fallback. */
  bg: string;
  /** Opaque card / sheet surface (used when glass effects are reduced). */
  surface: string;
  /** Stronger solid surface for cards and floating controls. */
  surfaceElevated: string;
  /** Inputs, chips, nested surfaces (the "greige" tonal step under glass). */
  surface2: string;
  /** Borders and dividers. */
  line: string;
  /** Primary text. */
  ink: string;
  /** Secondary text. */
  inkMuted: string;
  /** Placeholders and disabled text. */
  inkSubtle: string;
  /** Disabled and tertiary content. */
  inkFaint: string;
  /** Accent: reserved for the primary action, active state and key numbers. */
  brand: string;
  /** Text/icon colour that sits on top of `brand`. */
  onBrand: string;
  /** Low-contrast decorative numerals (the "ghost" score). */
  ghost: string;
  /** Hairline connectors, sparkline baseline, outlined pill borders. */
  hairline: string;
  success: string;
  danger: string;
  info: string;
}

export const palettes: Record<ThemeName, Palette> = {
  dark: {
    bg: '#0B1422',
    surface: '#111E30',
    surfaceElevated: '#17263A',
    surface2: '#1D2E44',
    line: '#26384E',
    ink: '#F8FAFC',
    inkMuted: '#A9B7C8',
    inkSubtle: '#788BA2',
    inkFaint: '#53677F',
    brand: '#FF7849',
    onBrand: '#1F1108',
    ghost: '#26384E',
    hairline: '#32465F',
    success: '#34D399',
    danger: '#F87171',
    info: '#38BDF8',
  },
  light: {
    bg: '#F3F6FA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surface2: '#EAF0F6',
    line: '#D9E2EC',
    ink: '#14243A',
    inkMuted: '#52647A',
    inkSubtle: '#77889C',
    inkFaint: '#A4B1C0',
    brand: '#F05A28',
    onBrand: '#FFFFFF',
    ghost: '#D9D2C8',
    hairline: '#B9B2A8',
    success: '#059669',
    danger: '#DC2626',
    info: '#0284C7',
  },
};

export type CssVarName =
  | '--c-bg'
  | '--c-surface'
  | '--c-surface-elevated'
  | '--c-surface-2'
  | '--c-line'
  | '--c-ink'
  | '--c-ink-muted'
  | '--c-ink-subtle'
  | '--c-ink-faint'
  | '--c-brand'
  | '--c-on-brand'
  | '--c-ghost'
  | '--c-hairline'
  | '--c-success'
  | '--c-danger'
  | '--c-info';

function toRgbTriplet(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function buildCssVariables(palette: Palette): Record<CssVarName, string> {
  return {
    '--c-bg': toRgbTriplet(palette.bg),
    '--c-surface': toRgbTriplet(palette.surface),
    '--c-surface-elevated': toRgbTriplet(palette.surfaceElevated),
    '--c-surface-2': toRgbTriplet(palette.surface2),
    '--c-line': toRgbTriplet(palette.line),
    '--c-ink': toRgbTriplet(palette.ink),
    '--c-ink-muted': toRgbTriplet(palette.inkMuted),
    '--c-ink-subtle': toRgbTriplet(palette.inkSubtle),
    '--c-ink-faint': toRgbTriplet(palette.inkFaint),
    '--c-brand': toRgbTriplet(palette.brand),
    '--c-on-brand': toRgbTriplet(palette.onBrand),
    '--c-ghost': toRgbTriplet(palette.ghost),
    '--c-hairline': toRgbTriplet(palette.hairline),
    '--c-success': toRgbTriplet(palette.success),
    '--c-danger': toRgbTriplet(palette.danger),
    '--c-info': toRgbTriplet(palette.info),
  };
}

export const cssVariables: Record<ThemeName, Record<CssVarName, string>> = {
  dark: buildCssVariables(palettes.dark),
  light: buildCssVariables(palettes.light),
};

/* -------------------------------------------------------------------------- */
/*  Shape & elevation                                                         */
/* -------------------------------------------------------------------------- */

/** Everything is rounded. Nothing sharp. */
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const;

export const typography = {
  metadata: 12,
  bodySmall: 14,
  body: 16,
  cardTitle: 18,
  sectionTitle: 20,
  screenTitle: 26,
  statistic: 42,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  /** Buttons, chips, tags. */
  pill: 999,
} as const;

export interface ShadowSpec {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

/**
 * Elevation uses restrained navy shadows; glass is reserved for special surfaces.
 * Skip them entirely when `reduceGlass` is on.
 */
export const shadows: Record<ThemeName, { soft: ShadowSpec; float: ShadowSpec }> = {
  dark: {
    soft: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 2,
    },
    float: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.24,
      shadowRadius: 20,
      elevation: 4,
    },
  },
  light: {
    soft: {
      shadowColor: '#5B4636',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 12,
      elevation: 2,
    },
    float: {
      shadowColor: '#5B4636',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 4,
    },
  },
};

/* -------------------------------------------------------------------------- */
/*  Aurora background                                                         */
/* -------------------------------------------------------------------------- */

export interface AuroraBlob {
  color: string;
  /** 0..1 */
  opacity: number;
  /** Diameter as a fraction of screen width. */
  size: number;
  /** Centre X as a fraction of screen width, measured from the START edge (flip for RTL). */
  x: number;
  /** Centre Y as a fraction of screen height, from the top. */
  y: number;
}

export interface AuroraSpec {
  /** Vertical base gradient, top to bottom. */
  gradient: readonly [string, string, string];
  /** Large blurred blobs concentrated in the top ~40% of the screen. */
  blobs: readonly AuroraBlob[];
}

export const aurora: Record<ThemeName, AuroraSpec> = {
  dark: {
    gradient: ['#0B1422', '#0D1827', '#0B1422'],
    blobs: [
      { color: '#FF7849', opacity: 0.12, size: 0.95, x: 0.9, y: 0.05 },
      { color: '#1B4B78', opacity: 0.16, size: 0.85, x: 0.15, y: 0.12 },
      { color: '#17406A', opacity: 0.12, size: 0.8, x: 0.55, y: 0.3 },
      { color: '#FF7849', opacity: 0.04, size: 0.7, x: 0.1, y: 0.85 },
    ],
  },
  light: {
    gradient: ['#EAF0F7', '#F3F6FA', '#F3F6FA'],
    blobs: [
      { color: '#FF7849', opacity: 0.08, size: 0.95, x: 0.85, y: 0.04 },
      { color: '#9BB8D5', opacity: 0.12, size: 0.85, x: 0.1, y: 0.1 },
      { color: '#A9C3DE', opacity: 0.08, size: 0.75, x: 0.5, y: 0.22 },
      { color: '#8EB5D4', opacity: 0.06, size: 0.75, x: 0.2, y: 0.34 },
    ],
  },
};

/* -------------------------------------------------------------------------- */
/*  Glass system                                                              */
/* -------------------------------------------------------------------------- */

  /** Surface density levels used by explicit glass and solid elevation. */
export type GlassLevel = 'glass-1' | 'glass-2' | 'glass-3';

/** Meaningful tints only. Orange is the action signal, not a subject colour. */
export type GlassTone = 'brand' | 'success' | 'info' | 'danger';

export interface GlassLevelSpec {
  /** Translucent overlay painted above the blur (or the solid fill when reduced). */
  fill: string;
  /** Hairline border. */
  border: string;
  /** `expo-blur` intensity on iOS. */
  blurIOS: number;
  /** `expo-blur` intensity on Android (the native blur is weaker there). */
  blurAndroid: number;
  /** Default corner radius for the level. */
  radius: number;
  /** Level 2 gets a 1px inner top highlight so it reads as "raised". */
  highlight: boolean;
  /** Opaque fallback used by `reduceGlass`. */
  solid: string;
}

export const glassLevels: Record<ThemeName, Record<GlassLevel, GlassLevelSpec>> = {
  dark: {
    'glass-1': {
      fill: 'rgba(17,30,48,0.96)',
      border: 'rgba(120,145,174,0.12)',
      blurIOS: 18,
      blurAndroid: 24,
      radius: radii.lg,
      highlight: false,
      solid: '#111E30',
    },
    'glass-2': {
      fill: 'rgba(23,38,58,0.98)',
      border: 'rgba(120,145,174,0.16)',
      blurIOS: 22,
      blurAndroid: 28,
      radius: radii.xl,
      highlight: true,
      solid: '#17263A',
    },
    'glass-3': {
      fill: 'rgba(17,30,48,0.95)',
      border: 'rgba(120,145,174,0.14)',
      blurIOS: 18,
      blurAndroid: 24,
      radius: radii.lg,
      highlight: false,
      solid: '#111E30',
    },
  },
  light: {
    'glass-1': {
      fill: 'rgba(255,255,255,0.98)',
      border: 'rgba(217,226,236,0.85)',
      blurIOS: 18,
      blurAndroid: 24,
      radius: radii.lg,
      highlight: false,
      solid: '#FFFFFF',
    },
    'glass-2': {
      fill: 'rgba(255,255,255,0.99)',
      border: 'rgba(217,226,236,0.95)',
      blurIOS: 22,
      blurAndroid: 28,
      radius: radii.xl,
      highlight: true,
      solid: '#FFFFFF',
    },
    'glass-3': {
      fill: 'rgba(234,240,246,0.96)',
      border: 'rgba(217,226,236,0.85)',
      blurIOS: 18,
      blurAndroid: 24,
      radius: radii.lg,
      highlight: false,
      solid: '#EAF0F6',
    },
  },
};

/** Alpha for a tone fill over the level's own fill. */
const TONE_ALPHA: Record<ThemeName, number> = { dark: 0.2, light: 0.16 };

/** `#RRGGBB` to `rgba(r, g, b, a)`. */
export function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Opaque mix of `tint` over `base`, used for `reduceGlass` tone surfaces. */
export function mixHex(base: string, tint: string, ratio: number): string {
  const parse = (hex: string) => {
    const value = hex.replace('#', '');
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
    ] as const;
  };
  const [br, bg, bb] = parse(base);
  const [tr, tg, tb] = parse(tint);
  const channel = (a: number, b: number) =>
    Math.round(a * (1 - ratio) + b * ratio)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(br, tr)}${channel(bg, tg)}${channel(bb, tb)}`.toUpperCase();
}

export interface GlassToneSpec {
  /** Tone overlay painted above the level fill. */
  fill: string;
  /** Tone border, replaces the level border. */
  border: string;
  /** Opaque tinted fill for `reduceGlass`. */
  solid: string;
}

export function glassTone(theme: ThemeName, tone: GlassTone, level: GlassLevel): GlassToneSpec {
  const colour = palettes[theme][tone];
  const alpha = tone === 'brand' ? TONE_ALPHA[theme] * 0.55 : TONE_ALPHA[theme];
  return {
    fill: hexToRgba(colour, alpha),
    border: hexToRgba(colour, tone === 'brand' ? 0.18 : 0.35),
    solid: tone === 'brand'
      ? glassLevels[theme][level].solid
      : mixHex(glassLevels[theme][level].solid, colour, alpha * 1.5),
  };
}
