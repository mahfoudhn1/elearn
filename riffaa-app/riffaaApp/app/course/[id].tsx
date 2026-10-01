import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Animated, Image, Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  GhostNumber,
  ProgressBar,
  Row,
  ScreenHeader,
  SegmentedControl,
  Skeleton,
  Stack,
  TwoToneNumber,
} from '../../components/ui';
import { subjectTint } from '../../constants/subjects';
import { useCourse } from '../../hooks/useCourses';
import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { describeApiError } from '../../services/api';
import type { LessonMaterial } from '../../types';

type CourseTab = 'lessons' | 'materials' | 'surveys';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const { isRTL } = useDirection();
  const { t } = useTranslation();
  const { data: course, isLoading, isError, error, refetch } = useCourse(id);

  const [tab, setTab] = useState<CourseTab>('lessons');
  const [scrollY] = useState(() => new Animated.Value(0));
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true },
  );

  const nextLesson = useMemo(() => {
    const lessons = course?.lessons ?? [];
    return lessons.find((lesson) => !lesson.is_finished) ?? lessons[0];
  }, [course?.lessons]);

  // Group lessons under their section, preserving order; section-less lessons
  // fall into a trailing untitled group.
  const lessonGroups = useMemo(() => {
    const allLessons = [...(course?.lessons ?? [])].sort((a, b) => a.order - b.order);
    const sections = [...(course?.sections ?? [])].sort((a, b) => a.order - b.order);
    const groups: { id: string; title: string | null; lessons: typeof allLessons }[] = [];

    for (const section of sections) {
      const sectionLessons = allLessons.filter(
        (lesson) => lesson.section && String(lesson.section) === String(section.id),
      );
      if (sectionLessons.length > 0) {
        groups.push({ id: section.id, title: section.title, lessons: sectionLessons });
      }
    }

    const loose = allLessons.filter((lesson) => !lesson.section);
    if (loose.length > 0) {
      groups.push({ id: '__unassigned__', title: null, lessons: loose });
    }

    if (groups.length === 0 && allLessons.length > 0) {
      groups.push({ id: '__all__', title: null, lessons: allLessons });
    }
    return groups;
  }, [course?.lessons, course?.sections]);

  const openMaterial = async (material: LessonMaterial) => {
    const target = material.file || material.url;
    if (!target) return;
    const supported = await Linking.canOpenURL(target);
    if (supported) await Linking.openURL(target);
  };

  const openLesson = (lessonId: string) => {
    router.push({
      pathname: '/player/[lessonId]',
      params: { lessonId: String(lessonId), courseId: String(course?.id ?? id) },
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 px-4" style={{ paddingTop: insets.top + 60 }}>
        <Stack gap={16}>
          <Skeleton height={200} radius={32} />
          <Skeleton height={140} radius={32} />
          <Skeleton height={72} radius={28} />
        </Stack>
      </View>
    );
  }

  if (isError || !course) {
    return (
      <View className="flex-1">
        <ScreenHeader title={t('courseLocked')} />
        <ErrorState
          error={error}
          message={describeApiError(error) || t('courseLockedBody')}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  const progress = course.progress;
  const lessons = course.lessons ?? [];
  const materials = course.materials ?? [];
  const surveys = course.surveys ?? [];
  const tint = subjectTint(course.teacher?.teaching_subjects);
  const percent = progress?.percent ?? 0;

  return (
    <View className="flex-1">
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 108 }}
      >
        <View className="px-4 pt-3">
          {/* Media */}
          <View
            className="overflow-hidden rounded-hero bg-surface-2"
            style={{ width: '100%', aspectRatio: 16 / 9 }}
          >
            {course.thumbnail ? (
              <Image
                source={{ uri: course.thumbnail }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Ionicons name="book-outline" size={56} color={tokens.brand} />
              </View>
            )}
          </View>

          {/* Identity + progress */}
          <Card variant="hero" tone="brand" className="mt-4 overflow-hidden">
            <GhostNumber
              value={String(percent)}
              size={112}
              style={{
                position: 'absolute',
                top: -20,
                ...(isRTL ? { left: -6 } : { right: -6 }),
              }}
            />
            <Row gap={6} align="center" className="mb-2">
              <View
                className="h-6 w-6 items-center justify-center rounded-pill"
                style={{ backgroundColor: `${tint.color}26` }}
              >
                <Ionicons name={tint.icon} size={13} color={tint.color} />
              </View>
              <AppText
                variant="micro"
                weight="medium"
                className="uppercase tracking-widest"
                style={{ color: tint.color }}
              >
                {course.teacher?.teaching_subjects || t('subjectFallback')}
              </AppText>
            </Row>
            <AppText variant="heading" numberOfLines={2}>
              {course.title}
            </AppText>
            <AppText variant="bodySm" tone="muted" className="mt-1" numberOfLines={1}>
              {course.teacher_name}
            </AppText>

            <View className="mt-4">
              <TwoToneNumber
                value={`${percent}%`}
                secondary={t('progress')}
                variant="displayLg"
              />
            </View>
            <View className="mt-3">
              <ProgressBar value={percent} />
            </View>
            {progress ? (
              <AppText variant="caption" tone="muted" className="mt-2">
                {progress.completed}/{progress.total} · {t('lessons')}
              </AppText>
            ) : null}
            {course.description ? (
              <AppText variant="bodySm" tone="muted" className="mt-3">
                {course.description}
              </AppText>
            ) : null}
          </Card>

          <SegmentedControl<CourseTab>
            className="mt-4"
            options={[
              { label: t('lessons'), value: 'lessons' },
              { label: t('materials'), value: 'materials' },
              { label: t('surveys'), value: 'surveys' },
            ]}
            value={tab}
            onChange={setTab}
          />

          <Stack gap={12} className="mt-4">
            {tab === 'lessons' ? (
              lessons.length === 0 ? (
                <EmptyState icon="book-outline" title={t('noLessons')} />
              ) : (
                lessonGroups.map((group) => (
                  <Stack key={group.id} gap={8}>
                    {group.title ? (
                      <AppText
                        variant="micro"
                        weight="medium"
                        tone="subtle"
                        className="uppercase tracking-widest"
                      >
                        {group.title}
                      </AppText>
                    ) : null}
                    {group.lessons.map((lesson) => (
                      <Card key={lesson.id} variant="list" onPress={() => openLesson(lesson.id)}>
                        <Row gap={12} align="center">
                          <View
                            className={`h-10 w-10 items-center justify-center rounded-pill ${
                              lesson.is_finished ? 'bg-success/15' : 'bg-brand/15'
                            }`}
                          >
                            {lesson.is_finished ? (
                              <Ionicons name="checkmark" size={20} color={tokens.success} />
                            ) : (
                              <AppText variant="bodySm" weight="medium" tone="brand">
                                {lesson.order}
                              </AppText>
                            )}
                          </View>
                          <Stack gap={2} className="flex-1">
                            <AppText variant="body" weight="medium" numberOfLines={1}>
                              {lesson.title}
                            </AppText>
                            {lesson.materials_count ? (
                              <AppText variant="micro" tone="subtle">
                                {t('materialsCount', { count: lesson.materials_count })}
                              </AppText>
                            ) : null}
                          </Stack>
                          <Ionicons name="play-circle-outline" size={22} color={tokens.inkSubtle} />
                        </Row>
                      </Card>
                    ))}
                  </Stack>
                ))
              )
            ) : null}

            {tab === 'materials' ? (
              materials.length === 0 ? (
                <EmptyState icon="document-outline" title={t('noMaterials')} />
              ) : (
                materials.map((material) => (
                  <Card
                    key={material.id}
                    variant="list"
                    onPress={() => void openMaterial(material)}
                  >
                    <Row gap={12} align="center">
                      <View className="h-10 w-10 items-center justify-center rounded-pill bg-info/15">
                        <Ionicons name="document-text-outline" size={20} color={tokens.info} />
                      </View>
                      <AppText variant="body" weight="medium" numberOfLines={1} className="flex-1">
                        {material.title}
                      </AppText>
                      <Ionicons name="download-outline" size={20} color={tokens.inkSubtle} />
                    </Row>
                  </Card>
                ))
              )
            ) : null}

            {tab === 'surveys' ? (
              surveys.length === 0 ? (
                <EmptyState icon="help-circle-outline" title={t('noSurveys')} />
              ) : (
                surveys.map((survey) => (
                  <Card
                    key={survey.id}
                    variant="list"
                    onPress={() =>
                      router.push({
                        pathname: '/survey/[id]',
                        params: { id: String(survey.id), courseId: String(course.id) },
                      })
                    }
                  >
                    <Row gap={12} align="center">
                      <View className="h-10 w-10 items-center justify-center rounded-pill bg-brand/15">
                        <Ionicons name="help-circle-outline" size={20} color={tokens.brand} />
                      </View>
                      <Stack gap={2} className="flex-1">
                        <AppText variant="body" weight="medium" numberOfLines={1}>
                          {survey.title}
                        </AppText>
                        <AppText variant="micro" tone="subtle">
                          {t('surveysCount', { count: survey.questions_count })}
                        </AppText>
                      </Stack>
                      {survey.questions_count > 0 ? (
                        <Badge label={t('survey')} tone="brand" />
                      ) : null}
                    </Row>
                  </Card>
                ))
              )
            ) : null}
          </Stack>
        </View>
      </Animated.ScrollView>

      {/* Overlaid header: one back control, blur fades in on scroll. */}
      <View className="absolute left-0 right-0 top-0">
        <ScreenHeader title="" scrollY={scrollY} />
      </View>

      {/* Sticky primary action for the next unfinished lesson. */}
      <View
        className="absolute left-0 right-0 bottom-0 px-4"
        style={{ paddingBottom: insets.bottom + 12, paddingTop: 8 }}
      >
        <Button
          label={progress && progress.completed > 0 ? t('resume') : t('startCourse')}
          icon={progress && progress.completed > 0 ? 'play' : 'school-outline'}
          fullWidth
          disabled={!nextLesson}
          onPress={() => nextLesson && openLesson(nextLesson.id)}
        />
      </View>
    </View>
  );
}
