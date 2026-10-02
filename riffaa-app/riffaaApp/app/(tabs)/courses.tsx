import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  View,
} from 'react-native';

import { CourseCard } from '../../components/CourseCard';
import { TeachersList } from '../../components/teachers/TeachersList';
import {
  AppText,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Row,
  ScreenHeader,
  SectionHeader,
  SegmentedControl,
  Sheet,
  Skeleton,
  Stack,
  TextField,
} from '../../components/ui';
import { GRADE_API_MAP, GRADES, WILAYAS } from '../../constants/teachers';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useCourses } from '../../hooks/useCourses';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { describeApiError } from '../../services/api/client';
import { getTeachers } from '../../services/api/teachers';
import type { Course, TeacherProfile } from '../../types';

type Segment = 'courses' | 'teachers';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Course>);

const ALL = 'الكل';

export default function CoursesScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const bottomInset = useBottomInset();

  const [segment, setSegment] = useState<Segment>('courses');
  const [search, setSearch] = useState('');
  const [scrollY] = useState(() => new Animated.Value(0));
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true },
  );

  const {
    data: courses = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useCourses({ search: search.trim() || undefined });

  // Teachers segment (list + filters).
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teachersError, setTeachersError] = useState<string | null>(null);
  const [teachersRefreshing, setTeachersRefreshing] = useState(false);
  const [grade, setGrade] = useState(ALL);
  const [wilaya, setWilaya] = useState(ALL);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftGrade, setDraftGrade] = useState(ALL);
  const [draftWilaya, setDraftWilaya] = useState(ALL);

  const fetchTeachers = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setTeachersRefreshing(true);
      else setTeachersLoading(true);
      setTeachersError(null);
      try {
        const apiLevel = GRADE_API_MAP[grade];
        const data = await getTeachers<TeacherProfile[]>({
          ...(apiLevel ? { teaching_level: apiLevel } : {}),
          ...(wilaya !== ALL ? { wilaya } : {}),
        });
        setTeachers(Array.isArray(data) ? data : []);
      } catch (caught) {
        setTeachersError(describeApiError(caught));
      } finally {
        setTeachersLoading(false);
        setTeachersRefreshing(false);
      }
    },
    [grade, wilaya],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (segment === 'teachers') void fetchTeachers();
  }, [segment, fetchTeachers]);

  const activeFilterCount = (grade !== ALL ? 1 : 0) + (wilaya !== ALL ? 1 : 0);

  const openFilters = () => {
    setDraftGrade(grade);
    setDraftWilaya(wilaya);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setGrade(draftGrade);
    setWilaya(draftWilaya);
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setDraftGrade(ALL);
    setDraftWilaya(ALL);
  };

  return (
    <View className="flex-1">
      <ScreenHeader
        large
        showBack={false}
        title={t('courses')}
        subtitle={t('coursesSubtitle')}
        scrollY={scrollY}
      />

      <Stack gap={12} className="px-4 pb-3 pt-2">
        <SegmentedControl<Segment>
          options={[
            { label: t('courses'), value: 'courses' },
            { label: t('teachersTab'), value: 'teachers' },
          ]}
          value={segment}
          onChange={setSegment}
        />

        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder={segment === 'courses' ? t('searchCourses') : t('searchTeachers')}
          icon="search-outline"
          returnKeyType="search"
        />

        {segment === 'teachers' ? (
          <Stack gap={8}>
            <Row gap={8} align="center">
              <Button
                label={
                  activeFilterCount > 0 ? `${t('filters')} (${activeFilterCount})` : t('filters')
                }
                variant="secondary"
                size="sm"
                icon="options-outline"
                onPress={openFilters}
              />
              {activeFilterCount > 0 ? (
                <Button
                  label={t('reset')}
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setGrade(ALL);
                    setWilaya(ALL);
                  }}
                />
              ) : null}
            </Row>
            {activeFilterCount > 0 ? (
              <Row gap={8} wrap>
                {grade !== ALL ? (
                  <Chip label={grade} icon="close" onPress={() => setGrade(ALL)} />
                ) : null}
                {wilaya !== ALL ? (
                  <Chip label={wilaya} icon="close" onPress={() => setWilaya(ALL)} />
                ) : null}
              </Row>
            ) : null}
          </Stack>
        ) : null}
      </Stack>

      {segment === 'courses' ? (
        isLoading ? (
          <Stack gap={12} className="px-4 pt-2">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} height={220} radius={28} />
            ))}
          </Stack>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <AnimatedFlatList
            data={courses}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <CourseCard
                course={item}
                subject={item.teacher?.teaching_subjects ?? null}
                onPress={() =>
                  router.push({ pathname: '/course/[id]', params: { id: String(item.id) } })
                }
              />
            )}
            ListHeaderComponent={
              courses.length > 0 ? (
                <AppText
                  variant="micro"
                  weight="medium"
                  tone="subtle"
                  className="uppercase tracking-widest pb-3"
                >
                  {t('courses')} · {courses.length}
                </AppText>
              ) : null
            }
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 4,
              paddingBottom: bottomInset,
            }}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => void refetch()}
                tintColor={tokens.brand}
                colors={[tokens.brand]}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="book-outline"
                title={t('noCoursesAvailable')}
                message={t('noCoursesHint')}
                actionLabel={t('discoverTeachers')}
                onAction={() => router.push('/explore')}
              />
            }
          />
        )
      ) : (
        <View className="flex-1">
          <TeachersList
            teachers={teachers}
            loading={teachersLoading}
            refreshing={teachersRefreshing}
            error={teachersError}
            onRefresh={() => void fetchTeachers(true)}
            onSelect={(teacher) => router.push(`/explore/${teacher.id}`)}
            onScroll={onScroll}
            scrollEventThrottle={16}
            paddingBottom={bottomInset}
          />
        </View>
      )}

      <Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} title={t('filters')}>
        <Stack gap={16} className="pb-4">
          <Stack gap={8}>
            <SectionHeader title={t('gradeLevel')} />
            <Row gap={8} wrap>
              {GRADES.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={draftGrade === option}
                  onPress={() => setDraftGrade(option)}
                />
              ))}
            </Row>
          </Stack>
          <Stack gap={8}>
            <SectionHeader title={t('wilaya')} />
            <Row gap={8} wrap>
              {WILAYAS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={draftWilaya === option}
                  onPress={() => setDraftWilaya(option)}
                />
              ))}
            </Row>
          </Stack>
          <Row gap={8}>
            <Button label={t('apply')} className="flex-1" fullWidth onPress={applyFilters} />
            <Button label={t('reset')} variant="secondary" onPress={resetFilters} />
          </Row>
          <AppText variant="caption" tone="muted">
            {t('activeFilters')}: {draftGrade === ALL ? '—' : draftGrade}
            {draftWilaya === ALL ? '' : ` • ${draftWilaya}`}
          </AppText>
        </Stack>
      </Sheet>
    </View>
  );
}
