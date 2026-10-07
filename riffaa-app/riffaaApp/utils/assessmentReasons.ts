import type {
  AssessmentReason,
  MasteryConfidence,
  MasteryTrend,
  ReadinessBand,
} from '../services/api/assessment';
import type { SubjectTier } from '../services/api/planner';

/**
 * Assessment reason codes are stable identifiers from the mastery/readiness
 * engine; the client owns the translation (the backend never returns prose).
 */
const REASON_KEYS: Record<string, string> = {
  TOPIC_MASTERY_LOW: 'assessmentReasonTopicMasteryLow',
  TOPIC_MASTERED: 'assessmentReasonTopicMastered',
  DUE_FLASHCARDS: 'assessmentReasonDueFlashcards',
  IMPORTANCE_UNKNOWN: 'assessmentReasonImportanceUnknown',
  WEAKNESS_CAPPED_BY_COEFFICIENT: 'assessmentReasonWeaknessCapped',
  SUBJECT_LOW_IMPORTANCE_CAPPED: 'assessmentReasonLowImportanceCapped',
};

export function reasonKey(code: string): string | null {
  return REASON_KEYS[code] ?? null;
}

/** i18n key for a reason code, or null when the code has no copy yet. */
export function assessmentReasonKey(reason: AssessmentReason): string | null {
  return reasonKey(reason.code);
}

export const BAND_KEY: Record<ReadinessBand, string> = {
  NONE: 'assessmentBandNone',
  WEAK: 'assessmentBandWeak',
  DEVELOPING: 'assessmentBandDeveloping',
  SECURE: 'assessmentBandSecure',
  STRONG: 'assessmentBandStrong',
};

export const CONFIDENCE_KEY: Record<MasteryConfidence, string> = {
  NONE: 'assessmentConfidenceNone',
  LOW: 'assessmentConfidenceLow',
  MEDIUM: 'assessmentConfidenceMedium',
  HIGH: 'assessmentConfidenceHigh',
};

export const TREND_KEY: Record<MasteryTrend, string> = {
  UP: 'assessmentTrendUp',
  FLAT: 'assessmentTrendFlat',
  DOWN: 'assessmentTrendDown',
  UNKNOWN: 'assessmentTrendUnknown',
};

export const TREND_ICON: Record<MasteryTrend, 'arrow-up' | 'remove' | 'arrow-down' | null> = {
  UP: 'arrow-up',
  FLAT: 'remove',
  DOWN: 'arrow-down',
  UNKNOWN: null,
};

export const TIER_KEY: Record<SubjectTier, string> = {
  CORE: 'assessmentTierCore',
  STANDARD: 'assessmentTierStandard',
  LIGHT: 'assessmentTierLight',
};

/** Semantic tone for a readiness band (maps onto the Badge tones). */
export function bandTone(band: ReadinessBand): 'success' | 'danger' | 'neutral' | 'info' {
  switch (band) {
    case 'STRONG':
    case 'SECURE':
      return 'success';
    case 'DEVELOPING':
      return 'info';
    case 'WEAK':
      return 'danger';
    default:
      return 'neutral';
  }
}

/**
 * A mastery value is only meaningful with confidence above NONE. When it is
 * NONE the UI must show a label (e.g. "not enough data"), never a percentage.
 */
export function hasMastery(value: number | null, confidence: MasteryConfidence): boolean {
  return value !== null && confidence !== 'NONE';
}

/** 0..1 readiness/mastery to a heat colour token name (see `masteryHeat`). */
export function masteryHeat(value: number | null): 'none' | 'cold' | 'warm' | 'hot' {
  if (value === null) return 'none';
  if (value < 0.4) return 'cold';
  if (value < 0.7) return 'warm';
  return 'hot';
}
