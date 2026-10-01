import { View, type ViewProps } from 'react-native';
import { AppText, type TextTone, type TextVariant, type TextWeight } from './AppText';

export interface TwoToneNumberProps extends ViewProps {
  /** The prominent part, e.g. `12` or `1,240`. */
  value: string | number;
  /** The quiet trailing part, e.g. `h`, `/20h`, `%`, ` pts`. */
  secondary?: string | number;
  variant?: TextVariant;
  weight?: TextWeight;
  /** Main number tone; defaults to `ink`. */
  tone?: TextTone;
  /** Secondary part tone; defaults to `muted`. */
  secondaryTone?: TextTone;
  /** Logical alignment of the pair. Defaults to `start`. */
  align?: 'start' | 'center' | 'end';
  className?: string;
}

/**
 * The signature two-tone number: main value in ink, unit / context in muted
 * grey (e.g. `12h` + `/20h`). Reads correctly in both directions because the
 * pair is aligned logically and the parts stay in reading order.
 */
export function TwoToneNumber({
  value,
  secondary,
  variant = 'display',
  weight,
  tone = 'ink',
  secondaryTone = 'muted',
  align = 'start',
  className,
  style,
  ...rest
}: TwoToneNumberProps) {
  const justify =
    align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start';

  return (
    <View
      {...rest}
      className={className}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: justify,
        },
        style,
      ]}
    >
      <AppText variant={variant} weight={weight} tone={tone} align={align}>
        {value}
      </AppText>
      {secondary !== undefined && secondary !== null ? (
        <AppText
          variant="bodySm"
          weight="medium"
          tone={secondaryTone}
          align={align}
          className="ms-1"
        >
          {secondary}
        </AppText>
      ) : null}
    </View>
  );
}
