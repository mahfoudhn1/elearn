import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { MathText } from '../../../components/assessment/MathText';
import { QuestionBody } from '../../../components/assessment/QuestionBody';
import {
  AppText,
  Badge,
  Button,
  Card,
  ErrorState,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
  Stack,
} from '../../../components/ui';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  answerQuestion,
  getAttemptResult,
  startAttempt,
  submitAttempt,
  type QuestionOption,
  type ServedQuestion,
  type StartedAttempt,
  type AttemptResultRow,
} from '../../../services/api/assessment';

function isPractice(kind: string | undefined): boolean {
  return kind === 'TOPIC_PRACTICE' || kind === 'DIAGNOSTIC';
}

function buildResponse(question: ServedQuestion, selected: string[], numeric: string) {
  if (question.kind === 'NUMERIC') {
    return { value: numeric.trim() };
  }
  return { option_ids: selected };
}

/**
 * Quiz player. Starts (or resumes) a server attempt, serves one question per
 * screen, and grades each answer server-side. Practice quizzes reveal the
 * explanation immediately; mock exams hide it and ask for confirmation before
 * submit. The server owns correctness and timing; this screen never decides.
 */
export default function QuizPlayerScreen() {
  const { t, locale } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ quizId?: string; kind?: string }>();
  const quizId = typeof params.quizId === 'string' ? params.quizId : '';

  const [attempt, setAttempt] = useState<StartedAttempt | null>(null);
  const [rows, setRows] = useState<AttemptResultRow[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [numeric, setNumeric] = useState('');
  const [feedback, setFeedback] = useState<Record<string, { is_correct?: boolean; explanation?: string }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const submittedRef = useRef(false);

  const practice = isPractice(attempt?.quiz_kind ?? params.kind);

  const load = useCallback(async () => {
    if (!quizId) return;
    setError(false);
    try {
      const started = await startAttempt({ quiz: quizId });
      const result = await getAttemptResult(started.id);
      if (result.status !== 'IN_PROGRESS') {
        router.replace({
          pathname: '/assessment/results/[attemptId]',
          params: { attemptId: started.id },
        });
        return;
      }
      setAttempt(started);
      setRows(result.answers);
      const firstUnanswered = result.answers.findIndex((row) => !row.answered);
      setIndex(firstUnanswered === -1 ? 0 : firstUnanswered);
    } catch {
      setError(true);
    }
  }, [quizId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  // Countdown from the server-provided expiry.
  useEffect(() => {
    if (!attempt?.expires_at) {
      setRemaining(null);
      return;
    }
    const deadline = new Date(attempt.expires_at).getTime();
    const tick = () => {
      const seconds = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      return seconds;
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt?.expires_at]);

  const current = rows[index];
  const question = current?.question;
  const questionId = question?.id ?? null;
  const answered = Boolean(current?.answered);

  // Reset the working selection whenever the served question changes.
  useEffect(() => {
    if (!questionId || !answered) {
      setSelected([]);
      setNumeric('');
    }
  }, [questionId, answered]);

  const total = rows.length;
  const answeredCount = useMemo(() => rows.filter((row) => row.answered).length, [rows]);

  const toggleOption = (option: QuestionOption) => {
    if (answered || busy) return;
    if (question?.kind === 'MCQ_MULTI') {
      setSelected((prev) =>
        prev.includes(option.id) ? prev.filter((id) => id !== option.id) : [...prev, option.id],
      );
    } else {
      setSelected([option.id]);
    }
  };

  const submitAnswer = async () => {
    if (!attempt || !question || busy) return;
    setBusy(true);
    try {
      const response = buildResponse(question, selected, numeric);
      const result = await answerQuestion(attempt.id, { question: question.id, response });
      setRows((prev) =>
        prev.map((row, position) =>
          position === index ? { ...row, answered: true, is_correct: result.is_correct } : row,
        ),
      );
      if (practice) {
        setFeedback((prev) => ({
          ...prev,
          [question.id]: {
            is_correct: result.is_correct,
            explanation:
              (locale === 'ar' ? result.explanation_ar : result.explanation_fr) ??
              result.explanation_fr ??
              result.explanation_ar,
          },
        }));
      }
    } catch {
      Alert.alert(t('assessmentError'));
    } finally {
      setBusy(false);
    }
  };

  const finalize = useCallback(async () => {
    if (!attempt || submittedRef.current) return;
    submittedRef.current = true;
    try {
      await submitAttempt(attempt.id);
      router.replace({
        pathname: '/assessment/results/[attemptId]',
        params: { attemptId: attempt.id },
      });
    } catch {
      submittedRef.current = false;
      Alert.alert(t('assessmentError'));
    }
  }, [attempt, router, t]);

  // Auto-submit when the timer runs out.
  useEffect(() => {
    if (remaining === 0 && attempt && !submittedRef.current) {
      void finalize();
    }
  }, [remaining, attempt, finalize]);

  const confirmSubmit = () => {
    Alert.alert(t('assessmentConfirmSubmit'), t('assessmentConfirmSubmitMessage'), [
      { text: t('assessmentStop'), style: 'cancel' },
      { text: t('assessmentSubmit'), onPress: () => void finalize() },
    ]);
  };

  const goNext = () => {
    if (index < total - 1) {
      setIndex(index + 1);
    } else {
      confirmSubmit();
    }
  };

  if (error) {
    return (
      <View className="flex-1">
        <ScreenHeader title={t('assessmentTitle')} onBack={() => router.back()} />
        <Screen>
          <ErrorState
            error={new Error(t('assessmentError'))}
            onRetry={() => {
              void load();
            }}
            retryLabel={t('assessmentRetry')}
          />
        </Screen>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScreenHeader
        title={t(practice ? 'assessmentQuizPractice' : 'assessmentQuizMock')}
        onBack={() => router.back()}
        right={
          remaining !== null ? (
            <Row gap={4} align="center">
              <Ionicons name="time-outline" size={16} color={tokens.inkMuted} />
              <AppText variant="caption" tone="muted">
                {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
              </AppText>
            </Row>
          ) : undefined
        }
      />
      <Screen scroll>
        {!question ? (
          <AppText variant="bodySm" tone="muted" align="center">
            {t('assessmentLoading')}
          </AppText>
        ) : (
          <Stack gap={16}>
            <Stack gap={8}>
              <Row justify="space-between" align="center">
                <AppText variant="micro" weight="medium" tone="subtle" className="uppercase tracking-widest">
                  {t('assessmentQuestionOf', { current: index + 1, total })}
                </AppText>
                <Badge label={`${answeredCount}/${total}`} tone="neutral" />
              </Row>
              <ProgressBar value={total ? ((index + 1) / total) * 100 : 0} />
            </Stack>

            <Card variant="hero" className="p-4">
              <Stack gap={12}>
                <QuestionBody
                  question={question}
                  selected={selected}
                  numeric={numeric}
                  onToggleOption={toggleOption}
                  onNumericChange={setNumeric}
                  disabled={answered || busy}
                />
                {question.image ? (
                  <AppText variant="caption" tone="subtle">
                    {question.image}
                  </AppText>
                ) : null}
              </Stack>
            </Card>

            {practice && answered && feedback[question.id] ? (
              <Card
                variant="list"
                tone={feedback[question.id]?.is_correct ? 'success' : 'danger'}
              >
                <Stack gap={6}>
                  <Row gap={6} align="center">
                    <Ionicons
                      name={feedback[question.id]?.is_correct ? 'checkmark-circle' : 'close-circle'}
                      size={18}
                      color={feedback[question.id]?.is_correct ? tokens.success : tokens.danger}
                    />
                    <AppText variant="bodySm" weight="medium">
                      {t(feedback[question.id]?.is_correct ? 'assessmentCorrect' : 'assessmentIncorrect')}
                    </AppText>
                  </Row>
                  {feedback[question.id]?.explanation ? (
                    <Stack gap={4}>
                      <AppText variant="micro" tone="subtle" className="uppercase tracking-widest">
                        {t('assessmentExplanation')}
                      </AppText>
                      <MathText variant="bodySm" tone="muted">
                        {feedback[question.id]?.explanation ?? ''}
                      </MathText>
                    </Stack>
                  ) : null}
                </Stack>
              </Card>
            ) : null}

            <Stack gap={10}>
              {!answered ? (
                <Button
                  label={t('assessmentSubmit')}
                  onPress={() => void submitAnswer()}
                  loading={busy}
                  disabled={
                    question.kind === 'NUMERIC'
                      ? numeric.trim().length === 0
                      : selected.length === 0
                  }
                  fullWidth
                />
              ) : (
                <Button label={t('assessmentNext')} onPress={goNext} fullWidth trailingIcon="arrow-forward" />
              )}
            </Stack>
          </Stack>
        )}
      </Screen>
    </View>
  );
}
