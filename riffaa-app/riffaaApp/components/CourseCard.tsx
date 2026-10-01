import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';

import { subjectTint } from '../constants/subjects';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { Course } from '../types';
import { formatDate } from '../utils/format';
import { AppText, Badge, Card, ProgressBar, Row, Stack } from './ui';

interface CourseCardProps {
  course: Course;
  onPress: () => void;
  /** Free-text subject used to tint the card border (see `subjectTint`). */
  subject?: string | null;
}

/**
 * Course card: a faux-glass surface with a 16:9 thumbnail, a subject-icon chip,
 * teacher, up to three stat chips and a progress bar only when enrolled.
 * Locked courses keep the same layout and just gain a lock badge.
 */
export function CourseCard({ course, onPress, subject }: CourseCardProps) {
  const { tokens } = useTheme();
  const { t } = useTranslation();

  const tint = subjectTint(subject ?? course.teacher?.teaching_subjects);
  const locked = course.access?.is_locked ?? false;
  const progress = course.progress;
  const published = new Date(course.created_at);

  return (
    <Card
      variant="media"
      subject={subject ?? course.teacher?.teaching_subjects}
      onPress={onPress}
      animateFloat
      className="mb-4"
    >
      <View style={{ width: '100%', aspectRatio: 16 / 9 }} className="bg-surface-2">
        {course.thumbnail ? (
          <Image
            source={{ uri: course.thumbnail }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="book-outline" size={44} color={tokens.brand} />
          </View>
        )}
        {locked ? (
          <View className="absolute right-3 top-3">
            <Badge label={t('locked')} tone="danger" />
          </View>
        ) : null}
      </View>

      <View className="p-4">
        <Row gap={8} align="center" className="mb-1">
          <View
            className="h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: `${tint.color}26` }}
          >
            <Ionicons name={tint.icon} size={15} color={tint.color} />
          </View>
          <AppText variant="title" numberOfLines={1} className="flex-1">
            {course.title}
          </AppText>
        </Row>

        <AppText variant="bodySm" tone="muted" numberOfLines={1}>
          {course.teacher_name}
        </AppText>

        <Row gap={8} wrap className="mt-3">
          <Badge
            label={t('lessonsCount', { count: course.lessons_count })}
            tone="neutral"
          />
          {course.materials_count > 0 ? (
            <Badge
              label={t('materialsCount', { count: course.materials_count })}
              tone="neutral"
            />
          ) : null}
          {course.surveys_count > 0 ? (
            <Badge
              label={t('surveysCount', { count: course.surveys_count })}
              tone="neutral"
            />
          ) : null}
          {progress && progress.total > 0 ? (
            <Badge label={t('enrolled')} tone="brand" />
          ) : null}
        </Row>

        {progress && progress.total > 0 ? (
          <Stack gap={6} className="mt-3">
            <Row justify="space-between">
              <AppText variant="caption" tone="muted">
                {t('progress')}
              </AppText>
              <AppText variant="caption" weight="semibold" tone="brand">
                {progress.percent}%
              </AppText>
            </Row>
            <ProgressBar value={progress.percent} />
          </Stack>
        ) : null}

        {!Number.isNaN(published.getTime()) ? (
          <AppText variant="caption" tone="subtle" className="mt-3">
            {formatDate(published, { day: 'numeric', month: 'short', year: 'numeric' })}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}
