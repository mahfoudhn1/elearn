import type { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  View,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useTheme } from '../../hooks/useTheme';

export interface ScreenProps extends ViewProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (implied by `onRefresh`). */
  scroll?: boolean;
  /** Apply the standard 16px horizontal screen padding. Defaults to true. */
  padded?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Safe-area edges to pad. Screens are transparent, so only `top`/`bottom`. */
  edges?: { top?: boolean; bottom?: boolean };
  contentContainerClassName?: string;
  className?: string;
}

/**
 * Transparent, safe-area aware screen container. The shared `AppBackground`
 * shows through; the bottom inset reserves room for the floating tab bar so
 * content scrolls under the glass and the last row stays reachable.
 */
export function Screen({
  children,
  scroll,
  padded = true,
  onRefresh,
  refreshing = false,
  edges,
  contentContainerClassName,
  className,
  style,
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { tokens } = useTheme();

  const paddingTop = edges?.top ? insets.top : 0;
  const paddingBottom = edges?.bottom === false ? 0 : bottomInset;
  const paddingHorizontal = padded ? 16 : 0;
  const shouldScroll = scroll ?? Boolean(onRefresh);

  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={tokens.brand}
      colors={[tokens.brand]}
    />
  ) : undefined;

  if (shouldScroll) {
    return (
      <ScrollView
        {...rest}
        className={`flex-1${className ? ` ${className}` : ''}`}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop,
          paddingBottom,
          paddingHorizontal,
        }}
        contentContainerClassName={contentContainerClassName}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
        style={style}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      {...rest}
      className={`flex-1${className ? ` ${className}` : ''}`}
      style={[{ paddingTop, paddingBottom, paddingHorizontal }, style]}
    >
      {children}
    </View>
  );
}
