import { Ionicons } from '@expo/vector-icons';
import { Pressable, type ViewProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { IoniconName } from './types';

export type IconButtonVariant = 'ghost' | 'surface' | 'brand' | 'success' | 'danger';

export interface IconButtonProps extends Omit<ViewProps, 'children'> {
  icon: IoniconName;
  onPress?: () => void;
  /** Required: every icon-only control needs a translated label. */
  accessibilityLabel: string;
  size?: number;
  variant?: IconButtonVariant;
  disabled?: boolean;
  className?: string;
}

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
  ghost: 'bg-transparent',
  surface: 'bg-surface-2 border border-line',
  brand: 'bg-brand/15 border border-brand/30',
  success: 'bg-success/15 border border-success/30',
  danger: 'bg-danger/15 border border-danger/30',
};

/**
 * Square icon-only control. Always 44×44 minimum and always labelled for
 * screen readers.
 */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 24,
  variant = 'ghost',
  disabled = false,
  className,
  style,
  ...rest
}: IconButtonProps) {
  const { tokens } = useTheme();
  const iconColor =
    variant === 'brand'
      ? tokens.brand
      : variant === 'success'
        ? tokens.success
        : variant === 'danger'
          ? tokens.danger
          : tokens.ink;

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`h-11 w-11 items-center justify-center rounded-full ${VARIANT_CLASS[variant]}${disabled ? ' opacity-40' : ''}${className ? ` ${className}` : ''}`}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, style]}
    >
      <Ionicons name={icon} size={size} color={iconColor} />
    </Pressable>
  );
}
