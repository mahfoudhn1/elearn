import { createContext, useContext } from 'react';
import type { RefObject } from 'react';
import type { View } from 'react-native';

/**
 * Ref of the single `BlurTargetView` wrapping the shared backdrop.
 *
 * SDK 57's Android blur requires every `BlurView` to reference a
 * `BlurTargetView`; the root layout creates the ref and provides it here so
 * `GlassSurface` can pass it on Android. On iOS it is unused.
 */
export const BlurTargetContext = createContext<RefObject<View | null> | null>(null);

export function useBlurTargetRef(): RefObject<View | null> | null {
  return useContext(BlurTargetContext);
}
