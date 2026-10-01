import { View, type ViewProps } from 'react-native';

export interface DividerProps extends ViewProps {
  className?: string;
}

/** 1px separator using the `line` token. */
export function Divider({ className, style, ...rest }: DividerProps) {
  return <View {...rest} className={`h-px w-full bg-line${className ? ` ${className}` : ''}`} style={style} />;
}
