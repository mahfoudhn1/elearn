import { Pressable } from 'react-native';

import type { StudentCourseProgress } from '../../services/api/goals';
import { useTranslation } from '../../hooks/useTranslation';
import { AppText, ProgressBar, Row, Skeleton, Stack } from '../ui';

export interface CourseProgressListProps {
  items: StudentCourseProgress[];
  loading?: boolean;
  onPressCourse?: (courseId: string) => void;
}

/** Per-course lesson progress, reusing the tracking `student/courses/` data. */
export function CourseProgressList({
  items,
  loading = false,
  onPressCourse,
}: CourseProgressListProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Stack gap={16}>
        {[0, 1, 2].map((index) => (
          <Stack key={index} gap={8}>
            <Skeleton width="60%" height={14} />
            <Skeleton height={8} radius={4} />
          </Stack>
        ))}
      </Stack>
    );
  }

  if (items.length === 0) {
    return (
      <AppText variant="bodySm" tone="muted">
        {t('noCourseProgress')}
      </AppText>
    );
  }

  return (
    <Stack gap={18}>
      {items.map((item) => {
        const content = (
          <Stack gap={6}>
            <Row justify="space-between" align="center" gap={8}>
              <AppText variant="bodySm" weight="medium" numberOfLines={1} className="flex-1">
                {item.title}
              </AppText>
              <AppText variant="caption" weight="medium" tone="brand">
                {item.percent}%
              </AppText>
            </Row>
            <ProgressBar value={item.percent} />
            <AppText variant="micro" tone="subtle">
              {item.lessons_completed}/{item.lessons_total} {t('unitLessons')}
            </AppText>
          </Stack>
        );

        if (!onPressCourse) {
          return <Stack key={item.course}>{content}</Stack>;
        }

        return (
          <Pressable
            key={item.course}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => onPressCourse(item.course)}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            {content}
          </Pressable>
        );
      })}
    </Stack>
  );
}
