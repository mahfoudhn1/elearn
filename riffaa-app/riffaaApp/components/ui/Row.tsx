import { View, type FlexAlignType, type ViewProps, type ViewStyle } from 'react-native';
import { useDirection } from '../../hooks/useDirection';

export interface RowProps extends ViewProps {
  gap?: number;
  align?: FlexAlignType;
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  className?: string;
}

/**
 * Horizontal layout that reverses with the locale. Use this instead of
 * hand-written `flex-row-reverse`.
 */
export function Row({
  gap = 0,
  align = 'center',
  justify,
  wrap = false,
  className,
  style,
  children,
  ...rest
}: RowProps) {
  const { isRTL } = useDirection();

  return (
    <View
      {...rest}
      className={className}
      style={[
        {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
          gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
