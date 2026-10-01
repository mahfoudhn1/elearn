import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from '../ui/AppText';
import { Row } from '../ui/Row';
import type { IoniconName } from '../ui/types';

export interface PromoPillProps {
  label: string;
  icon?: IoniconName;
  onPress?: () => void;
  className?: string;
}

/**
 * The single small accent pill at the top of a screen. Orange marks a promo or
 * status message; it is never used for decoration. Touch target is padded to
 * 44px with `hitSlop` while staying visually compact.
 */
export function PromoPill({ label, icon = 'sparkles', onPress, className }: PromoPillProps) {
  const { tokens } = useTheme();

  const content = (
    <Row
      gap={6}
      align="center"
      className="self-start rounded-pill border border-brand/40 bg-brand/15 px-3 py-1.5"
    >
      <Ionicons name={icon} size={14} color={tokens.brand} />
      <AppText variant="caption" weight="medium" className="text-brand">
        {label}
      </AppText>
    </Row>
  );

  if (!onPress) {
    return <>{content}</>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      className={className}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      {content}
    </Pressable>
  );
}
