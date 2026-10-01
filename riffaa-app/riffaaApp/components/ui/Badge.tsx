import { View, type ViewProps } from 'react-native';
import { AppText } from './AppText';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'danger' | 'info';

export interface BadgeProps extends ViewProps {
  label: string;
  tone?: BadgeTone;
  className?: string;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2',
  brand: 'bg-brand/15',
  success: 'bg-success/15',
  danger: 'bg-danger/15',
  info: 'bg-info/15',
};

const TEXT_CLASS: Record<BadgeTone, string> = {
  neutral: 'text-ink-muted',
  brand: 'text-brand',
  success: 'text-success',
  danger: 'text-danger',
  info: 'text-info',
};

/** Small status pill. Use `tone` only for meaning, never decoration. */
export function Badge({ label, tone = 'neutral', className, style, ...rest }: BadgeProps) {
  return (
    <View
      {...rest}
      className={`self-start rounded-full px-2 py-0.5 ${TONE_CLASS[tone]}${className ? ` ${className}` : ''}`}
      style={style}
    >
      <AppText variant="caption" weight="semibold" className={TEXT_CLASS[tone]}>
        {label}
      </AppText>
    </View>
  );
}
