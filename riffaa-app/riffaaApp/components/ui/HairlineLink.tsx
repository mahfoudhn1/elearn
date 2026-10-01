import { Pressable, type ViewProps } from 'react-native';
import { View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { DirIcon } from './DirIcon';
import { Row } from './Row';

export interface HairlineLinkProps extends Omit<ViewProps, 'children'> {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The signature "view more" affordance: a label, a thin connector line and a
 * small chevron — quiet and inline instead of a bulky button. Direction and
 * chevron follow the locale.
 */
export function HairlineLink({
  label,
  onPress,
  disabled = false,
  className,
  style,
  ...rest
}: HairlineLinkProps) {
  const { tokens } = useTheme();

  const body = (
    <Row gap={8} align="center" className="min-h-[44px]">
      <AppText variant="bodySm" weight="medium" tone="muted" numberOfLines={1}>
        {label}
      </AppText>
      <View className="h-px flex-1 bg-hairline" />
      <DirIcon name="chevron-forward" size={16} color={tokens.inkSubtle} />
    </Row>
  );

  if (!onPress) {
    return (
      <View {...rest} className={className} style={style}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={className}
      style={({ pressed }) => [style, { opacity: pressed ? 0.7 : 1 }]}
    >
      {body}
    </Pressable>
  );
}
