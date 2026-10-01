/**
 * Semantic design tokens: "calm glass" language.
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
 * Design language: soft, airy, almost monochrome UI. Only the background
 * (`aurora`) carries colour. Orange (`brand`) is the single accent.
 */
export type ThemeName = 'light' | 'dark';

export interface Palette {
  /** App background / status bar fallback. */
  bg: string;
  /** Opaque card / sheet surface (used when glass effects are reduced). */
  surface: string;
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
    bg: '#273444',
    surface: '#2F3E50',
    surface2: '#384A5F',
    line: '#445468',
    ink: '#F8FAFC',
    inkMuted: '#B4C0CF',
    inkSubtle: '#8494A8',
    brand: '#FF7849',
    onBrand: '#1F1108',
    ghost: '#4A5C72',
    hairline: '#5A6B80',
    success: '#34D399',
    danger: '#F87171',
    info: '#38BDF8',
  },
  light: {
    // Warm cream base instead of the old cool blue-grey.
    bg: '#F6F1EA',
    surface: '#FFFDF9',
    surface2: '#EFE9E0',
    line: '#E6DED3',
    // Deep navy text, never pure black.
    ink: '#1E2A3B',
    inkMuted: '#5B6675',
    inkSubtle: '#8A93A0',
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
  | '--c-surface-2'
  | '--c-line'
  | '--c-ink'
  | '--c-ink-muted'
  | '--c-ink-subtle'
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
    '--c-surface-2': toRgbTriplet(palette.surface2),
    '--c-line': toRgbTriplet(palette.line),
    '--c-ink': toRgbTriplet(palette.ink),
    '--c-ink-muted': toRgbTriplet(palette.inkMuted),
    '--c-ink-subtle': toRgbTriplet(palette.inkSubtle),
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
export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 26,
  /** Buttons, chips, tags, tab bar. */
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
 * Elevation is mostly blur + tone. Shadows stay very soft and low-contrast.
 * Skip them entirely when `reduceGlass` is on.
 */
export const shadows: Record<ThemeName, { soft: ShadowSpec; float: ShadowSpec }> = {
  dark: {
    soft: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 4,
    },
    float: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.28,
      shadowRadius: 32,
      elevation: 8,
    },
  },
  light: {
    soft: {
      shadowColor: '#5B4636',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 3,
    },
    float: {
      shadowColor: '#5B4636',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.14,
      shadowRadius: 32,
      elevation: 6,
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
    gradient: ['#1B2533', '#273444', '#223047'],
    blobs: [
      { color: '#FF7849', opacity: 0.34, size: 0.95, x: 0.9, y: 0.05 },
      { color: '#8B5CF6', opacity: 0.28, size: 0.85, x: 0.15, y: 0.12 },
      { color: '#38BDF8', opacity: 0.2, size: 0.8, x: 0.55, y: 0.3 },
      { color: '#FF7849', opacity: 0.12, size: 0.7, x: 0.1, y: 0.85 },
    ],
  },
  light: {
    // Warm cream that fades down from a slightly tinted top.
    gradient: ['#F8EFE6', '#F6F1EA', '#FDF3EC'],
    blobs: [
      { color: '#FFB48A', opacity: 0.55, size: 0.95, x: 0.85, y: 0.04 },
      { color: '#C9B8FF', opacity: 0.5, size: 0.85, x: 0.1, y: 0.1 },
      { color: '#F6B8C8', opacity: 0.4, size: 0.75, x: 0.5, y: 0.22 },
      { color: '#BDEBD8', opacity: 0.42, size: 0.75, x: 0.2, y: 0.34 },
    ],
  },
};

/* -------------------------------------------------------------------------- */
/*  Glass system                                                              */
/* -------------------------------------------------------------------------- */

/** The three glass density levels. Denser levels keep long text readable. */
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
      fill: 'rgba(255,255,255,0.07)',
      border: 'rgba(255,255,255,0.14)',
      blurIOS: 24,
      blurAndroid: 40,
      radius: radii.lg,
      highlight: false,
      solid: '#2F3E50',
    },
    'glass-2': {
      fill: 'rgba(255,255,255,0.12)',
      border: 'rgba(255,255,255,0.24)',
      blurIOS: 40,
      blurAndroid: 60,
      radius: radii.xl,
      highlight: true,
      solid: '#35455A',
    },
    'glass-3': {
      fill: 'rgba(39,52,68,0.72)',
      border: 'rgba(255,255,255,0.12)',
      blurIOS: 30,
      blurAndroid: 45,
      radius: radii.lg,
      highlight: false,
      solid: '#2B3849',
    },
  },
  light: {
    'glass-1': {
      fill: 'rgba(255,255,255,0.55)',
      border: 'rgba(255,255,255,0.85)',
      blurIOS: 24,
      blurAndroid: 40,
      radius: radii.lg,
      highlight: false,
      solid: '#FFFDF9',
    },
    'glass-2': {
      fill: 'rgba(255,255,255,0.45)',
      border: 'rgba(255,255,255,0.95)',
      blurIOS: 44,
      blurAndroid: 60,
      radius: radii.xl,
      highlight: true,
      solid: '#FFFDF9',
    },
    'glass-3': {
      fill: 'rgba(255,253,249,0.90)',
      border: 'rgba(255,255,255,0.80)',
      blurIOS: 30,
      blurAndroid: 45,
      radius: radii.lg,
      highlight: false,
      solid: '#FFFDF9',
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
  return {
    fill: hexToRgba(colour, TONE_ALPHA[theme]),
    border: hexToRgba(colour, 0.35),
    solid: mixHex(glassLevels[theme][level].solid, colour, TONE_ALPHA[theme] * 2),
  };
}