import type { StyleProp, TextStyle } from 'react-native';
import { AppText } from './AppText';

export interface GhostNumberProps {
  /** Decorative value, e.g. a focus score or big streak count. */
  value: string | number;
  /** Font size; defaults to 96. */
  size?: number;
  className?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Oversized, low-contrast decorative numeral. It carries no meaning on its own
 * (the real number is always rendered as text elsewhere), so it is hidden from
 * screen readers and should be positioned by the parent in the END corner.
 */
export function GhostNumber({ value, size = 96, className, style }: GhostNumberProps) {
  return (
    <AppText
      tone="ghost"
      weight="bold"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      allowFontScaling={false}
      className={className}
      style={[{ fontSize: size, lineHeight: size * 1.02 }, style]}
    >
      {value}
    </AppText>
  );
}
