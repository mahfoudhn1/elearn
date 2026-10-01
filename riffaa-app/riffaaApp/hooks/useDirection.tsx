import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

export interface DirectionValue {
  isRTL: boolean;
  dir: 'rtl' | 'ltr';
}

const DirectionContext = createContext<DirectionValue | null>(null);

/**
 * Overrides the direction for a subtree. Only used by the dev kit (and tests);
 * production direction always comes from the app locale.
 */
export function DirectionProvider({
  value,
  children,
}: {
  value: DirectionValue;
  children: ReactNode;
}) {
  return (
    <DirectionContext.Provider value={value}>
      {children}
    </DirectionContext.Provider>
  );
}

/**
 * Single source of truth for layout direction.
 *
 * Direction is driven from the app locale in JS — never from
 * `I18nManager.forceRTL` — so switching language never needs a reload and
 * Arabic layouts never double-flip.
 */
export function useDirection(): DirectionValue {
  const override = useContext(DirectionContext);
  const locale = useSettingsStore((state) => state.locale);
  const isRTL = locale === 'ar';

  return useMemo(
    () => override ?? { isRTL, dir: isRTL ? 'rtl' : 'ltr' },
    [override, isRTL],
  );
}

/**
 * Direction-aware `flexDirection` for hand-written horizontal rows.
 *
 * Native RTL is disabled app-wide (`I18nManager.allowRTL(false)`), so Tailwind's
 * `flex-row` never reverses by itself. Use this for `Pressable`/`View` rows that
 * cannot use the `Row` primitive.
 */
export function useRowDirection(): Pick<ViewStyle, 'flexDirection'> {
  const { isRTL } = useDirection();
  return useMemo(
    () => ({ flexDirection: isRTL ? 'row-reverse' : 'row' }),
    [isRTL],
  );
}
