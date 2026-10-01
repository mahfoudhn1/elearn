import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useRowDirection } from '../../hooks/useDirection';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { DirIcon } from './DirIcon';
import type { IoniconName } from './types';

const DIRECTIONAL_ICONS = new Set<string>([
  'chevron-forward',
  'chevron-back',
  'arrow-forward',
  'arrow-back',
]);

/** Renders a leading/trailing glyph, mirroring directional ones for RTL. */
function ButtonIcon({ name, size, color }: { name: IoniconName; size: number; color: string }) {
  if (DIRECTIONAL_ICONS.has(name)) {
    return (
      <DirIcon
        name={name as 'chevron-forward' | 'chevron-back' | 'arrow-forward' | 'arrow-back'}
        size={size}
        color={color}
      />
    );
  }
  return <Ionicons name={name} size={size} color={color} />;
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ViewProps, 'children'> {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Leading glyph, in reading order. */
  icon?: IoniconName;
  /** Optional trailing glyph (e.g. a directional arrow). */
  trailingIcon?: IoniconName;
  className?: string;
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-11 px-5',
  md: 'h-12 px-6',
  lg: 'h-14 px-7',
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-brand',
  secondary: 'bg-surface-2 border border-line',
  ghost: 'bg-transparent',
  danger: 'bg-danger',
};

const LABEL_TEXT_CLASS: Record<ButtonVariant, string> = {
  primary: 'text-on-brand',
  secondary: 'text-ink',
  ghost: 'text-brand',
  danger: 'text-on-brand',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Glass action button. Fully rounded, height never drops below the 44px touch
 * target, and the label uses the `on-brand` token so orange stays legible.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  trailingIcon,
  className,
  style,
  ...rest
}: ButtonProps) {
  const { tokens } = useTheme();
  const rowDirection = useRowDirection();
  const inactive = disabled || loading;
  const pressed = useSharedValue(0);
  const labelVariant = size === 'sm' ? 'bodySm' : 'body';
  const iconColor =
    variant === 'primary' || variant === 'danger'
      ? tokens.onBrand
      : variant === 'ghost'
        ? tokens.brand
        : tokens.ink;
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? 0.975 : 1, { damping: 18, stiffness: 260 }) }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityLabel={label}
      disabled={inactive}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      className={`items-center justify-center gap-2 rounded-pill ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]}${fullWidth ? ' w-full' : ''}${inactive ? ' opacity-50' : ''}${className ? ` ${className}` : ''}`}
      style={[rowDirection, pressStyle, style]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' ? tokens.ink : tokens.onBrand}
        />
      ) : (
        <>
          {icon ? (
            <ButtonIcon name={icon} size={size === 'sm' ? 18 : 20} color={iconColor} />
          ) : null}
          <AppText
            weight="medium"
            variant={labelVariant}
            className={LABEL_TEXT_CLASS[variant]}
            numberOfLines={1}
          >
            {label}
          </AppText>
          {trailingIcon ? (
            <ButtonIcon name={trailingIcon} size={size === 'sm' ? 18 : 20} color={iconColor} />
          ) : null}
        </>
      )}
    </AnimatedPressable>
  );
}
