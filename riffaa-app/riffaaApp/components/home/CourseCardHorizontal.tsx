import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';

import { subjectTint } from '../../constants/subjects';
import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { Course } from '../../types';
import { AppText, Badge, Card, ProgressBar, Row, Stack } from '../ui';

interface CourseCardHorizontalProps {
  course: Course;
  onPress: () => void;
  /** Free-text subject used to tint the card border (see `subjectTint`). */
  subject?: string | null;
}

/**
 * Compact horizontal course card: a square thumbnail beside the title,
 * instructor, stat badges and a micro progress bar, so metadata stays visible
 * instead of being buried under a tall image.
 */
export function CourseCardHorizontal({ course, onPress, subject }: CourseCardHorizontalProps) {
  const { tokens } = useTheme();
  const { isRTL } = useDirection();
  const { t } = useTranslation();

  const tint = subjectTint(subject ?? course.teacher?.teaching_subjects);
  const locked = course.access?.is_locked ?? false;
  const progress = course.progress;

  return (
    <Card
      variant="list"
      subject={subject ?? course.teacher?.teaching_subjects}
      onPress={onPress}
      className="w-80 flex-shrink-0"
    >
      <Row gap={12} align="flex-start">
        <View className="relative flex-shrink-0">
          <View className="h-20 w-20 overflow-hidden rounded-xl bg-surface-2">
            {course.thumbnail ? (
              <Image
                source={{ uri: course.thumbnail }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Ionicons name="book-outline" size={24} color={tokens.brand} />
              </View>
            )}
          </View>
          {locked ? (
            <View
              className="absolute top-1"
              style={isRTL ? { left: 4 } : { right: 4 }}
            >
              <Badge label={t('locked')} tone="danger" />
            </View>
          ) : null}
        </View>

        <View className="min-w-0 flex-1">
          <Row gap={8} align="center" className="mb-1">
            <View
              className="h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${tint.color}26` }}
            >
              <Ionicons name={tint.icon} size={15} color={tint.color} />
            </View>
            <AppText variant="title" numberOfLines={1} className="flex-1">
              {course.title}
            </AppText>
          </Row>

          <AppText variant="bodySm" tone="muted" numberOfLines={1} className="mb-2">
            {course.teacher_name}
          </AppText>

          <Row gap={6} wrap className="mb-2">
            <Badge label={t('lessonsCount', { count: course.lessons_count })} tone="neutral" />
            {course.materials_count > 0 ? (
              <Badge label={t('materialsCount', { count: course.materials_count })} tone="neutral" />
            ) : null}
            {course.surveys_count > 0 ? (
              <Badge label={t('surveysCount', { count: course.surveys_count })} tone="neutral" />
            ) : null}
            {progress && progress.total > 0 ? (
              <Badge label={t('enrolled')} tone="brand" />
            ) : null}
          </Row>

          {progress && progress.total > 0 ? (
            <Stack gap={4}>
              <Row justify="space-between">
                <AppText variant="caption" tone="muted">
                  {t('progress')}
                </AppText>
                <AppText variant="caption" weight="semibold" tone="brand">
                  {progress.percent}%
                </AppText>
              </Row>
              <ProgressBar value={progress.percent} height={6} />
            </Stack>
          ) : null}
        </View>
      </Row>
    </Card>
  );
}
