import { Ionicons } from '@expo/vector-icons';
import { Pressable, type ViewProps } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { DirIcon } from './DirIcon';
import { Row } from './Row';
import { Stack } from './Stack';
import type { IoniconName } from './types';

export interface ListItemProps extends Omit<ViewProps, 'children'> {
  title: string;
  subtitle?: string;
  icon?: IoniconName;
  avatar?: { name?: string; url?: string | null };
  leading?: ReactNode;
  trailing?: ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * One row of a grouped list: optional icon/avatar, title + subtitle, a trailing
 * slot and an optional locale-aware chevron.
 */
export function ListItem({
  title,
  subtitle,
  icon,
  avatar,
  leading,
  trailing,
  showChevron = false,
  onPress,
  disabled = false,
  className,
  style,
  ...rest
}: ListItemProps) {
  const { tokens } = useTheme();

  const leadingSlot =
    leading ??
    (avatar ? (
      <Avatar name={avatar.name} url={avatar.url} size={40} />
    ) : icon ? (
      <Row gap={0} align="center" justify="center" className="h-10 w-10 rounded-full bg-surface-2">
        <Ionicons name={icon} size={20} color={tokens.inkMuted} />
      </Row>
    ) : null);

  const row = (
    <Row
      gap={12}
      align="center"
      className={`min-h-[56px] py-3${className ? ` ${className}` : ''}`}
      style={style}
    >
      {leadingSlot}
      <Row gap={8} align="center" className="flex-1">
        <Stack gap={2} className="flex-1">
          <AppText variant="body" weight="medium" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="bodySm" tone="muted" numberOfLines={2}>
              {subtitle}
            </AppText>
          ) : null}
        </Stack>
        {trailing}
        {showChevron ? (
          <DirIcon name="chevron-forward" size={20} color={tokens.inkSubtle} />
        ) : null}
      </Row>
    </Row>
  );

  if (!onPress) {
    return row;
  }

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      {row}
    </Pressable>
  );
}
