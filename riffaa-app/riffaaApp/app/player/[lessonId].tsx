import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  Card,
  DirIcon,
  Divider,
  ListItem,
  Row,
  ScreenHeader,
  Stack,
} from '../../components/ui';
import {
  useCourse,
  useCourseMaterials,
  useLessonPlayback,
  useLessonPositionMutation,
  useLessonProgressMutation,
} from '../../hooks/useCourses';
import { useTheme } from '../../hooks/useTheme';
import { StartStudyButton } from '../../components/StartStudyButton';
import { useTranslation } from '../../hooks/useTranslation';
import { trackActivity } from '../../services/api';

export default function PlayerScreen() {
  const { lessonId, courseId } = useLocalSearchParams<{
    lessonId: string;
    courseId: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const { t } = useTranslation();

  const { data: course } = useCourse(courseId);
  const { data: materials = [] } = useCourseMaterials(courseId);
  const { complete, uncomplete } = useLessonProgressMutation(courseId);
  const positionMutation = useLessonPositionMutation(courseId);

  const lessons = useMemo(() => course?.lessons ?? [], [course?.lessons]);
  const lesson = useMemo(
    () => lessons.find((item) => String(item.id) === String(lessonId)),
    [lessons, lessonId],
  );
  const index = useMemo(
    () => lessons.findIndex((item) => String(item.id) === String(lessonId)),
    [lessons, lessonId],
  );
  const nextLesson = index >= 0 ? lessons[index + 1] : undefined;
  const lessonMaterials = materials.filter(
    (material) => material.lesson && String(material.lesson) === String(lessonId),
  );

  // Prefer the subscription-checked, signed URL from `playback/`. The raw
  // `lesson.video` field is only a legacy fallback for older uploads.
  const { data: playback } = useLessonPlayback(lesson?.video_asset);
  const source = playback?.url ?? lesson?.video ?? null;

  // `expo-av` was removed in SDK 57, so playback uses `expo-video`.
  const player = useVideoPlayer(null, (instance) => {
    instance.loop = false;
  });

  const lastReported = useRef(0);

  useEffect(() => {
    if (!source) return;
    player.replace(source);
    lastReported.current = 0;
  }, [source, player]);

  // Resume from the server's stored position, then report progress every ~15s.
  useEffect(() => {
    if (!lesson) return;
    const interval = setInterval(() => {
      const position = player.currentTime ?? 0;
      if (position - lastReported.current >= 15) {
        lastReported.current = position;
        positionMutation.mutate({
          lessonId: lesson.id,
          positionSeconds: position,
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [lesson, player, positionMutation]);

  useEffect(() => {
    if (!lesson || !playback?.url) return;
    const resume = lesson.last_position_seconds;
    if (resume > 0) {
      player.seekBy(resume);
    }
    void trackActivity({
      event_type: 'LESSON_STARTED',
      object_uuid: lesson.id,
      metadata: { course: lesson.course },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id, playback?.url]);

  // Checkmark pop whenever the lesson becomes finished.
  const [pop] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!lesson?.is_finished) return;
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.25, duration: 140, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, bounciness: 10 }),
    ]).start();
  }, [lesson?.is_finished, pop]);

  const busy = complete.isPending || uncomplete.isPending;

  const toggleFinished = () => {
    if (!lesson || busy) return;
    if (lesson.is_finished) {
      uncomplete.mutate(lesson.id);
    } else {
      positionMutation.mutate({
        lessonId: lesson.id,
        positionSeconds: player.currentTime ?? lesson.last_position_seconds ?? 0,
        isFinished: true,
      });
      complete.mutate(lesson.id, {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      });
    }
  };

  const openMaterial = async (target: string | null | undefined) => {
    if (!target) return;
    const supported = await Linking.canOpenURL(target);
    if (supported) await Linking.openURL(target);
  };

  if (!lesson) {
    return (
      <View className="flex-1">
        <ScreenHeader title={t('courseLoadError')} />
        <AppText variant="bodySm" tone="muted" align="center" className="mt-6 px-8">
          {t('noVideo')}
        </AppText>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScreenHeader title={course?.title ?? ''} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <View className="px-4">
          <View
            className="overflow-hidden rounded-hero bg-black"
            style={{ width: '100%', aspectRatio: 16 / 9 }}
          >
            {source ? (
              <VideoView
                player={player}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                nativeControls
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Ionicons name="videocam-off-outline" size={40} color={tokens.inkSubtle} />
                <AppText variant="caption" tone="muted" className="mt-2">
                  {t('noVideo')}
                </AppText>
              </View>
            )}
          </View>

          <Row gap={10} align="center" className="mt-5">
            {lesson.is_finished ? (
              <Animated.View style={{ transform: [{ scale: pop }] }}>
                <Ionicons name="checkmark-circle" size={22} color={tokens.success} />
              </Animated.View>
            ) : null}
            <AppText variant="heading" className="flex-1" numberOfLines={2}>
              {lesson.title}
            </AppText>
          </Row>

          {lesson.description ? (
            <AppText variant="bodySm" tone="muted" className="mt-2">
              {lesson.description}
            </AppText>
          ) : null}

          <StartStudyButton
            source={{
              type: 'COURSE_LESSON',
              id: String(lesson.id),
              courseUuid: String(lesson.course),
              title: lesson.title,
              isScheduled: false,
            }}
          />

          <Card variant="list" className="mt-5">
            <AppText
              variant="micro"
              weight="medium"
              tone="subtle"
              className="mb-3 uppercase tracking-widest"
            >
              {lesson.is_finished ? t('completed') : t('markComplete')}
            </AppText>
            <Stack gap={8}>
              <Button
                label={lesson.is_finished ? t('completed') : t('markComplete')}
                variant={lesson.is_finished ? 'secondary' : 'primary'}
                icon={lesson.is_finished ? 'checkmark-circle' : 'checkmark-circle-outline'}
                loading={busy}
                fullWidth
                onPress={toggleFinished}
              />
              {lesson.is_finished ? (
                <Button
                  label={t('undoComplete')}
                  variant="ghost"
                  fullWidth
                  onPress={toggleFinished}
                />
              ) : null}
            </Stack>
          </Card>

          {lessonMaterials.length > 0 ? (
            <Stack gap={8} className="mt-6">
              <AppText
                variant="micro"
                weight="medium"
                tone="subtle"
                className="uppercase tracking-widest"
              >
                {t('lessonMaterials')}
              </AppText>
              <Card variant="list" className="p-0">
                <Stack gap={0} className="px-4">
                  {lessonMaterials.map((material, materialIndex) => (
                    <View key={material.id}>
                      {materialIndex > 0 ? <Divider /> : null}
                      <ListItem
                        icon="document-text-outline"
                        title={material.title}
                        showChevron
                        onPress={() => void openMaterial(material.file || material.url)}
                      />
                    </View>
                  ))}
                </Stack>
              </Card>
            </Stack>
          ) : null}

          {nextLesson ? (
            <Card
              variant="list"
              className="mt-6"
              onPress={() =>
                router.replace({
                  pathname: '/player/[lessonId]',
                  params: { lessonId: String(nextLesson.id), courseId: String(courseId) },
                })
              }
            >
              <Row gap={12} align="center">
                <View className="h-10 w-10 items-center justify-center rounded-pill bg-brand/15">
                  <Ionicons name="play" size={18} color={tokens.brand} />
                </View>
                <Stack gap={2} className="flex-1">
                  <AppText
                    variant="micro"
                    weight="medium"
                    tone="subtle"
                    className="uppercase tracking-widest"
                  >
                    {t('nextLesson')}
                  </AppText>
                  <AppText variant="body" weight="medium" numberOfLines={1}>
                    {nextLesson.title}
                  </AppText>
                </Stack>
                <DirIcon name="arrow-forward" size={20} color={tokens.inkSubtle} />
              </Row>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
