import { useEffect, useState } from 'react';
import { Animated, Pressable, type LayoutChangeEvent, type ViewProps } from 'react-native';
import { useDirection } from '../../hooks/useDirection';
import { AppText } from './AppText';
import { GlassSurface } from './GlassSurface';
import { Row } from './Row';

export interface SegmentedOption<T extends string = string> {
  label: string;
  value: T;
}

export interface SegmentedControlProps<T extends string = string> extends ViewProps {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

const TRACK_PADDING = 4;

/** Two-to-four way switch: a `glass-1` track with a sliding `glass-2` pill. */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className,
  style,
  ...rest
}: SegmentedControlProps<T>) {
  const { isRTL } = useDirection();
  const [trackWidth, setTrackWidth] = useState(0);
  const [translate] = useState(() => new Animated.Value(0));

  const count = options.length;
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const segmentWidth =
    trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2) / count : 0;
  const restingOffset =
    (isRTL ? count - 1 - activeIndex : activeIndex) * segmentWidth;

  useEffect(() => {
    Animated.spring(translate, {
      toValue: restingOffset,
      useNativeDriver: true,
      bounciness: 4,
      speed: 18,
    }).start();
  }, [restingOffset, translate]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <GlassSurface
      {...rest}
      level="glass-1"
      blur={false}
      radius={16}
      onLayout={handleLayout}
      className={`p-1${className ? ` ${className}` : ''}`}
      style={style}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: TRACK_PADDING,
            bottom: TRACK_PADDING,
            left: TRACK_PADDING,
            width: segmentWidth,
            transform: [{ translateX: translate }],
          }}
        >
          <GlassSurface level="glass-2" tone="brand" radius={12} className="flex-1" />
        </Animated.View>
      ) : null}
      <Row gap={0}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              className="h-11 items-center justify-center rounded-xl"
              style={{ flex: 1, zIndex: 1 }}
            >
              <AppText
                variant="bodySm"
                weight={selected ? 'semibold' : 'medium'}
                className={selected ? 'text-brand' : 'text-ink-muted'}
                numberOfLines={1}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </Row>
    </GlassSurface>
  );
}
