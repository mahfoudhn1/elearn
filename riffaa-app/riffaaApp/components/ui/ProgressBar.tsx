import { View, type ViewProps } from 'react-native';

export interface ProgressBarProps extends ViewProps {
  /** Completion percentage, 0–100. */
  value: number;
  height?: number;
  className?: string;
}

/** Flat progress track with a `brand` fill. */
export function ProgressBar({ value, height = 8, className, style, ...rest }: ProgressBarProps) {
  const percentage = Math.max(0, Math.min(100, value));

  return (
    <View
      {...rest}
      className={`w-full overflow-hidden rounded-full bg-surface-2${className ? ` ${className}` : ''}`}
      style={[{ height }, style]}
    >
      <View
        className="h-full rounded-full bg-brand"
        style={{ width: `${percentage}%` }}
      />
    </View>
  );
}
