import { Pressable, type ViewProps } from 'react-native';
import { useRowDirection } from '../../hooks/useDirection';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { DirIcon } from './DirIcon';
import { Row } from './Row';
import { Stack } from './Stack';

export interface SectionHeaderProps extends ViewProps {
  /** Tiny eyebrow above the title, e.g. "YOUR WEEK". */
  label?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  className?: string;
}

/**
 * Title row that separates one section from the next: optional micro eyebrow,
 * a mid-weight title and an optional quiet hairline action.
 */
export function SectionHeader({
  label,
  title,
  subtitle,
  action,
  className,
  style,
  ...rest
}: SectionHeaderProps) {
  const { tokens } = useTheme();
  const rowDirection = useRowDirection();

  return (
    <Row
      {...rest}
      gap={12}
      justify="space-between"
      className={`mb-4 min-h-[32px]${className ? ` ${className}` : ''}`}
      style={style}
    >
      <Stack gap={2} className="flex-1">
        {label ? (
          <AppText variant="micro" weight="medium" tone="subtle" className="uppercase tracking-widest">
            {label}
          </AppText>
        ) : null}
        <AppText variant="title">{title}</AppText>
        {subtitle ? (
          <AppText variant="bodySm" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </Stack>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          className="min-h-[44px] items-center gap-1"
          style={({ pressed }) => [rowDirection, { opacity: pressed ? 0.7 : 1 }]}
        >
          <AppText variant="bodySm" weight="medium" tone="muted">
            {action.label}
          </AppText>
          <DirIcon name="chevron-forward" size={16} color={tokens.inkSubtle} />
        </Pressable>
      ) : null}
    </Row>
  );
}
