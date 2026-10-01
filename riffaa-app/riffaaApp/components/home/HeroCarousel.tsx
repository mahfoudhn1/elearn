import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  LayoutAnimation,
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
  const [slideHeights, setSlideHeights] = useState<number[]>([]);
  const scrollRef = useRef<ScrollView | null>(null);

  const ordered = useMemo(
    () => (isRTL ? [...slides].reverse() : slides),
    [slides, isRTL],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const handleSlideLayout = useCallback((index: number, event: LayoutChangeEvent) => {
    const height = Math.ceil(event.nativeEvent.layout.height);
    setSlideHeights((current) => {
      if (current[index] === height) return current;
      const next = [...current];
      next[index] = height;
      return next;
    });
  }, []);

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return;
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      if (next !== displayIndex) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setDisplayIndex(next);
      const authored = isRTL ? slides.length - 1 - next : next;
      onIndexChange?.(authored);
    },
    [width, displayIndex, isRTL, slides.length, onIndexChange],
  );

  return (
    <View className={className} onLayout={handleLayout}>
      {width > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={slideHeights[displayIndex] ? { height: slideHeights[displayIndex] } : undefined}
          onMomentumScrollEnd={handleMomentumEnd}
          keyboardShouldPersistTaps="handled"
        >
          {ordered.map((slide, index) => (
            <View
              key={index}
              onLayout={(event) => handleSlideLayout(index, event)}
              style={{ width, alignSelf: 'flex-start' }}
            >
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
