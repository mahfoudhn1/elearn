import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { GOAL_METRICS, TargetStepper, metricMeta } from '../../components/analytics';
import {
  AppText,
  Button,
  Card,
  Chip,
  ErrorState,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Skeleton,
  Stack,
  TextField,
} from '../../components/ui';
import { useCourses } from '../../hooks/useCourses';
import { useGoal, useGoalMutations, useGoalSuggestion } from '../../hooks/queries';
import { useTranslation } from '../../hooks/useTranslation';
import { extractApiErrorMessage } from '../../services/api/client';
import type { GoalMetric, GoalPeriod, StudyGoal } from '../../services/api/goals';

/** Mirrors the backend's per-metric ceiling so the stepper cannot exceed it. */
const MAX_TARGET: Record<GoalMetric, Record<GoalPeriod, number>> = {
  WATCH_MINUTES: { DAILY: 1440, WEEKLY: 10080 },
  STUDY_MINUTES: { DAILY: 1440, WEEKLY: 10080 },
  LESSONS_COMPLETED: { DAILY: 100, WEEKLY: 700 },
  QUIZZES_SUBMITTED: { DAILY: 100, WEEKLY: 700 },
};

/**
 * The form is a separate component mounted with the fetched goal, so its fields
 * are initialised from props (no setState-in-effect) and a different goal
 * remounts it via the `key`.
 */
function GoalEditorForm({
  editingId,
  existing,
}: {
  editingId?: string;
  existing: StudyGoal | null;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: courses = [] } = useCourses();
  const { create, update } = useGoalMutations();

  const [metric, setMetric] = useState<GoalMetric>(existing?.metric ?? 'WATCH_MINUTES');
  const [period, setPeriod] = useState<GoalPeriod>(existing?.period ?? 'DAILY');
  const [target, setTarget] = useState<number>(existing?.target ?? 30);
  const [course, setCourse] = useState<string | null>(existing?.course ?? null);
  const [subject, setSubject] = useState(existing?.subject ?? '');
  const [error, setError] = useState<string | null>(null);

  const { data: suggestion } = useGoalSuggestion(metric, period);
  const unit = t(metricMeta(metric).unitKey);
  const maxTarget = MAX_TARGET[metric][period];
  const busy = create.isPending || update.isPending;

  // Changing the metric/period can lower the ceiling; clamp the target there.
  const selectMetric = (next: GoalMetric) => {
    setMetric(next);
    setTarget((current) => Math.min(current, MAX_TARGET[next][period]));
  };
  const selectPeriod = (next: GoalPeriod) => {
    setPeriod(next);
    setTarget((current) => Math.min(current, MAX_TARGET[metric][next]));
  };

  const submit = () => {
    setError(null);
    const payload = { metric, period, target, course, subject: subject.trim() || null };
    const onSuccess = () => router.back();
    const onError = (mutationError: unknown) => {
      const data =
        (mutationError as { response?: { data?: unknown } })?.response?.data ??
        mutationError;
      setError(extractApiErrorMessage(data));
    };

    if (editingId) {
      update.mutate({ id: editingId, payload }, { onSuccess, onError });
    } else {
      create.mutate(payload, { onSuccess, onError });
    }
  };

  return (
    <View className="flex-1">
      <ScreenHeader title={editingId ? t('editGoal') : t('createGoal')} />
      <Screen scroll>
        <Stack gap={16} className="pt-2">
          {/* Metric */}
          <Stack gap={8}>
            <AppText
              variant="micro"
              weight="medium"
              tone="subtle"
              className="uppercase tracking-widest"
            >
              {t('metric')}
            </AppText>
            <View className="gap-2">
              {GOAL_METRICS.map((item) => {
                const meta = metricMeta(item);
                return (
                  <Chip
                    key={item}
                    label={t(meta.labelKey)}
                    icon={meta.icon}
                    selected={metric === item}
                    onPress={() => selectMetric(item)}
                  />
                );
              })}
            </View>
          </Stack>

          {/* Period */}
          <Stack gap={8}>
            <AppText
              variant="micro"
              weight="medium"
              tone="subtle"
              className="uppercase tracking-widest"
            >
              {t('goalPeriod')}
            </AppText>
            <SegmentedControl<GoalPeriod>
              options={[
                { label: t('periodDaily'), value: 'DAILY' },
                { label: t('periodWeekly'), value: 'WEEKLY' },
              ]}
              value={period}
              onChange={selectPeriod}
            />
          </Stack>

          {/* Target */}
          <Card>
            <TargetStepper
              label={t('goalTarget')}
              value={target}
              onChange={setTarget}
              min={1}
              max={maxTarget}
              step={period === 'WEEKLY' ? 30 : 10}
              unitLabel={unit}
            />
            {suggestion && suggestion.sample_size > 0 ? (
              <Stack gap={8} className="mt-4">
                <AppText variant="caption" tone="muted">
                  {t('basedOnLastPeriods', { count: suggestion.sample_size })}:{' '}
                  {suggestion.target} {unit}
                </AppText>
                <Button
                  variant="secondary"
                  size="sm"
                  label={t('useThis')}
                  onPress={() => setTarget(suggestion.target)}
                />
              </Stack>
            ) : null}
          </Card>

          {/* Course scope */}
          <Stack gap={8}>
            <AppText
              variant="micro"
              weight="medium"
              tone="subtle"
              className="uppercase tracking-widest"
            >
              {t('chooseCourse')}
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
            >
              <Chip
                label={t('allCourses')}
                selected={course === null}
                onPress={() => setCourse(null)}
              />
              {courses.map((item) => (
                <Chip
                  key={String(item.id)}
                  label={item.title}
                  selected={course === String(item.id)}
                  onPress={() => setCourse(String(item.id))}
                />
              ))}
            </ScrollView>
          </Stack>

          <TextField
            label={t('subjectOptional')}
            value={subject}
            onChangeText={setSubject}
            placeholder={t('allSubjectsPlaceholder')}
            maxLength={150}
          />

          <AppText variant="caption" tone="subtle">
            {t('changesNextPeriod')}
          </AppText>

          {error ? (
            <AppText variant="bodySm" tone="danger">
              {error}
            </AppText>
          ) : null}

          <Button
            label={t('saveGoal')}
            fullWidth
            loading={busy}
            disabled={busy}
            onPress={submit}
          />
        </Stack>
      </Screen>
    </View>
  );
}

export default function GoalEditorScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id;

  const { data: existing, isLoading, isError, refetch } = useGoal(editingId);

  if (editingId && isLoading && !existing) {
    return (
      <View className="flex-1">
        <ScreenHeader title={t('editGoal')} />
        <Screen>
          <Stack gap={16} className="pt-2">
            <Skeleton height={120} radius={20} />
            <Skeleton height={120} radius={20} />
          </Stack>
        </Screen>
      </View>
    );
  }

  if (editingId && isError && !existing) {
    return (
      <View className="flex-1">
        <ScreenHeader title={t('editGoal')} />
        <Screen>
          <ErrorState
            message={t('goalsLoadError')}
            onRetry={refetch}
            retryLabel={t('retry')}
          />
        </Screen>
      </View>
    );
  }

  return (
    <GoalEditorForm
      key={existing?.id ?? 'new'}
      editingId={editingId}
      existing={existing ?? null}
    />
  );
}
