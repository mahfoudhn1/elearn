import type { TranslateOptions } from '../services/i18n';
import type { PlannerReason } from '../services/api/planner';

/**
 * Reason codes are stable identifiers from the engine; the client owns the
 * translation. This maps a code to an i18n key and, when useful, derives a
 * compact numeric detail (e.g. "+120 min") from the structured params.
 */
const REASON_KEYS: Record<string, string> = {
  WEEKLY_TARGET: 'reasonWeeklyTarget',
  IMPORTANCE_FROM_COEFFICIENT: 'reasonImportance',
  WEAKNESS_MULTIPLIER: 'reasonWeakness',
  EXAM_BOOST: 'reasonExamBoost',
  INSTRUCTION_CREDIT: 'reasonInstructionCredit',
  HISTORY_CREDIT: 'reasonHistoryCredit',
  CLAMPED_AT_ZERO: 'reasonClampedZero',
  CLAMPED_AT_MAX: 'reasonClampedMax',
  DEFICIT_CARRYOVER_CAPPED: 'reasonDeficitCap',
  PRIORITY_WEIGHT: 'reasonPriority',
  EXAM_REVISION: 'reasonExamRevision',
  FOLLOWUP_CHAIN: 'reasonFollowup',
  PLACED_SESSION: 'reasonPlaced',
  NO_FREE_SLOT: 'reasonNoFreeSlot',
  PAST_DUE: 'reasonPastDue',
  INSUFFICIENT_HISTORY: 'reasonInsufficientHistory',
  HISTORY_APPLIED: 'reasonHistoryApplied',
  // Soft-score term codes (used by debug surfaces).
  preferred_period: 'reasonPreferredPeriod',
  spread_across_days: 'reasonSpread',
  hard_subject_spacing: 'reasonSubjectSpacing',
  lesson_proximity: 'reasonLessonProximity',
  length_fit: 'reasonLengthFit',
  band_penalty: 'reasonBandPenalty',
  topic_recency: 'reasonTopicRecency',
};

export function reasonKey(code: string): string | null {
  return REASON_KEYS[code] ?? null;
}

function numeric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Compact detail string for a reason, or null when the code has none. */
export function reasonDetail(reason: PlannerReason): string | null {
  const params = reason.params ?? {};
  if (reason.code === 'WEEKLY_TARGET') {
    const target = numeric(params.weekly_target_minutes);
    return target != null ? `${target} min` : null;
  }
  if (
    reason.code === 'INSTRUCTION_CREDIT' ||
    reason.code === 'HISTORY_CREDIT'
  ) {
    const credited = numeric(params.credited_minutes);
    return credited != null ? `-${credited} min` : null;
  }
  if (reason.code === 'EXAM_BOOST' || reason.code === 'WEAKNESS_MULTIPLIER') {
    const multiplier = numeric(params.multiplier);
    return multiplier != null ? `×${multiplier}` : null;
  }
  if (reason.code === 'EXAM_REVISION') {
    const days = numeric(params.days_until_exam);
    return days != null ? `${days} d` : null;
  }
  if (reason.code === 'FOLLOWUP_CHAIN' && typeof params.to === 'string') {
    return String(params.to);
  }
  if (reason.code === 'NO_FREE_SLOT') {
    const minutes = numeric(params.remaining_minutes);
    return minutes != null ? `${minutes} min` : null;
  }
  if (reason.code === 'PRIORITY_WEIGHT' && typeof params.code === 'string') {
    return String(params.code);
  }
  return null;
}

const ACTIVITY_KEYS: Record<string, string> = {
  STUDY: 'plannerActivityStudy',
  LESSON: 'plannerActivityStudy',
  REVIEW: 'plannerActivityReview',
  EXERCISES: 'plannerActivityExercises',
  REVISION: 'plannerActivityRevision',
};

export function activityKey(activityType: string): string {
  return ACTIVITY_KEYS[activityType] ?? 'plannerActivityStudy';
}

/** Busy-block kinds -> label key (school/class/tutoring/private). */
const BLOCK_KIND_KEYS: Record<string, string> = {
  SCHOOL: 'plannerSchool',
  GROUP_LESSON: 'plannerClass',
  EXTERNAL_TUTORING: 'plannerTutoring',
  PRIVATE_SESSION: 'plannerPrivate',
  OTHER_FIXED: 'plannerTutoring',
  PROTECTED_BLOCK: 'plannerPrivate',
};

export function blockKindKey(kind: string): string {
  return BLOCK_KIND_KEYS[kind] ?? 'plannerSchool';
}

export type Translate = (key: string, config?: TranslateOptions) => string;
