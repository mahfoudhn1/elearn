import { currentLocale } from '../services/i18n';

type DateInput = Date | string | number;

/**
 * Locale-aware formatting helpers. Screens must use these instead of calling
 * `toLocaleDateString('ar-EG')` (or similar) inline, so dates and numbers stay
 * consistent and follow the app's chosen language.
 *
 * Algerian Arabic (`ar-DZ`) intentionally uses Latin digits, which is what the
 * app's audience expects.
 */
const LOCALE_TAG: Record<string, string> = {
  ar: 'ar-DZ',
  en: 'en-GB',
  fr: 'fr-FR',
};

function localeTag(): string {
  return LOCALE_TAG[currentLocale()] ?? 'ar-DZ';
}

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

const dateCache = new Map<string, Intl.DateTimeFormat>();
const numberCache = new Map<string, Intl.NumberFormat>();

function dateFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat | null {
  const key = `${localeTag()}|${JSON.stringify(options)}`;
  const cached = dateCache.get(key);
  if (cached) return cached;
  try {
    const formatter = new Intl.DateTimeFormat(localeTag(), options);
    dateCache.set(key, formatter);
    return formatter;
  } catch {
    return null;
  }
}

/** Formats a number using the app locale (grouping, decimals). */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  const key = `${localeTag()}|${JSON.stringify(options ?? {})}`;
  const cached = numberCache.get(key);
  if (cached) return cached.format(value);
  try {
    const formatter = new Intl.NumberFormat(localeTag(), options);
    numberCache.set(key, formatter);
    return formatter.format(value);
  } catch {
    return String(value);
  }
}

/** Short calendar date, e.g. `21 Sep` / `21 سبتمبر`. */
export function formatDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
): string {
  const date = toDate(value);
  const formatter = dateFormatter(options);
  if (formatter) return formatter.format(date);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

/** Long calendar date, e.g. `Monday, 21 September`. */
export function formatLongDate(value: DateInput): string {
  return formatDate(value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** Time of day, e.g. `14:30`. */
export function formatTime(value: DateInput): string {
  return formatDate(value, { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * `MM:SS` under an hour, `H:MM:SS` above — the Pomodoro/session display format.
 */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/** Human duration from minutes, e.g. `1 h 30 min`. */
export function formatDurationLong(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours === 0) return `${formatNumber(rest)} min`;
  if (rest === 0) return `${formatNumber(hours)} h`;
  return `${formatNumber(hours)} h ${formatNumber(rest)} min`;
}

export function formatCurrency(value: string) {
  if (value.toLowerCase() === 'free') return 'Free';
  return value;
}

export function getProgressPercent(completed: number, total: number) {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
