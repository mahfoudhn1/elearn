import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  DirIcon,
  EmptyState,
  ErrorState,
  GhostNumber,
  Row,
  ScreenHeader,
  SegmentedControl,
  Skeleton,
  Stack,
  TwoToneNumber,
} from '../../../components/ui';
import { subjectTint } from '../../../constants/subjects';
import { useDirection } from '../../../hooks/useDirection';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from '../../../hooks/useTranslation';
import { describeApiError } from '../../../services/api/client';
import { getProfileGroups } from '../../../services/api/groups';
import { getTeacherById, subscribeToTeacher } from '../../../services/api/teachers';
import type { TeacherProfile } from '../../../types';
import {
  getArrayFromPayload,
  normalizeGroup,
  type NormalizedGroup,
} from '../../../utils/realData';

type TeacherTab = 'plans' | 'groups' | 'about';

export default function TeacherProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tokens } = useTheme();
  const { isRTL } = useDirection();
  const { t } = useTranslation();

  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  const [tab, setTab] = useState<TeacherTab>('plans');
  const [groups, setGroups] = useState<NormalizedGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const loadTeacher = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTeacherById<TeacherProfile>(id);
      setTeacher(data);
    } catch (caught) {
      setError(describeApiError(caught) || t('teacherLoadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTeacher();
  }, [loadTeacher]);

  const loadGroups = useCallback(async () => {
    if (!id) return;
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      const payload = await getProfileGroups(id);
      setGroups(getArrayFromPayload(payload).map((group) => normalizeGroup(group)));
    } catch (caught) {
      setGroupsError(describeApiError(caught));
    } finally {
      setGroupsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab === 'groups') void loadGroups();
  }, [tab, loadGroups]);

  const handleSubscribe = async () => {
    if (!teacher || subscribing) return;
    setSubscribing(true);
    try {
      await subscribeToTeacher(teacher.id);
      Alert.alert(t('subscribed'));
    } catch (caught) {
      Alert.alert(t('subscribeFailed'), describeApiError(caught));
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1">
        <ScreenHeader title={t('instructorInfo')} />
        <Stack gap={16} className="px-4 pt-2">
          <Skeleton height={220} radius={32} />
          <Skeleton height={56} radius={28} />
        </Stack>
      </View>
    );
  }

  if (error || !teacher) {
    return (
      <View className="flex-1">
        <ScreenHeader title={t('instructorInfo')} />
        <ErrorState message={error ?? t('teacherLoadError')} onRetry={() => void loadTeacher()} />
      </View>
    );
  }

  const user = teacher.user;
  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || '';
  const avatarUrl = user?.avatar_url || user?.avatar_file || user?.avatar;
  const tint = subjectTint(teacher.teaching_subjects);
  const levelLabel =
    teacher.teaching_level === 'PRIMARY'
      ? t('levelPrimary')
      : teacher.teaching_level === 'MIDDLE'
        ? t('levelMiddle')
        : teacher.teaching_level === 'SECONDARY'
          ? t('levelSecondary')
          : t('allLevels');
  const price = teacher.price > 0 ? `${teacher.price} ${t('currency')}` : t('free');
  const rating = teacher.rating ?? '5.0';

  return (
    <View className="flex-1">
      <ScreenHeader title={t('instructorInfo')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <Card variant="hero" tone="brand" className="mx-4 overflow-hidden">
          <GhostNumber
            value={String(rating)}
            size={116}
            style={{
              position: 'absolute',
              top: -22,
              ...(isRTL ? { left: -6 } : { right: -6 }),
            }}
          />
          <Row gap={16} align="center">
            <View
              className="h-20 w-20 items-center justify-center rounded-pill border-2 p-1"
              style={{ borderColor: tokens.brand }}
            >
              <Avatar name={name} url={avatarUrl} size={72} />
            </View>
            <Stack gap={4} className="flex-1">
              <AppText variant="heading" numberOfLines={2}>
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
              <Row gap={6} wrap className="mt-1">
                <Badge label={levelLabel} tone="neutral" />
                {teacher.wilaya ? <Badge label={teacher.wilaya} tone="info" /> : null}
              </Row>
            </Stack>
          </Row>

          <Row
            justify="space-between"
            align="flex-end"
            className="mt-5 pt-4"
            style={{ borderTopWidth: 1, borderTopColor: tokens.line }}
          >
            <Stack gap={2}>
              <AppText
                variant="micro"
                weight="medium"
                tone="subtle"
                className="uppercase tracking-widest"
              >
                {t('studentsJoined')}
              </AppText>
              <TwoToneNumber value={`${teacher.studentsCount ?? 0}+`} variant="title" />
            </Stack>
            <Stack gap={2} align="flex-end">
              <AppText
                variant="micro"
                weight="medium"
                tone="subtle"
                className="uppercase tracking-widest"
              >
                {t('overallRating')}
              </AppText>
              <Row gap={4} align="center">
                <Ionicons name="star" size={15} color={tokens.brand} />
                <AppText variant="title">{rating}</AppText>
              </Row>
            </Stack>
          </Row>
        </Card>

        <SegmentedControl<TeacherTab>
          className="mx-4 mt-4"
          options={[
            { label: t('plansTab'), value: 'plans' },
            { label: t('groupsTab'), value: 'groups' },
            { label: t('aboutTab'), value: 'about' },
          ]}
          value={tab}
          onChange={setTab}
        />

        <View className="px-4 pt-4">
          {tab === 'plans' ? (
            <Card variant="hero">
              <Row justify="space-between" align="center">
                <AppText variant="title">{t('plansTab')}</AppText>
                <Badge label={t('recommended')} tone="brand" />
              </Row>
              <View className="mt-3">
                <TwoToneNumber
                  value={price}
                  secondary={teacher.price > 0 ? t('monthly') : undefined}
                  variant="displayLg"
                />
              </View>
              <AppText variant="bodySm" tone="muted" className="mt-3">
                {t('planFeatures')}
              </AppText>
              <Button
                className="mt-5"
                fullWidth
                loading={subscribing}
                icon="person-add-outline"
                label={teacher.price > 0 ? t('subscribeNow') : t('joinFree')}
                onPress={() => void handleSubscribe()}
              />
            </Card>
          ) : null}

          {tab === 'groups' ? (
            groupsLoading ? (
              <Stack gap={12}>
                {[0, 1].map((index) => (
                  <Skeleton key={index} height={88} radius={28} />
                ))}
              </Stack>
            ) : groupsError ? (
              <ErrorState message={groupsError} onRetry={() => void loadGroups()} />
            ) : groups.length === 0 ? (
              <EmptyState icon="people-outline" title={t('noGroupsFound')} />
            ) : (
              <Stack gap={12}>
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    variant="list"
                    onPress={() => router.push({ pathname: '/groups/[id]', params: { id: group.id } })}
                  >
                    <Row gap={12} align="center">
                      <Stack gap={2} className="flex-1">
                        <AppText variant="body" weight="medium" numberOfLines={1}>
                          {group.name}
                        </AppText>
                        <AppText variant="caption" tone="muted" numberOfLines={1}>
                          {group.teacher_name}
                        </AppText>
                      </Stack>
                      {group.active_live ? <Badge label={t('liveNow')} tone="success" /> : null}
                      <DirIcon name="chevron-forward" size={18} color={tokens.inkSubtle} />
                    </Row>
                  </Card>
                ))}
              </Stack>
            )
          ) : null}

          {tab === 'about' ? (
            <Card variant="list">
              <AppText variant="title">{t('aboutTeacher')}</AppText>
              <AppText variant="bodySm" tone="muted" className="mt-2">
                {teacher.bio || t('noBio')}
              </AppText>

              <Stack gap={12} className="mt-4">
                {teacher.profession ? (
                  <Row gap={10} align="center">
                    <Ionicons name="briefcase-outline" size={16} color={tokens.inkSubtle} />
                    <AppText variant="bodySm" className="flex-1">
                      {teacher.profession}
                    </AppText>
                  </Row>
                ) : null}
                {teacher.degree ? (
                  <Row gap={10} align="center">
                    <Ionicons name="school-outline" size={16} color={tokens.inkSubtle} />
                    <AppText variant="bodySm" className="flex-1">
                      {teacher.degree}
                    </AppText>
                  </Row>
                ) : null}
                {teacher.university ? (
                  <Row gap={10} align="center">
                    <Ionicons name="business-outline" size={16} color={tokens.inkSubtle} />
                    <AppText variant="bodySm" className="flex-1">
                      {teacher.university}
                    </AppText>
                  </Row>
                ) : null}
                <Row gap={10} align="center">
                  <Ionicons name="ribbon-outline" size={16} color={tokens.brand} />
                  <AppText variant="bodySm" tone="brand" className="flex-1">
                    {t('certifiedTeacher')}
                  </AppText>
                </Row>
              </Stack>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
