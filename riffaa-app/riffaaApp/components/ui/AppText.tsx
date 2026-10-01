import { Text, type TextProps, type TextStyle } from 'react-native';
import { useDirection } from '../../hooks/useDirection';

export type TextVariant =
  | 'micro'
  | 'caption'
  | 'bodySm'
  | 'body'
  | 'title'
  | 'heading'
  | 'display'
  | 'displayLg'
  | 'timer';

export type TextWeight = 'light' | 'regular' | 'medium' | 'semibold' | 'bold';

export type TextTone =
  | 'ink'
  | 'muted'
  | 'subtle'
  | 'ghost'
  | 'brand'
  | 'danger'
  | 'success'
  | 'onBrand';

/**
 * Each weight is a separate family because React Native has no synthesised
 * weights for custom fonts. The type scale leans light/regular: only one big
 * number per screen is allowed to be loud.
 */
const FONT_FAMILY: Record<TextWeight, string> = {
  light: 'IBMPlexSansArabic_300Light',
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  semibold: 'IBMPlexSansArabic_600SemiBold',
  bold: 'IBMPlexSansArabic_700Bold',
};

const VARIANT: Record<
  TextVariant,
  { fontSize: number; lineHeight: number; weight: TextWeight }
> = {
  micro: { fontSize: 11, lineHeight: 15, weight: 'medium' },
  caption: { fontSize: 12, lineHeight: 16, weight: 'regular' },
  bodySm: { fontSize: 14, lineHeight: 20, weight: 'regular' },
  body: { fontSize: 16, lineHeight: 24, weight: 'regular' },
  title: { fontSize: 18, lineHeight: 26, weight: 'medium' },
  heading: { fontSize: 22, lineHeight: 30, weight: 'semibold' },
  display: { fontSize: 28, lineHeight: 36, weight: 'light' },
  displayLg: { fontSize: 34, lineHeight: 42, weight: 'light' },
  timer: { fontSize: 48, lineHeight: 52, weight: 'light' },
};

const TONE_CLASS: Record<TextTone, string> = {
  ink: 'text-ink',
  muted: 'text-ink-muted',
  subtle: 'text-ink-subtle',
  ghost: 'text-ghost',
  brand: 'text-brand',
  danger: 'text-danger',
  success: 'text-success',
  onBrand: 'text-on-brand',
};

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  tone?: TextTone;
  /** Logical alignment; defaults to the start side for the current direction. */
  align?: 'start' | 'center' | 'end';
  className?: string;
}

/**
 * The app's only text primitive: applies the type scale, the correct font
 * family for the requested weight, and RTL-aware alignment.
 */
export function AppText({
  variant = 'body',
  weight,
  tone = 'ink',
  align,
  className,
  style,
  ...rest
}: AppTextProps) {
  const { isRTL } = useDirection();
  const scale = VARIANT[variant];
  const resolvedWeight = weight ?? scale.weight;

  const textAlign: TextStyle['textAlign'] =
    align === 'center'
      ? 'center'
      : align === 'end'
        ? isRTL
          ? 'left'
          : 'right'
        : isRTL
          ? 'right'
          : 'left';

  const base: TextStyle = {
    fontFamily: FONT_FAMILY[resolvedWeight],
    fontSize: scale.fontSize,
    lineHeight: scale.lineHeight,
    textAlign,
    writingDirection: isRTL ? 'rtl' : 'ltr',
  };

  if (variant === 'timer') {
    base.fontVariant = ['tabular-nums'];
  }

  return (
    <Text
      {...rest}
      className={`${TONE_CLASS[tone]}${className ? ` ${className}` : ''}`}
      style={[base, style]}
    />
  );
}
