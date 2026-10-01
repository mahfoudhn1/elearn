import { Pressable, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { subjectTint } from '../../constants/subjects';
import { hexToRgba, type GlassTone } from '../../theme/tokens';
import { GlassSurface } from './GlassSurface';

export type CardVariant =
  | 'default'
  | 'raised'
  | 'dense'
  | 'hero'
  | 'nested'
  | 'list'
  | 'stat'
  | 'media';

export interface CardProps extends ViewProps {
  /** Glass density: default/list for content, raised/hero for focal elements. */
  variant?: CardVariant;
  /** Meaningful tint; `hero` defaults to `brand`. */
  tone?: GlassTone;
  /** Free-text subject used to tint only the card border. */
  subject?: string | null;
  /** Override the variant's blur default (`false` = faux glass, e.g. list rows). */
  blur?: boolean;
  /** Subtle float-in animation on mount. */
  animateFloat?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
}

const VARIANT: Record<
  CardVariant,
  { level: 'glass-1' | 'glass-2' | 'glass-3'; padding: string; blur: boolean }
> = {
  default: { level: 'glass-2', padding: 'p-5', blur: true },
  raised: { level: 'glass-2', padding: 'p-6', blur: true },
  dense: { level: 'glass-3', padding: 'p-4', blur: false },
  hero: { level: 'glass-2', padding: 'p-6', blur: true },
  nested: { level: 'glass-1', padding: 'p-4', blur: true },
  list: { level: 'glass-1', padding: 'p-4', blur: false },
  stat: { level: 'glass-2', padding: 'p-5', blur: false },
  media: { level: 'glass-2', padding: 'p-0', blur: false },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Content surface built on `GlassSurface`. Cards rely on fill, border and a
 * soft shadow rather than heavy elevation; only `hero`/`raised` use a real blur
 * by default, which keeps every screen inside the blur budget.
 */
export function Card({
  variant = 'default',
  tone,
  subject,
  blur,
  animateFloat,
  onPress,
  disabled = false,
  className,
  style,
  children,
  ...rest
}: CardProps) {
  const config = VARIANT[variant];
  const resolvedTone = tone ?? (variant === 'hero' ? 'brand' : undefined);
  const useBlur = blur ?? config.blur;
  const pressed = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? 0.985 : 1, { damping: 20, stiffness: 220 }) }],
  }));

  const borderStyle = subject
    ? { borderColor: hexToRgba(subjectTint(subject).color, 0.35) }
    : undefined;

  // Legacy callers pass their own padding; don't ship two conflicting utilities.
  const hasPaddingClass = /(^|\s)(p|px|py|pt|pb|pl|pr|ps|pe)-/.test(className ?? '');
  const classes = `${hasPaddingClass ? '' : config.padding}${className ? ` ${className}` : ''}`;

  if (onPress) {
    return (
      <AnimatedPressable
        {...rest}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          pressed.value = 1;
        }}
        onPressOut={() => {
          pressed.value = 0;
        }}
        style={[pressStyle, disabled ? { opacity: 0.5 } : null]}
      >
        <GlassSurface
          level={config.level}
          tone={resolvedTone}
          blur={useBlur}
          animateFloat={animateFloat}
          className={classes}
          style={[borderStyle, style]}
        >
          {children}
        </GlassSurface>
      </AnimatedPressable>
    );
  }

  return (
    <GlassSurface
      {...rest}
      level={config.level}
      tone={resolvedTone}
      blur={useBlur}
      animateFloat={animateFloat}
      className={classes}
      style={[borderStyle, style]}
    >
      {children}
    </GlassSurface>
  );
}
