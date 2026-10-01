import { useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height of the floating glass tab bar. */
export const TAB_BAR_HEIGHT = 64;
/** Gap between the tab bar and the bottom safe-area edge. */
export const TAB_BAR_BOTTOM_GAP = 8;

/** Distance from the screen bottom to the top of the floating tab bar. */
export function tabBarOffset(bottomInset: number): number {
  return Math.max(bottomInset, 12) + TAB_BAR_BOTTOM_GAP + TAB_BAR_HEIGHT;
}

/**
 * Bottom padding a screen must reserve so its last item clears the floating tab
 * bar. Outside the tab navigator it is just the device inset + 16.
 */
export function useBottomInset(): number {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const insideTabs = segments[0] === '(tabs)';

  if (!insideTabs) {
    return insets.bottom + 16;
  }
  return tabBarOffset(insets.bottom) + 16;
}
