import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  Card,
  ErrorState,
  GhostNumber,
  ProgressBar,
  ProgressRing,
  Row,
  ScreenHeader,
  Skeleton,
  Stack,
  TextField,
  TwoToneNumber,
} from '../../components/ui';
import {
  useStartSurveyMutation,
  useSubmitSurveyMutation,
  useSurvey,
  useSurveyAttempts,
} from '../../hooks/useCourses';
import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { trackActivity } from '../../services/api';
import type { QuizStartResponse, SurveyQuestion, SurveySubmissionResult } from '../../types';

interface AnswerDraft {
  choice?: string | null;
  text_answer?: string;
}

export default function SurveyScreen() {
  const { id, courseId } = useLocalSearchParams<{ id: string; courseId?: string }>();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const { isRTL } = useDirection();
  const { t } = useTranslation();

  const { data: survey, isLoading, isError, error, refetch } = useSurvey(id);
  const { data: attempts = [] } = useSurveyAttempts(id);
  const startMutation = useStartSurveyMutation(id);
  const submitMutation = useSubmitSurveyMutation(id, courseId);

  const [startInfo, setStartInfo] = useState<QuizStartResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [result, setResult] = useState<SurveySubmissionResult | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!survey?.my_response) return;
    const draft: Record<string, AnswerDraft> = {};
    survey.my_response.answers.forEach((answer) => {
      draft[answer.question] = {
        choice: answer.choice ?? null,
        text_answer: answer.text_answer ?? '',
      };
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnswers(draft);
  }, [survey]);

  const questions = useMemo(() => survey?.questions ?? [], [survey]);
  const question = questions[index];
  const previousResponse = survey?.my_response;
  const showResult = Boolean(result) || Boolean(previousResponse);
  const limitedResult = result?.score === null;

  const isQuestionAnswered = (item: SurveyQuestion | undefined): boolean => {
    if (!item) return false;
    const draft = answers[item.id];
    if (item.question_type === 'SHORT_ANSWER') return Boolean(draft?.text_answer?.trim());
    return draft?.choice !== undefined && draft?.choice !== null;
  };

  const allAnswered = questions.length > 0 && questions.every(isQuestionAnswered);
  const resultByQuestion = useMemo(() => {
    const map = new Map<string, NonNullable<SurveySubmissionResult['results']>[number]>();
    (result?.results ?? []).forEach((item) => map.set(item.question, item));
    return map;
  }, [result]);

  const setChoice = (questionId: string, choice: string) =>
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], choice } }));

  const setText = (questionId: string, value: string) =>
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], text_answer: value },
    }));

  const begin = () => {
    startMutation.mutate(undefined, {
      onSuccess: (data) => {
        setStartInfo(data);
        setResult(null);
        setAnswers({});
        setIndex(0);
        if (courseId) {
          void trackActivity({
            event_type: 'QUIZ_STARTED',
            object_uuid: id,
            metadata: { course: courseId, attempt: data.attempt_number },
          });
        }
      },
    });
  };

  const handleSubmit = () => {
    if (!allAnswered || submitMutation.isPending) return;
    const payload = questions.map((item) => {
      const draft = answers[item.id] ?? {};
      return item.question_type === 'SHORT_ANSWER'
        ? { question: item.id, text_answer: draft.text_answer ?? '' }
        : { question: item.id, choice: draft.choice ?? null, text_answer: '' };
    });
    submitMutation.mutate(
      { answers: payload, attempt: startInfo?.attempt },
      {
        onSuccess: (data) => {
          setResult(data);
          setStartInfo(null);
        },
      },
    );
  };

  const retake = () => {
    setResult(null);
    setAnswers({});
    setIndex(0);
    setStartInfo(null);
  };

  if (isLoading) {
    return (
      <View className="flex-1 px-4" style={{ paddingTop: insets.top + 60 }}>
        <Stack gap={16}>
          <Skeleton height={28} width="60%" />
          <Skeleton height={200} radius={32} />
        </Stack>
      </View>
    );
  }

  if (isError || !survey) {
    return (
      <View className="flex-1">
        <ScreenHeader title={t('survey')} />
        <ErrorState error={error} message={t('courseLoadError')} onRetry={() => void refetch()} />
      </View>
    );
  }

  if (showResult) {
    const score = result?.score ?? previousResponse?.score ?? 0;
    const total = result?.total ?? survey.total_points ?? 0;
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;

    return (
      <View className="flex-1">
        <ScreenHeader title={survey.title} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
          <Card variant="hero" tone="brand" className="items-center overflow-hidden">
            <GhostNumber
              value={String(percent)}
              size={96}
              style={{
                position: 'absolute',
                top: -14,
                ...(isRTL ? { left: -6 } : { right: -6 }),
              }}
            />
            {limitedResult ? (
              <AppText variant="bodySm" tone="muted" align="center">
                {result?.message ?? t('yourScore')}
              </AppText>
            ) : (
              <>
                <ProgressRing value={percent} size={160} strokeWidth={12}>
                  <TwoToneNumber
                    value={String(score)}
                    secondary={`/ ${total}`}
                    variant="display"
                    align="center"
                  />
                </ProgressRing>
                <AppText variant="title" className="mt-3">
                  {t('yourScore')}
                </AppText>
                {result ? (
                  <AppText variant="bodySm" tone="muted">
                    {t('correctAnswers', {
                      correct: result.correct_count ?? 0,
                      total: questions.length,
                    })}
                  </AppText>
                ) : null}
              </>
            )}
          </Card>

          <Stack gap={12} className="mt-4">
            {questions.map((item, itemIndex) => {
              const outcome = resultByQuestion.get(item.id);
              const previousAnswer = previousResponse?.answers.find(
                (answer) => answer.question === item.id,
              );
              const isCorrect = outcome ? outcome.is_correct : previousAnswer?.is_correct;
              return (
                <Card key={item.id} variant="list">
                  <Row gap={8} align="flex-start">
                    <Ionicons
                      name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={isCorrect ? tokens.success : tokens.danger}
                    />
                    <AppText variant="body" weight="medium" className="flex-1">
                      {itemIndex + 1}. {item.text}
                    </AppText>
                  </Row>
                  {outcome?.explanation ? (
                    <AppText variant="bodySm" tone="muted" className="mt-2">
                      {outcome.explanation}
                    </AppText>
                  ) : null}
                </Card>
              );
            })}
          </Stack>

          <Button
            label={t('retakeSurvey')}
            variant="secondary"
            fullWidth
            className="mt-4"
            onPress={retake}
          />
        </ScrollView>
      </View>
    );
  }

  // Not started yet: show the quiz briefing + attempt history.
  if (!startInfo) {
    const attemptsLeft = survey.attempts_left;
    const blocked = attemptsLeft === 0;

    return (
      <View className="flex-1">
        <ScreenHeader title={survey.title} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}>
          <Card variant="list">
            <AppText variant="title">{survey.title}</AppText>
            {survey.description ? (
              <AppText variant="bodySm" tone="muted" className="mt-2">
                {survey.description}
              </AppText>
            ) : null}
            <Stack gap={4} className="mt-3">
              <AppText variant="caption" tone="muted">
                {t('surveysCount', { count: questions.length })}
              </AppText>
              {survey.time_limit_minutes ? (
                <AppText variant="caption" tone="muted">
                  {t('repeatDuration')}: {survey.time_limit_minutes}
                </AppText>
              ) : null}
              {attemptsLeft !== null && attemptsLeft !== undefined ? (
                <AppText variant="caption" tone="muted">
                  {`${t('retakeSurvey')}: ${attemptsLeft}`}
                </AppText>
              ) : null}
            </Stack>
          </Card>

          {attempts.length > 0 ? (
            <Stack gap={8} className="mt-4">
              {attempts.map((attempt) => (
                <Card key={attempt.id} variant="list">
                  <Row justify="space-between" align="center">
                    <AppText variant="bodySm">{`#${attempt.attempt_number}`}</AppText>
                    <AppText variant="bodySm" tone="muted">
                      {attempt.submitted_at ? String(attempt.score) : '—'}
                    </AppText>
                  </Row>
                </Card>
              ))}
            </Stack>
          ) : null}
        </ScrollView>

        <View
          className="absolute left-0 right-0 bottom-0 px-4"
          style={{ paddingBottom: insets.bottom + 12, paddingTop: 8 }}
        >
          <Button
            label={blocked ? t('courseLocked') : t('startCourse')}
            fullWidth
            loading={startMutation.isPending}
            disabled={blocked}
            onPress={begin}
          />
        </View>
      </View>
    );
  }

  const progressPercent = questions.length ? ((index + 1) / questions.length) * 100 : 0;
  const isLast = index >= questions.length - 1;

  return (
    <View className="flex-1">
      <ScreenHeader title={survey.title} />

      <View className="px-4 pb-3">
        <Card variant="list">
          <Row justify="space-between" align="center" className="mb-2">
            <AppText
              variant="micro"
              weight="medium"
              tone="subtle"
              className="uppercase tracking-widest"
            >
              {t('questionProgress', { current: index + 1, total: questions.length })}
            </AppText>
            <AppText variant="caption" tone="brand">
              {Math.round(progressPercent)}%
            </AppText>
          </Row>
          <ProgressBar value={progressPercent} />
        </Card>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
        {question ? (
          <Card variant="list">
            <AppText variant="title">
              {index + 1}. {question.text}
            </AppText>

            <Stack gap={10} className="mt-4">
              {question.question_type === 'SHORT_ANSWER' ? (
                <TextField
                  multiline
                  value={answers[question.id]?.text_answer ?? ''}
                  onChangeText={(value) => setText(question.id, value)}
                  placeholder={t('yourPreviousAnswer')}
                />
              ) : (
                question.choices.map((choice) => {
                  const selected = answers[question.id]?.choice === choice.id;
                  return (
                    <Pressable
                      key={choice.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={choice.text}
                      onPress={() => setChoice(question.id, choice.id)}
                      className="min-h-[48px] justify-center rounded-card border px-4 py-3.5"
                      style={{
                        borderColor: selected ? tokens.brand : tokens.hairline,
                        backgroundColor: selected ? `${tokens.brand}26` : tokens.surface2,
                      }}
                    >
                      <AppText variant="body" tone={selected ? 'brand' : 'ink'}>
                        {choice.text}
                      </AppText>
                    </Pressable>
                  );
                })
              )}
            </Stack>
          </Card>
        ) : null}
      </ScrollView>

      <View
        className="absolute left-0 right-0 bottom-0 px-4"
        style={{ paddingBottom: insets.bottom + 12, paddingTop: 8 }}
      >
        <Row gap={12}>
          {index > 0 ? (
            <Button
              label={t('previous')}
              variant="secondary"
              icon="arrow-back"
              onPress={() => setIndex((value) => Math.max(0, value - 1))}
            />
          ) : null}
          <View className="flex-1">
            <Button
              fullWidth
              loading={submitMutation.isPending}
              disabled={!isQuestionAnswered(question) || (isLast && !allAnswered)}
              label={isLast ? t('submit') : t('next')}
              onPress={() => {
                if (isLast) handleSubmit();
                else setIndex((value) => value + 1);
              }}
            />
          </View>
        </Row>
      </View>
    </View>
  );
}