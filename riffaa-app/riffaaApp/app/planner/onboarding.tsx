import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Chip,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Stack,
  TextField,
} from '../../components/ui';
import { useTranslation } from '../../hooks/useTranslation';
import {
  getOnboardingState,
  submitOnboarding,
  type OnboardingState,
  type OnboardingPayload,
  type TimedWindowInput,
} from '../../services/api/planner';

const DRAFT_KEY = 'riffaa-planner-onboarding-draft';

type StepKey = 'routine' | 'school' | 'tutoring' | 'preferences' | 'confidence' | 'exams';

const STEP_CONFIG: { key: StepKey; missing: string }[] = [
  { key: 'routine', missing: 'profile' },
  { key: 'school', missing: 'school_schedule' },
  { key: 'tutoring', missing: 'tutoring' },
  { key: 'preferences', missing: 'profile' },
  { key: 'confidence', missing: 'subject_confidence' },
  { key: 'exams', missing: 'exams' },
];

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const CONFIDENCE_LEVELS = ['WEAK', 'AVERAGE', 'GOOD', 'VERY_GOOD'] as const;
const EXAM_TYPES = ['TEST', 'EXAM', 'MOCK', 'BAC'] as const;

interface Draft {
  wake_time: string;
  sleep_time: string;
  preferred_period: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NONE';
  session_length_preference: 'SHORT' | 'MEDIUM' | 'LONG' | 'NONE';
  daily_study_target_minutes: string;
  school_days: TimedWindowInput[];
  tutoring: TimedWindowInput[];
  subject_confidences: Record<string, string>;
  exams: { subject: string; exam_date: string; exam_type: string }[];
}

const EMPTY_DRAFT: Draft = {
  wake_time: '06:30',
  sleep_time: '23:00',
  preferred_period: 'NONE',
  session_length_preference: 'NONE',
  daily_study_target_minutes: '120',
  school_days: [],
  tutoring: [],
  subject_confidences: {},
  exams: [],
};

function confidenceLabelKey(level: string): string {
  return `plannerConfidence${level
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join('')}`;
}

function weekdayLabel(t: (key: string) => string, weekday: number): string {
  const short = t('weekdayShort').split(',');
  return short[weekday] ?? String(weekday);
}

export default function PlannerOnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (raw) {
        try {
          setDraft({ ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<Draft>) });
        } catch {
          // ignore corrupt draft
        }
      }
      getOnboardingState()
        .then(setState)
        .catch(() => setState(null));
    })();
  }, []);

  // Persist the draft so the wizard is resumable.
  useEffect(() => {
    void AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const steps = useMemo(() => {
    if (!state) return STEP_CONFIG.map((step) => step.key);
    const filtered = STEP_CONFIG.filter((step) => state.missing.includes(step.missing)).map(
      (step) => step.key,
    );
    return filtered.length > 0 ? filtered : STEP_CONFIG.map((step) => step.key);
  }, [state]);

  const activeStep = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const toggleSchoolDay = (weekday: number) => {
    const exists = draft.school_days.some((day) => day.weekday === weekday);
    update({
      school_days: exists
        ? draft.school_days.filter((day) => day.weekday !== weekday)
        : [...draft.school_days, { weekday, start_time: '08:00', end_time: '17:00' }],
    });
  };

  const buildPayload = (): OnboardingPayload => {
    const profile: OnboardingPayload['profile'] = {
      wake_time: draft.wake_time || null,
      sleep_time: draft.sleep_time || null,
      preferred_period: draft.preferred_period,
      session_length_preference: draft.session_length_preference,
      daily_study_target_minutes: Number(draft.daily_study_target_minutes) || 120,
    };
    return {
      profile,
      school_days: draft.school_days,
      tutoring: draft.tutoring,
      subject_confidences: Object.entries(draft.subject_confidences).map(([subject, level]) => ({
        subject,
        level,
      })),
      exams: draft.exams,
    };
  };

  const finish = async () => {
    setSaving(true);
    try {
      await submitOnboarding(buildPayload());
      await AsyncStorage.removeItem(DRAFT_KEY);
      Alert.alert(t('plannerSaved'));
      router.back();
    } catch {
      Alert.alert(t('error'), t('serverUnreachable'));
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    if (!state) return null;

    if (activeStep === 'routine') {
      return (
        <Stack gap={12}>
          <TextField
            label={t('plannerWakeTime')}
            value={draft.wake_time}
            onChangeText={(value) => update({ wake_time: value })}
            placeholder="06:30"
          />
          <TextField
            label={t('plannerSleepTime')}
            value={draft.sleep_time}
            onChangeText={(value) => update({ sleep_time: value })}
            placeholder="23:00"
          />
        </Stack>
      );
    }

    if (activeStep === 'school') {
      return (
        <Stack gap={10}>
          <AppText variant="caption" tone="muted">
            {t('plannerSchoolHint')}
          </AppText>
          {WEEKDAYS.map((weekday) => {
            const day = draft.school_days.find((entry) => entry.weekday === weekday);
            return (
              <Card key={weekday} variant="list">
                <Stack gap={8}>
                  <Row gap={8} align="center" justify="space-between">
                    <Chip
                      label={weekdayLabel(t, weekday)}
                      selected={Boolean(day)}
                      onPress={() => toggleSchoolDay(weekday)}
                    />
                    {day ? (
                      <Button
                        label={t('plannerDeleteAction')}
                        size="sm"
                        variant="ghost"
                        onPress={() => toggleSchoolDay(weekday)}
                      />
                    ) : null}
                  </Row>
                  {day ? (
                    <Row gap={8}>
                      <View className="flex-1">
                        <TextField
                          label={t('plannerWakeTime')}
                          value={day.start_time}
                          onChangeText={(value) =>
                            update({
                              school_days: draft.school_days.map((entry) =>
                                entry.weekday === weekday
                                  ? { ...entry, start_time: value }
                                  : entry,
                              ),
                            })
                          }
                        />
                      </View>
                      <View className="flex-1">
                        <TextField
                          label={t('plannerSleepTime')}
                          value={day.end_time}
                          onChangeText={(value) =>
                            update({
                              school_days: draft.school_days.map((entry) =>
                                entry.weekday === weekday ? { ...entry, end_time: value } : entry,
                              ),
                            })
                          }
                        />
                      </View>
                    </Row>
                  ) : null}
                </Stack>
              </Card>
            );
          })}
        </Stack>
      );
    }

    if (activeStep === 'tutoring') {
      return (
        <Stack gap={10}>
          {draft.tutoring.length === 0 ? (
            <AppText variant="caption" tone="muted">
              {t('plannerNoTutoring')}
            </AppText>
          ) : null}
          {draft.tutoring.map((entry, position) => (
            <Card key={`tutoring-${position}`} variant="list">
              <Stack gap={8}>
                <Row gap={6} wrap>
                  {WEEKDAYS.map((weekday) => (
                    <Chip
                      key={weekday}
                      label={weekdayLabel(t, weekday)}
                      selected={entry.weekday === weekday}
                      onPress={() =>
                        update({
                          tutoring: draft.tutoring.map((item, itemIndex) =>
                            itemIndex === position ? { ...item, weekday } : item,
                          ),
                        })
                      }
                    />
                  ))}
                </Row>
                <Row gap={8}>
                  <View className="flex-1">
                    <TextField
                      value={entry.start_time}
                      onChangeText={(value) =>
                        update({
                          tutoring: draft.tutoring.map((item, itemIndex) =>
                            itemIndex === position ? { ...item, start_time: value } : item,
                          ),
                        })
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <TextField
                      value={entry.end_time}
                      onChangeText={(value) =>
                        update({
                          tutoring: draft.tutoring.map((item, itemIndex) =>
                            itemIndex === position ? { ...item, end_time: value } : item,
                          ),
                        })
                      }
                    />
                  </View>
                </Row>
                <Button
                  label={t('plannerDeleteAction')}
                  size="sm"
                  variant="ghost"
                  onPress={() =>
                    update({ tutoring: draft.tutoring.filter((_, i) => i !== position) })
                  }
                />
              </Stack>
            </Card>
          ))}
          <Button
            label={t('plannerAddTutoring')}
            icon="add"
            size="sm"
            variant="secondary"
            onPress={() =>
              update({
                tutoring: [
                  ...draft.tutoring,
                  { weekday: 2, start_time: '17:00', end_time: '18:30' },
                ],
              })
            }
          />
        </Stack>
      );
    }

    if (activeStep === 'preferences') {
      return (
        <Stack gap={14}>
          <Stack gap={6}>
            <AppText variant="caption" tone="muted">
              {t('plannerPreferredPeriod')}
            </AppText>
            <SegmentedControl
              value={draft.preferred_period}
              onChange={(value) => update({ preferred_period: value })}
              options={[
                { label: t('plannerPrefMorning'), value: 'MORNING' },
                { label: t('plannerPrefAfternoon'), value: 'AFTERNOON' },
                { label: t('plannerPrefEvening'), value: 'EVENING' },
                { label: t('plannerPrefNone'), value: 'NONE' },
              ]}
            />
          </Stack>
          <Stack gap={6}>
            <AppText variant="caption" tone="muted">
              {t('plannerSessionLength')}
            </AppText>
            <SegmentedControl
              value={draft.session_length_preference}
              onChange={(value) => update({ session_length_preference: value })}
              options={[
                { label: t('plannerLenShort'), value: 'SHORT' },
                { label: t('plannerLenMedium'), value: 'MEDIUM' },
                { label: t('plannerLenLong'), value: 'LONG' },
                { label: t('plannerLenNone'), value: 'NONE' },
              ]}
            />
          </Stack>
          <TextField
            label={t('plannerDailyTarget')}
            value={draft.daily_study_target_minutes}
            keyboardType="number-pad"
            onChangeText={(value) => update({ daily_study_target_minutes: value })}
          />
        </Stack>
      );
    }

    if (activeStep === 'confidence') {
      return (
        <Stack gap={10}>
          {state.available_subjects.map((subject) => {
            const selected = draft.subject_confidences[subject];
            return (
              <Card key={subject} variant="list">
                <Stack gap={8}>
                  <AppText variant="bodySm" weight="medium">
                    {subject}
                  </AppText>
                  <Row gap={6} wrap>
                    {CONFIDENCE_LEVELS.map((level) => (
                      <Chip
                        key={level}
                        label={t(confidenceLabelKey(level))}
                        selected={selected === level}
                        onPress={() =>
                          update({
                            subject_confidences: {
                              ...draft.subject_confidences,
                              [subject]: level,
                            },
                          })
                        }
                      />
                    ))}
                  </Row>
                </Stack>
              </Card>
            );
          })}
        </Stack>
      );
    }

    // exams
    return (
      <Stack gap={10}>
        {draft.exams.length === 0 ? (
          <AppText variant="caption" tone="muted">
            {t('plannerNoExams')}
          </AppText>
        ) : null}
        {draft.exams.map((exam, position) => (
          <Card key={`exam-${position}`} variant="list">
            <Stack gap={8}>
              <Row gap={6} wrap>
                {state.available_subjects.map((subject) => (
                  <Chip
                    key={subject}
                    label={subject}
                    selected={exam.subject === subject}
                    onPress={() =>
                      update({
                        exams: draft.exams.map((item, itemIndex) =>
                          itemIndex === position ? { ...item, subject } : item,
                        ),
                      })
                    }
                  />
                ))}
              </Row>
              <TextField
                label={t('plannerExamDate')}
                value={exam.exam_date}
                placeholder="2099-05-01"
                onChangeText={(value) =>
                  update({
                    exams: draft.exams.map((item, itemIndex) =>
                      itemIndex === position ? { ...item, exam_date: value } : item,
                    ),
                  })
                }
              />
              <Row gap={6} wrap>
                {EXAM_TYPES.map((type) => (
                  <Chip
                    key={type}
                    label={t(`plannerExam${type.charAt(0)}${type.slice(1).toLowerCase()}`)}
                    selected={exam.exam_type === type}
                    onPress={() =>
                      update({
                        exams: draft.exams.map((item, itemIndex) =>
                          itemIndex === position ? { ...item, exam_type: type } : item,
                        ),
                      })
                    }
                  />
                ))}
              </Row>
              <Button
                label={t('plannerDeleteAction')}
                size="sm"
                variant="ghost"
                onPress={() => update({ exams: draft.exams.filter((_, i) => i !== position) })}
              />
            </Stack>
          </Card>
        ))}
        <Button
          label={t('plannerAddExam')}
          icon="add"
          size="sm"
          variant="secondary"
          onPress={() =>
            update({
              exams: [
                ...draft.exams,
                { subject: state.available_subjects[0] ?? '', exam_date: '', exam_type: 'TEST' },
              ],
            })
          }
        />
      </Stack>
    );
  };

  return (
    <View className="flex-1">
      <ScreenHeader title={t('plannerSetup')} subtitle={t('plannerSetupTitle')} />
      <Screen scroll>
        <Stack gap={16}>
          <Stack gap={8}>
            <Row justify="space-between" align="center">
              <AppText variant="caption" tone="muted">
                {t('plannerProgress', { current: index + 1, total: steps.length })}
              </AppText>
              <AppText variant="caption" weight="medium" tone="brand">
                {t(`plannerStep${activeStep.charAt(0).toUpperCase()}${activeStep.slice(1)}`)}
              </AppText>
            </Row>
            <ProgressBar value={((index + 1) / steps.length) * 100} />
          </Stack>

          {renderStep()}

          <Row gap={8}>
            <Button
              label={t('plannerBack')}
              variant="secondary"
              disabled={index === 0}
              onPress={() => setIndex((value) => Math.max(0, value - 1))}
            />
            <View className="flex-1">
              <Button
                label={isLast ? t('plannerFinish') : t('plannerNext')}
                variant="primary"
                fullWidth
                loading={saving}
                onPress={() => (isLast ? void finish() : setIndex((value) => value + 1))}
              />
            </View>
          </Row>
        </Stack>
      </Screen>
    </View>
  );
}
