import { Ionicons } from '@expo/vector-icons';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { Button } from './Button';
import type { IoniconName } from './types';

export interface EmptyStateProps extends ViewProps {
  icon?: IoniconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** Explains why a section is empty and offers the next step. */
export function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
  actionLabel,
  onAction,
  className,
  style,
  ...rest
}: EmptyStateProps) {
  const { tokens } = useTheme();

  return (
    <View
      {...rest}
      className={`items-center justify-center gap-2 px-6 py-8${className ? ` ${className}` : ''}`}
      style={style}
    >
      <View className="h-14 w-14 items-center justify-center rounded-full bg-surface-2">
        <Ionicons name={icon} size={26} color={tokens.inkSubtle} />
      </View>
      <AppText variant="title" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="bodySm" tone="muted" align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} className="mt-2" />
      ) : null}
    </View>
  );
}
