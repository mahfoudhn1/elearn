import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import {
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { TeacherProfile, TeacherUser } from '../../types';
import { subjectTint } from '../../constants/subjects';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { AppText, Avatar, Badge, Card, DirIcon, EmptyState, ErrorState, Row, Skeleton, Stack } from '../ui';

export interface TeachersListProps {
  teachers: TeacherProfile[];
  loading?: boolean;
  refreshing?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onSelect: (teacher: TeacherProfile) => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
  paddingBottom?: number;
}

function avatarUrl(user: TeacherUser | undefined): string | undefined {
  return user?.avatar_url || user?.avatar_file || user?.avatar;
}

function displayName(teacher: TeacherProfile): string {
  const { first_name, last_name, username } = teacher.user ?? {};
  const full = [first_name, last_name].filter(Boolean).join(' ');
  return full || username || '';
}

const TeacherRow = memo(function TeacherRow({
  teacher,
  onPress,
}: {
  teacher: TeacherProfile;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const tint = subjectTint(teacher.teaching_subjects);
  const name = displayName(teacher);
  const levelLabel =
    teacher.teaching_level === 'PRIMARY'
      ? t('levelPrimary')
      : teacher.teaching_level === 'MIDDLE'
        ? t('levelMiddle')
        : teacher.teaching_level === 'SECONDARY'
          ? t('levelSecondary')
          : t('allLevels');
  const price = teacher.price > 0 ? `${teacher.price} ${t('currency')}` : t('free');

  return (
    <Card variant="list" subject={teacher.teaching_subjects} onPress={onPress} className="mb-3">
      <Row gap={12} align="center">
        <View
          className="h-14 w-14 items-center justify-center rounded-pill border-2"
          style={{ borderColor: teacher.isLive ? tokens.brand : tokens.line }}
        >
          <Avatar name={name} url={avatarUrl(teacher.user)} size={48} />
        </View>

        <Stack gap={3} className="flex-1">
          <AppText variant="title" numberOfLines={1}>
            {name}
          </AppText>
          <Row gap={6} align="center">
            <View
              className="h-5 w-5 items-center justify-center rounded-pill"
              style={{ backgroundColor: `${tint.color}26` }}
            >
              <Ionicons name={tint.icon} size={12} color={tint.color} />
            </View>
            <AppText variant="bodySm" tone="brand" numberOfLines={1}>
              {teacher.teaching_subjects || t('subjectFallback')}
            </AppText>
          </Row>
          <AppText variant="micro" tone="subtle" numberOfLines={1}>
            {levelLabel}
            {teacher.wilaya ? ` • ${teacher.wilaya}` : ''}
          </AppText>
        </Stack>

        <Stack gap={4} align="flex-end">
          {teacher.isLive ? <Badge label={t('liveNow')} tone="success" /> : null}
          <AppText variant="bodySm" weight="medium">
            {price}
          </AppText>
          <DirIcon name="chevron-forward" size={18} color={tokens.inkSubtle} />
        </Stack>
      </Row>
    </Card>
  );
});

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<TeacherProfile>);

/** Shared teacher list used by Explore and the Courses tab's Teachers segment. */
export function TeachersList({
  teachers,
  loading = false,
  refreshing = false,
  error = null,
  onRefresh,
  onSelect,
  onScroll,
  scrollEventThrottle,
  paddingBottom = 24,
}: TeachersListProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  if (loading) {
    return (
      <Stack gap={12} className="px-4 pt-4">
        {[0, 1, 2].map((index) => (
          <Card key={index} variant="list">
            <Row gap={12} align="center">
              <Skeleton width={48} height={48} radius={24} />
              <Stack gap={8} className="flex-1">
                <Skeleton width="60%" height={16} />
                <Skeleton width="40%" height={12} />
              </Stack>
            </Row>
          </Card>
        ))}
      </Stack>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRefresh} />;
  }

  return (
    <AnimatedFlatList
      data={teachers}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <TeacherRow teacher={item} onPress={() => onSelect(item)} />
      )}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom }}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={7}
      removeClippedSubviews={Platform.OS === 'android'}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tokens.brand}
            colors={[tokens.brand]}
          />
        ) : undefined
      }
      ListEmptyComponent={<EmptyState icon="people-outline" title={t('noTeachersFound')} />}
    />
  );
}
