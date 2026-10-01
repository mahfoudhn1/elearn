import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, Switch, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Chip,
  IconButton,
  Row,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Stack,
  TextField,
} from '../components/ui';
import { SUBJECT_OPTIONS, subjectTint } from '../constants/subjects';
import { useRowDirection } from '../hooks/useDirection';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { describeApiError } from '../services/api/client';
import { formatDate } from '../utils/format';
import {
  countRecurringOccurrences,
  createRecurringSchedules,
  createSchedule,
  MAX_RECURRING_ITEMS,
  type ScheduleItemType,
} from '../services/api/schedule';

type PickerTarget = 'date' | 'start' | 'end' | null;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toIsoDay(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toHhMm(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function minutesOf(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export default function CreateScheduleScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const rowDirection = useRowDirection();
  const { t } = useTranslation();

  const [itemType, setItemType] = useState<ScheduleItemType>('TASK');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<string | null>(null);
  const [date, setDate] = useState(() => toIsoDay(new Date()));
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:00');
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [notes, setNotes] = useState('');
  const [picker, setPicker] = useState<PickerTarget>(null);

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<{ title?: string; time?: string; repeat?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  // 2024-01-07 is a Sunday, matching JavaScript's `Date.getDay()` ordering.
  const weekdayLabels = useMemo(
    () => [0, 1, 2, 3, 4, 5, 6].map((offset) => formatDate(new Date(2024, 0, 7 + offset), { weekday: 'short' })),
    [],
  );

  const occurrenceCount = repeatEnabled
    ? countRecurringOccurrences(repeatDays, repeatWeeks)
    : 1;

  const toggleRepeatDay = (value: number) =>
    setRepeatDays((current) =>
      current.includes(value) ? current.filter((day) => day !== value) : [...current, value],
    );

  const onPicked = (event: DateTimePickerEvent, selected?: Date) => {
    const target = picker;
    setPicker(null);
    if (event.type !== 'set' || !selected || !target) return;
    if (target === 'date') setDate(toIsoDay(selected));
    if (target === 'start') {
      const next = toHhMm(selected);
      setStartTime(next);
      if (minutesOf(endTime) <= minutesOf(next)) {
        const end = new Date(selected);
        end.setHours(selected.getHours() + 1);
        setEndTime(toHhMm(end));
      }
    }
    if (target === 'end') setEndTime(toHhMm(selected));
  };

  const pickerValue = () => {
    if (picker === 'date') return new Date(`${date}T00:00:00`);
    const [hour, minute] = (picker === 'start' ? startTime : endTime).split(':').map(Number);
    const value = new Date();
    value.setHours(hour, minute, 0, 0);
    return value;
  };

  const validate = () => {
    const next: typeof errors = {};
    const trimmed = title.trim();
    if (!trimmed) next.title = t('titleRequired');
    else if (trimmed.length < 3) next.title = t('titleTooShort');
    if (minutesOf(endTime) <= minutesOf(startTime)) next.time = t('endAfterStart');
    if (repeatEnabled && repeatDays.length === 0) next.repeat = t('repeatDayRequired');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    setSubmitError(null);
    if (!validate()) return;

    submittingRef.current = true;
    setSubmitting(true);
    setProgress(null);

    try {
      const payload = {
        title,
        subject,
        date,
        start_time: startTime,
        end_time: endTime,
        notes,
        item_type: itemType,
        days: repeatEnabled ? repeatDays : undefined,
      };

      if (repeatEnabled) {
        const { created, failed, truncated } = await createRecurringSchedules(
          payload,
          repeatWeeks,
          (done, total) => setProgress({ done, total }),
        );

        if (created.length === 0) {
          setSubmitError(failed[0]?.message ?? t('createOccurrencesError'));
          return;
        }

        if (failed.length > 0 || truncated > 0) {
          const parts = [t('partialCreated', { count: created.length })];
          if (failed.length > 0) parts.push(t('partialFailed', { count: failed.length }));
          if (truncated > 0) parts.push(t('partialTruncated', { count: truncated }));
          Alert.alert(t('savedPartially'), `${parts.join('. ')}.`, [
            { text: t('close'), onPress: () => router.back() },
          ]);
          return;
        }
      } else {
        await createSchedule(payload);
      }

      router.back();
    } catch (caught) {
      setSubmitError(describeApiError(caught) || t('createScheduleError'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      setProgress(null);
    }
  };

  const saveLabel = submitting
    ? progress
      ? t('savingProgress', { done: progress.done, total: progress.total })
      : t('saving')
    : occurrenceCount > 1
      ? t('saveOccurrences', { count: occurrenceCount })
      : t('saveSchedule');

  return (
    <View className="flex-1">
      <ScreenHeader title={t('newSchedule')} />

      <Screen scroll edges={{ top: false }}>
        <Stack gap={16} className="pb-4">
          <SegmentedControl<ScheduleItemType>
            options={[
              { label: t('taskType'), value: 'TASK' },
              { label: t('examType'), value: 'EXAM' },
            ]}
            value={itemType}
            onChange={setItemType}
          />

          {/* Details */}
          <Card variant="list">
            <AppText variant="title" className="mb-3">
              {t('titleLabel')}
            </AppText>
            <TextField
              label={t('titleLabel')}
              value={title}
              onChangeText={setTitle}
              placeholder={
                itemType === 'EXAM' ? t('titlePlaceholderExam') : t('titlePlaceholderTask')
              }
              error={errors.title}
            />

            <AppText variant="title" className="mb-3 mt-5">
              {t('subjectLabel')}
            </AppText>
            <Row gap={8} wrap>
              {SUBJECT_OPTIONS.map((option) => {
                const selected = subject === option;
                const tint = subjectTint(option);
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={option}
                    onPress={() => setSubject(selected ? null : option)}
                    className="min-h-[40px] justify-center rounded-card border px-3.5 py-2"
                    style={{
                      borderColor: selected ? tint.color : tokens.hairline,
                      backgroundColor: selected ? `${tint.color}26` : tokens.surface2,
                    }}
                  >
                    <AppText variant="caption" weight="semibold">
                      {option}
                    </AppText>
                  </Pressable>
                );
              })}
            </Row>
          </Card>

          {/* When */}
          <Card variant="list">
            <AppText variant="title" className="mb-3">
              {t('whenLabel')}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('dateLabel')}
              onPress={() => setPicker('date')}
              className="mb-3 min-h-[48px] items-center justify-between rounded-card border border-hairline bg-surface-2 px-4 py-3"
              style={rowDirection}
            >
              <AppText variant="caption" tone="muted">
                {t('dateLabel')}
              </AppText>
              <AppText variant="bodySm" weight="semibold">
                {date}
              </AppText>
            </Pressable>
            <Row gap={12}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('startTimeLabel')}
                onPress={() => setPicker('start')}
                className="min-h-[48px] flex-1 items-center justify-center rounded-card border border-hairline bg-surface-2 px-4 py-3"
              >
                <AppText variant="caption" tone="muted">
                  {t('startTimeLabel')}
                </AppText>
                <AppText variant="title">{startTime}</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('endTimeLabel')}
                onPress={() => setPicker('end')}
                className="min-h-[48px] flex-1 items-center justify-center rounded-card border border-hairline bg-surface-2 px-4 py-3"
              >
                <AppText variant="caption" tone="muted">
                  {t('endTimeLabel')}
                </AppText>
                <AppText variant="title">{endTime}</AppText>
              </Pressable>
            </Row>
            {errors.time ? (
              <AppText variant="caption" tone="danger" className="mt-2">
                {errors.time}
              </AppText>
            ) : null}
          </Card>

          {/* Repeat */}
          <Card variant="list">
            <Row justify="space-between" align="center">
              <Stack gap={2} className="flex-1">
                <AppText variant="title">{t('repeatLabel')}</AppText>
                <AppText variant="caption" tone="muted">
                  {t('repeatHint')}
                </AppText>
              </Stack>
              <Switch
                value={repeatEnabled}
                onValueChange={setRepeatEnabled}
                trackColor={{ true: tokens.brand, false: tokens.line }}
                thumbColor={tokens.surface}
              />
            </Row>

            {repeatEnabled ? (
              <Stack gap={12} className="mt-4">
                <Row gap={8} wrap>
                  {weekdayLabels.map((label, value) => {
                    const selected = repeatDays.includes(value);
                    return (
                      <Chip
                        key={value}
                        label={label}
                        selected={selected}
                        onPress={() => toggleRepeatDay(value)}
                      />
                    );
                  })}
                </Row>

                <Row justify="space-between" align="center">
                  <AppText variant="bodySm" weight="semibold">
                    {t('repeatDuration')}
                  </AppText>
                  <Row gap={8} align="center">
                    <IconButton
                      icon="remove"
                      accessibilityLabel={t('subtract')}
                      variant="surface"
                      size={20}
                      disabled={repeatWeeks <= 1}
                      onPress={() => setRepeatWeeks((value) => Math.max(1, value - 1))}
                    />
                    <AppText variant="title">{repeatWeeks}</AppText>
                    <IconButton
                      icon="add"
                      accessibilityLabel={t('add')}
                      variant="surface"
                      size={20}
                      disabled={countRecurringOccurrences(repeatDays, repeatWeeks + 1) > MAX_RECURRING_ITEMS}
                      onPress={() => setRepeatWeeks((value) => value + 1)}
                    />
                  </Row>
                </Row>

                {repeatDays.length > 0 ? (
                  <AppText variant="caption" tone="muted">
                    {t('occurrencesNote', { count: occurrenceCount })}{' '}
                    {occurrenceCount >= MAX_RECURRING_ITEMS
                      ? `(${t('occurrencesMax', { max: MAX_RECURRING_ITEMS })})`
                      : ''}
                  </AppText>
                ) : null}

                {errors.repeat ? (
                  <AppText variant="caption" tone="danger">
                    {errors.repeat}
                  </AppText>
                ) : null}
              </Stack>
            ) : null}
          </Card>

          {/* Notes */}
          <Card variant="list">
            <TextField
              label={t('notesLabel')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('notesPlaceholder')}
              multiline
            />
          </Card>

          {submitError ? (
            <Card variant="list">
              <AppText variant="bodySm" tone="danger">
                {submitError}
              </AppText>
            </Card>
          ) : null}
        </Stack>
      </Screen>

      {/* Sticky save */}
      <View className="px-4 pt-2" style={{ paddingBottom: 12 }}>
        <Button label={saveLabel} fullWidth loading={submitting} onPress={() => void handleSubmit()} />
      </View>

      {picker ? (
        <DateTimePicker
          value={pickerValue()}
          mode={picker === 'date' ? 'date' : 'time'}
          is24Hour={Platform.OS === 'android' ? true : undefined}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPicked}
        />
      ) : null}
    </View>
  );
}
