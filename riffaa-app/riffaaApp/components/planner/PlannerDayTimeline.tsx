import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { AppText, Badge, Card, IconButton, Row, Stack } from '../ui';
import { subjectTint } from '../../constants/subjects';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { PlannedSession } from '../../services/api/planner';
import type { ScheduleItem } from '../../services/api/schedule';
import { activityKey, blockKindKey } from '../../utils/plannerReasons';

export type TimelineEntryType = 'PLAN' | 'CLASS' | 'TASK';

export interface TimelineEntry {
  key: string;
  entryType?: TimelineEntryType;
  kind: string;
  title: string;
  subtitle?: string;
  subject?: string | null;
  startMin: number;
  endMin: number;
  locked: boolean;
  session?: PlannedSession;
  task?: ScheduleItem;
  completed?: boolean;
}

function formatMin(minute: number): string {
  return `${Math.floor(minute / 60)
    .toString()
    .padStart(2, '0')}:${(minute % 60).toString().padStart(2, '0')}`;
}

const TimelineRow = memo(function TimelineRow({
  entry,
  onPressSession,
  onStartSession,
  onToggleTask,
  onDeleteTask,
}: {
  entry: TimelineEntry;
  onPressSession?: (session: PlannedSession) => void;
  onStartSession?: (session: PlannedSession) => void;
  onToggleTask?: (task: ScheduleItem) => void;
  onDeleteTask?: (task: ScheduleItem) => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  // 1. SMART PLANNED STUDY SESSION
  if (entry.session) {
    const session = entry.session;
    const tint = subjectTint(session.subject);
    const duration = Math.max(1, entry.endMin - entry.startMin);

    return (
      <Pressable
        onPress={() => onPressSession?.(session)}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <Card variant="list" subject={session.subject} className="overflow-hidden">
          <Row gap={12} align="center">
            {/* Subject Personality Accent Bar */}
            <View
              className="w-1.5 self-stretch rounded-pill"
              style={{ backgroundColor: tint.color }}
            />

            {/* Subject Icon in Soft Glow Circle */}
            <View
              className="h-11 w-11 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${tint.color}22` }}
            >
              <Ionicons name={tint.icon} size={22} color={tint.color} />
            </View>

            {/* Title & Metadata */}
            <Stack gap={2} className="flex-1">
              <Row gap={6} align="center" wrap>
                <AppText
                  variant="micro"
                  weight="medium"
                  className="uppercase tracking-widest"
                  style={{ color: tint.color }}
                >
                  {t(activityKey(session.activity_type))}
                </AppText>
                {session.is_locked ? (
                  <Badge label={t('plannerLocked')} tone="neutral" />
                ) : null}
              </Row>
              <AppText variant="body" weight="semibold" numberOfLines={1}>
                {session.subject}
              </AppText>
              <Row gap={8} align="center">
                <AppText variant="caption" tone="muted">
                  {formatMin(entry.startMin)} - {formatMin(entry.endMin)}
                </AppText>
                <View className="h-1 w-1 rounded-full bg-ink-subtle" />
                <AppText variant="caption" tone="muted">
                  {t('plannerDuration', { minutes: duration })}
                </AppText>
              </Row>
            </Stack>

            {/* 1-Tap Start Study Button */}
            {onStartSession ? (
              <Pressable
                onPress={() => onStartSession(session)}
                className="h-10 w-10 items-center justify-center rounded-full bg-brand"
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <Ionicons name="play" size={18} color="#FFFFFF" />
              </Pressable>
            ) : null}
          </Row>
        </Card>
      </Pressable>
    );
  }

  // 2. MANUAL SCHEDULE TASK
  if (entry.task) {
    const task = entry.task;
    const done = entry.completed ?? (task.status === 'COMPLETED');
    const tint = subjectTint(task.subject);

    return (
      <Card variant="list" subject={task.subject} className="overflow-hidden">
        <Row gap={12} align="center">
          <View
            className="w-1.5 self-stretch rounded-pill"
            style={{ backgroundColor: done ? tokens.success : (tint?.color || tokens.brand) }}
          />

          <Stack gap={2} className="flex-1">
            <Row gap={6} align="center" wrap>
              <AppText
                variant="micro"
                weight="medium"
                tone={done ? 'success' : 'brand'}
                className="uppercase tracking-widest"
              >
                {task.subject || (task.item_type === 'EXAM' ? t('exam') : t('task'))}
              </AppText>
              {done ? <Badge label={t('completed')} tone="success" /> : null}
            </Row>
            <AppText
              variant="body"
              weight="medium"
              numberOfLines={2}
              className={done ? 'line-through text-ink-muted' : ''}
            >
              {task.title}
            </AppText>
            <AppText variant="caption" tone="muted">
              {formatMin(entry.startMin)} - {formatMin(entry.endMin)}
              {task.notes ? ` · ${task.notes}` : ''}
            </AppText>
          </Stack>

          <Row gap={6} align="center">
            {onToggleTask ? (
              <IconButton
                icon={done ? 'arrow-undo-outline' : 'checkmark-outline'}
                accessibilityLabel={done ? t('unmarkReviewed') : t('markReviewed')}
                variant={done ? 'success' : 'surface'}
                onPress={() => onToggleTask(task)}
              />
            ) : null}
            {onDeleteTask ? (
              <IconButton
                icon="trash-outline"
                accessibilityLabel={t('deleteLabel')}
                variant="danger"
                onPress={() => onDeleteTask(task)}
              />
            ) : null}
          </Row>
        </Row>
      </Card>
    );
  }

  // 3. FIXED COMMITMENT (School, Live class, Tutoring)
  const isClass = entry.kind === 'GROUP_LESSON' || entry.kind === 'PRIVATE_SESSION';
  const iconName = entry.kind === 'SCHOOL'
    ? 'school-outline'
    : isClass
      ? 'videocam-outline'
      : 'book-outline';

  return (
    <Card variant="list" className="border border-line/50 bg-surface/80">
      <Row gap={12} align="center">
        <View
          className="w-1.5 self-stretch rounded-pill"
          style={{ backgroundColor: tokens.info }}
        />
        <View
          className="h-10 w-10 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${tokens.info}20` }}
        >
          <Ionicons name={iconName} size={20} color={tokens.info} />
        </View>
        <Stack gap={2} className="flex-1">
          <Row gap={6} align="center">
            <AppText
              variant="micro"
              weight="medium"
              className="uppercase tracking-widest"
              style={{ color: tokens.info }}
            >
              {t(blockKindKey(entry.kind))}
            </AppText>
            <Badge label={t('plannerLocked')} tone="neutral" />
          </Row>
          <AppText variant="body" weight="medium" numberOfLines={1}>
            {entry.title}
          </AppText>
          <AppText variant="caption" tone="muted">
            {formatMin(entry.startMin)} - {formatMin(entry.endMin)}
          </AppText>
        </Stack>
      </Row>
    </Card>
  );
});

/**
 * Unified Daily Timeline: Combines smart planned sessions, fixed commitments (school/classes),
 * and manual schedule tasks into a seamless, high-polish schedule view.
 */
export function PlannerDayTimeline({
  entries,
  onPressSession,
  onStartSession,
  onToggleTask,
  onDeleteTask,
  emptyLabel,
}: {
  entries: TimelineEntry[];
  onPressSession?: (session: PlannedSession) => void;
  onStartSession?: (session: PlannedSession) => void;
  onToggleTask?: (task: ScheduleItem) => void;
  onDeleteTask?: (task: ScheduleItem) => void;
  emptyLabel: string;
}) {
  if (entries.length === 0) {
    return (
      <Card variant="list" className="py-8 items-center justify-center">
        <Ionicons name="calendar-outline" size={32} color="#8A8F9C" />
        <AppText variant="bodySm" tone="muted" align="center" className="mt-2">
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
      renderItem={({ item }) => (
        <TimelineRow
          entry={item}
          onPressSession={onPressSession}
          onStartSession={onStartSession}
          onToggleTask={onToggleTask}
          onDeleteTask={onDeleteTask}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}

