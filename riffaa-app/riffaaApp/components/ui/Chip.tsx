import { Ionicons } from '@expo/vector-icons';
import { Pressable, type ViewProps } from 'react-native';
import { useRowDirection } from '../../hooks/useDirection';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import type { IoniconName } from './types';

export interface ChipProps extends Omit<ViewProps, 'children'> {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IoniconName;
  className?: string;
}

/**
 * Selectable outlined pill. Selected uses a soft `brand` tint so orange marks
 * the active choice without becoming wallpaper; unselected is a hairline
 * outline over the background.
 */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  className,
  style,
  ...rest
}: ChipProps) {
  const { tokens } = useTheme();
  const rowDirection = useRowDirection();
  const content = (
    <>
      {icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={selected ? tokens.brand : tokens.inkMuted}
        />
      ) : null}
      <AppText
        variant="bodySm"
        weight={selected ? 'medium' : 'regular'}
        className={selected ? 'text-brand' : 'text-ink-muted'}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </>
  );

  const classes = `h-11 items-center gap-1.5 rounded-pill border px-4 ${
    selected ? 'bg-brand/15 border-brand/40' : 'bg-transparent border-hairline'
  }${className ? ` ${className}` : ''}`;

  if (!onPress) {
    return (
      <Pressable {...rest} className={classes} style={[rowDirection, style]} accessibilityRole="text">
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={classes}
      style={({ pressed }) => [rowDirection, { opacity: pressed ? 0.85 : 1 }, style]}
    >
      {content}
    </Pressable>
  );
}
