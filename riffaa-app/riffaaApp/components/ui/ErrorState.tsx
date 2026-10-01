import { Ionicons } from '@expo/vector-icons';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { describeApiError } from '../../services/api/client';
import { AppText } from './AppText';
import { Button } from './Button';

export interface ErrorStateProps extends ViewProps {
  /** Raw error from a query/mutation; rendered through `describeApiError`. */
  error?: unknown;
  /** Overrides the derived message. */
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Inline error with a retry action. Falls back to `describeApiError` so offline
 * and unreachable-server cases read differently.
 */
export function ErrorState({
  error,
  message,
  onRetry,
  retryLabel,
  className,
  style,
  ...rest
}: ErrorStateProps) {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const text = message ?? (error ? describeApiError(error) : t('genericError'));

  return (
    <View
      {...rest}
      className={`items-center justify-center gap-2 px-6 py-6${className ? ` ${className}` : ''}`}
      style={style}
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-danger/15">
        <Ionicons name="alert-circle-outline" size={24} color={tokens.danger} />
      </View>
      <AppText variant="bodySm" tone="muted" align="center">
        {text}
      </AppText>
      {onRetry ? (
        <Button
          label={retryLabel ?? t('retry')}
          variant="secondary"
          size="sm"
          onPress={onRetry}
          className="mt-1"
        />
      ) : null}
    </View>
  );
}
