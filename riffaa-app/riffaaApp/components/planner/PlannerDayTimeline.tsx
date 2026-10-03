import { memo } from 'react';
import { FlatList, View } from 'react-native';

import { AppText, Badge, Card, Row, Stack } from '../ui';
import { useTranslation } from '../../hooks/useTranslation';
import { useTheme } from '../../hooks/useTheme';
import type { PlannedSession } from '../../services/api/planner';
import { activityKey, blockKindKey } from '../../utils/plannerReasons';

export interface TimelineEntry {
  key: string;
  kind: string;
  title: string;
  startMin: number;
  endMin: number;
  locked: boolean;
  session?: PlannedSession;
}

function formatMin(minute: number): string {
  return `${Math.floor(minute / 60)
    .toString()
    .padStart(2, '0')}:${(minute % 60).toString().padStart(2, '0')}`;
}

const TimelineRow = memo(function TimelineRow({
  entry,
  onPress,
}: {
  entry: TimelineEntry;
  onPress?: (session: PlannedSession) => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const planned = Boolean(entry.session);
  const barColor = planned ? tokens.brand : tokens.line;

  const content = (
    <Card variant="list" subject={entry.session?.subject ?? null}>
      <Row gap={12} align="flex-start">
        <View className="mt-1 w-1 self-stretch rounded-pill" style={{ backgroundColor: barColor, width: 4 }} />
        <Stack gap={2} className="flex-1">
          <Row gap={8} align="center" wrap>
            <AppText
              variant="micro"
              weight="medium"
              tone={planned ? 'brand' : 'muted'}
              className="uppercase tracking-widest"
            >
              {planned && entry.session
                ? t(activityKey(entry.session.activity_type))
                : t(blockKindKey(entry.kind))}
            </AppText>
            {entry.locked ? <Badge label={t('plannerLocked')} tone="neutral" /> : null}
          </Row>
          <AppText variant="body" weight="medium" numberOfLines={2} tone={planned ? 'ink' : 'muted'}>
            {entry.title}
          </AppText>
          <AppText variant="caption" tone="muted">
            {formatMin(entry.startMin)} - {formatMin(entry.endMin)}
          </AppText>
        </Stack>
      </Row>
    </Card>
  );

  if (entry.session && onPress) {
    return (
      <View style={{ opacity: 1 }}>
        <View onStartShouldSetResponder={() => true} onResponderRelease={() => onPress(entry.session!)}>
          {content}
        </View>
      </View>
    );
  }
  return <View style={{ opacity: entry.locked ? 0.6 : 1 }}>{content}</View>;
});

/**
 * One day's timeline: locked busy blocks (school/class/tutoring, grayed) plus
 * planned sessions. Virtualized and memoized so a busy week stays smooth.
 */
export function PlannerDayTimeline({
  entries,
  onPressSession,
  emptyLabel,
}: {
  entries: TimelineEntry[];
  onPressSession?: (session: PlannedSession) => void;
  emptyLabel: string;
}) {
  if (entries.length === 0) {
    return (
      <Card variant="list">
        <AppText variant="bodySm" tone="muted" align="center">
          {emptyLabel}
        </AppText>
      </Card>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(entry) => entry.key}
      scrollEnabled={false}
      renderItem={({ item }) => <TimelineRow entry={item} onPress={onPressSession} />}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}
