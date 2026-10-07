import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { MathText } from '../../components/assessment/MathText';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
  Skeleton,
  Stack,
} from '../../components/ui';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import {
  getDueCards,
  getFlashcardStats,
  type DueCard,
  type FlashcardRating,
  type FlashcardStats,
} from '../../services/api/assessment';
import { isDeviceOffline } from '../../services/connectivity';
import { cacheDeck, loadCachedDeck } from '../../services/offline/flashcardDeck';
import {
  enqueueFlashcardReview,
  flushFlashcardQueue,
  hydrateFlashcardQueue,
  subscribeFlashcardQueue,
} from '../../services/offline/flashcardQueue';

interface RatingSpec {
  rating: FlashcardRating;
  labelKey: string;
  icon: 'refresh' | 'remove' | 'checkmark' | 'flash';
  tone: 'danger' | 'brand' | 'success' | 'info';
}

/** Module-scope clock read keeps `Date.now` out of the component render scope. */
function nowMs(): number {
  return Date.now();
}

const RATINGS: RatingSpec[] = [
  { rating: 'AGAIN', labelKey: 'assessmentRatingAgain', icon: 'refresh', tone: 'danger' },
  { rating: 'HARD', labelKey: 'assessmentRatingHard', icon: 'remove', tone: 'brand' },
  { rating: 'GOOD', labelKey: 'assessmentRatingGood', icon: 'checkmark', tone: 'success' },
  { rating: 'EASY', labelKey: 'assessmentRatingEasy', icon: 'flash', tone: 'info' },
];

/**
 * Flashcard player. Swipe-free tap-to-flip, four ratings, and an offline-first
 * queue: a rating is written locally with a `client_review_id` and flushed to
 * the server (idempotently). The daily new-card limit and the pending-queue
 * count are both shown.
 */
export default function FlashcardsScreen() {
  const { t, locale } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();

  const [deck, setDeck] = useState<DueCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const shownAt = useRef<number>(0);

  const load = useCallback(async () => {
    await hydrateFlashcardQueue();
    try {
      const [due, flashcardStats] = await Promise.all([
        getDueCards({ limit: 100 }),
        getFlashcardStats(),
      ]);
      setDeck(due.cards);
      setStats(flashcardStats);
      await cacheDeck(due);
    } catch {
      const cached = await loadCachedDeck();
      setDeck(cached?.cards ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeFlashcardQueue((queue) => setPending(queue.length)), []);

  useEffect(() => {
    void flushFlashcardQueue();
  }, []);

  const current = deck?.[index] ?? null;

  useEffect(() => {
    setFlipped(false);
    shownAt.current = nowMs();
  }, [current?.card.id]);

  const total = deck?.length ?? 0;
  const progress = total ? ((index + (flipped ? 0.5 : 0)) / total) * 100 : 0;

  const front = current
    ? locale === 'ar'
      ? current.card.front_ar || current.card.front_fr
      : current.card.front_fr || current.card.front_ar
    : '';
  const back = current
    ? locale === 'ar'
      ? current.card.back_ar || current.card.back_fr
      : current.card.back_fr || current.card.back_ar
    : '';

  const rate = async (rating: FlashcardRating) => {
    if (!current || busy) return;
    setBusy(true);
    const responseMs = nowMs() - shownAt.current;
    try {
      await enqueueFlashcardReview({
        cardId: current.card.id,
        rating,
        responseMs,
      });
      // Fire-and-forget flush; offline items stay queued.
      void flushFlashcardQueue().then(async (result) => {
        if (result.sent.length > 0) {
          const nextStats = await getFlashcardStats().catch(() => null);
          if (nextStats) setStats(nextStats);
        }
      });
      setIndex((prev) => prev + 1);
    } finally {
      setBusy(false);
    }
  };

  const newSeen = stats?.new_seen_today ?? 0;
  const newLimit = stats?.new_cards_per_day ?? 0;

  const offline = isDeviceOffline();

  return (
    <View className="flex-1">
      <ScreenHeader
        title={t('assessmentFlashcards')}
        onBack={() => router.back()}
        right={
          pending > 0 ? (
            <Row gap={4} align="center">
              <Ionicons name="cloud-upload-outline" size={16} color={tokens.inkMuted} />
              <AppText variant="caption" tone="muted">
                {pending}
              </AppText>
            </Row>
          ) : undefined
        }
      />
      <Screen scroll>
        {deck === null ? (
          <Stack gap={10}>
            <Skeleton height={220} radius={24} />
            <Skeleton height={60} radius={24} />
          </Stack>
        ) : total === 0 ? (
          <EmptyState
            icon="albums-outline"
            title={t('assessmentNoCardsDue')}
            message={t('assessmentFlashcardsOfflineHint')}
            actionLabel={t('assessmentBackToReadiness')}
            onAction={() => router.replace('/assessment')}
          />
        ) : (
          <Stack gap={14}>
            <Stack gap={8}>
              <Row justify="space-between" align="center">
                <AppText variant="micro" weight="medium" tone="subtle" className="uppercase tracking-widest">
                  {t('assessmentDailyLimit', { seen: newSeen, limit: newLimit })}
                </AppText>
                <Badge label={`${Math.min(index + 1, total)}/${total}`} tone="neutral" />
              </Row>
              <ProgressBar value={progress} />
              {offline || pending > 0 ? (
                <AppText variant="micro" tone="subtle">
                  {t('assessmentQueueOffline')}
                </AppText>
              ) : null}
            </Stack>

            <Pressable onPress={() => setFlipped((prev) => !prev)}>
              <Card variant="hero" className="min-h-[220px] justify-center p-5">
                <Stack gap={12} align="center">
                  <AppText variant="micro" weight="medium" tone="subtle" className="uppercase tracking-widest">
                    {flipped ? t('assessmentRatingGood') : t('assessmentTapToFlip')}
                  </AppText>
                  <MathText variant="heading" align="center">
                    {flipped ? back : front}
                  </MathText>
                </Stack>
              </Card>
            </Pressable>

            {flipped ? (
              <Row gap={8} wrap>
                {RATINGS.map((spec) => (
                  <View key={spec.rating} className="flex-1 basis-[45%]">
                    <Button
                      label={t(spec.labelKey)}
                      icon={spec.icon}
                      variant={spec.rating === 'AGAIN' ? 'danger' : spec.rating === 'EASY' ? 'ghost' : 'secondary'}
                      onPress={() => void rate(spec.rating)}
                      fullWidth
                    />
                  </View>
                ))}
              </Row>
            ) : (
              <Button
                label={t('assessmentTapToFlip')}
                onPress={() => setFlipped(true)}
                fullWidth
              />
            )}
          </Stack>
        )}
      </Screen>
    </View>
  );
}
