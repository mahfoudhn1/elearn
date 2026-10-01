import { View, type FlexAlignType, type ViewProps, type ViewStyle } from 'react-native';

export interface StackProps extends ViewProps {
  gap?: number;
  align?: FlexAlignType;
  justify?: ViewStyle['justifyContent'];
  className?: string;
}

/** Vertical layout with a consistent gap between children. */
export function Stack({
  gap = 0,
  align = 'stretch',
  justify,
  className,
  style,
  children,
  ...rest
}: StackProps) {
  return (
    <View
      {...rest}
      className={className}
      style={[{ flexDirection: 'column', alignItems: align, justifyContent: justify, gap }, style]}
    >
      {children}
    </View>
  );
}
