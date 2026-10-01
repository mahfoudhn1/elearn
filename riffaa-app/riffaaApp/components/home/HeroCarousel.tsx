import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ScrollView,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useDirection } from '../../hooks/useDirection';
import { PaginationDots } from '../ui/PaginationDots';

export interface HeroCarouselProps {
  /** One node per slide, authored in reading order. */
  slides: ReactNode[];
  className?: string;
  /** Fires with the authored (non-mirrored) slide index. */
  onIndexChange?: (index: number) => void;
}

/**
 * Full-width hero carousel with pagination dots. Slides are reversed for RTL so
 * the first authored slide sits at the START edge in both directions; the
 * reported index is always the authored one.
 */
export function HeroCarousel({ slides, className, onIndexChange }: HeroCarouselProps) {
  const { isRTL } = useDirection();
  const [width, setWidth] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);

  const ordered = useMemo(
    () => (isRTL ? [...slides].reverse() : slides),
    [slides, isRTL],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return;
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      setDisplayIndex(next);
      const authored = isRTL ? slides.length - 1 - next : next;
      onIndexChange?.(authored);
    },
    [width, isRTL, slides.length, onIndexChange],
  );

  return (
    <View className={className} onLayout={handleLayout}>
      {width > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          keyboardShouldPersistTaps="handled"
        >
          {ordered.map((slide, index) => (
            <View key={index} style={{ width }}>
              {slide}
            </View>
          ))}
        </ScrollView>
      ) : null}
      <PaginationDots
        count={ordered.length}
        active={displayIndex}
        className="mt-3 self-center"
      />
    </View>
  );
}
