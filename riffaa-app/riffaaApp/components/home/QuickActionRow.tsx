import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Chip } from '../ui/Chip';
import { Row } from '../ui/Row';
import type { IoniconName } from '../ui/types';

export interface QuickAction {
  key: string;
  label: string;
  icon?: IoniconName;
  onPress?: () => void;
}

export interface QuickActionRowProps {
  actions: QuickAction[];
  /** Accessibility label for the leading "+" control. */
  addLabel: string;
  onAdd?: () => void;
  className?: string;
}

/**
 * Horizontal quick-action strip: a solid circular "+" at the START, then
 * outlined pill chips. The strip runs to the viewport edge with no trailing
 * padding so the last chip is clipped, hinting that it scrolls.
 */
export function QuickActionRow({ actions, addLabel, onAdd, className }: QuickActionRowProps) {
  const { tokens } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      className={className}
      contentContainerStyle={{ paddingStart: 20 }}
    >
      <Row gap={10} align="center" className="pe-0">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={addLabel}
          onPress={onAdd}
          className="h-11 w-11 items-center justify-center rounded-pill bg-ink"
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="add" size={22} color={tokens.bg} />
        </Pressable>
        {actions.map((action) => (
          <Chip
            key={action.key}
            label={action.label}
            icon={action.icon}
            onPress={action.onPress}
          />
        ))}
      </Row>
    </ScrollView>
  );
}
