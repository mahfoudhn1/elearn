import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { QuestionBody } from '../../components/assessment/QuestionBody';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
  Skeleton,
  Stack,
} from '../../components/ui';
import { useTranslation } from '../../hooks/useTranslation';
import {
  answerQuestion,
  listQuizzes,
  nextQuestion,
  startAttempt,
  submitAttempt,
  type QuestionOption,
  type ServedQuestion,
  type StartedAttempt,
} from '../../services/api/assessment';

/**
 * Adaptive diagnostic flow. The server picks the next question via
 * `/attempts/<id>/next/` (coverage-first, difficulty staircase) and signals when
 * to stop; this screen only collects each answer. Results are shown on the
 * shared results screen, which reads the attempt's `diagnostic` payload.
 */
export default function DiagnosticScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [attempt, setAttempt] = useState<StartedAttempt | null>(null);
  const [question, setQuestion] = useState<ServedQuestion | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [numeric, setNumeric] = useState('');
  const [asked, setAsked] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [noQuiz, setNoQuiz] = useState(false);

  const fetchNext = useCallback(
    async (active: StartedAttempt) => {
      const next = await nextQuestion(active.id);
      if (next.stopped) {
        await submitAttempt(active.id);
        router.replace({
          pathname: '/assessment/results/[attemptId]',
          params: { attemptId: active.id },
        });
        return;
      }
      setQuestion(next.question ?? null);
      setSelected([]);
      setNumeric('');
      setAsked(next.asked_count ?? 0);
    },
    [router],
  );

  const boot = useCallback(async () => {
    setError(false);
    setNoQuiz(false);
    try {
      const quizzes = await listQuizzes({ kind: 'DIAGNOSTIC' });
      if (quizzes.length === 0) {
        setNoQuiz(true);
        return;
      }
      const started = await startAttempt({ quiz: quizzes[0].id });
      setAttempt(started);
      await fetchNext(started);
    } catch {
      setError(true);
    }
  }, [fetchNext]);

  useEffect(() => {
    void boot();
  }, [boot]);

  const toggleOption = (option: QuestionOption) => {
    if (busy || !question) return;
    if (question.kind === 'MCQ_MULTI') {
      setSelected((prev) =>
        prev.includes(option.id) ? prev.filter((id) => id !== option.id) : [...prev, option.id],
      );
    } else {
      setSelected([option.id]);
    }
  };

  const submit = async () => {
    if (!attempt || !question || busy) return;
    setBusy(true);
    try {
      const response =
        question.kind === 'NUMERIC' ? { value: numeric.trim() } : { option_ids: selected };
      await answerQuestion(attempt.id, { question: question.id, response });
      await fetchNext(attempt);
    } catch {
      Alert.alert(t('assessmentError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1">
      <ScreenHeader
        title={t('assessmentQuizDiagnostic')}
        onBack={() => router.back()}
        right={asked > 0 ? <Badge label={`${asked}`} tone="neutral" /> : undefined}
      />
      <Screen scroll>
        {error ? (
          <ErrorState
            error={new Error(t('assessmentError'))}
            onRetry={() => {
              void boot();
            }}
            retryLabel={t('assessmentRetry')}
          />
        ) : noQuiz ? (
          <EmptyState
            icon="sparkles-outline"
            title={t('assessmentNotEnoughData')}
            message={t('assessmentNotEnoughDataHint')}
            actionLabel={t('assessmentBackToReadiness')}
            onAction={() => router.replace('/assessment')}
          />
        ) : !question ? (
          <Stack gap={10}>
            <Skeleton height={120} radius={24} />
            <Skeleton height={60} radius={24} />
          </Stack>
        ) : (
          <Stack gap={16}>
            <Stack gap={8}>
              <Row justify="space-between" align="center">
                <AppText variant="micro" weight="medium" tone="subtle" className="uppercase tracking-widest">
                  {t('assessmentQuizDiagnostic')}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {t('assessmentQuestionOf', { current: asked + 1, total: '…' })}
                </AppText>
              </Row>
              <ProgressBar value={asked > 0 ? Math.min(95, (asked / (asked + 4)) * 100) : 6} />
            </Stack>

            <Card variant="hero" className="p-4">
              <QuestionBody
                question={question}
                selected={selected}
                numeric={numeric}
                onToggleOption={toggleOption}
                onNumericChange={setNumeric}
                disabled={busy}
              />
            </Card>

            <Button
              label={t('assessmentNext')}
              onPress={() => void submit()}
              loading={busy}
              disabled={
                question.kind === 'NUMERIC' ? numeric.trim().length === 0 : selected.length === 0
              }
              fullWidth
            />
          </Stack>
        )}
      </Screen>
    </View>
  );
}
