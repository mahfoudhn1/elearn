import { useCallback } from 'react';
import { translate as translateRaw, type TranslateOptions } from '../services/i18n';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Reactive translation hook. Subscribing to `locale` makes any component that
 * uses `t()` re-render the moment the user changes the app language.
 */
export function useTranslation() {
  const locale = useSettingsStore((state) => state.locale);

  const t = useCallback(
    (key: string, config?: TranslateOptions) => translateRaw(key, config),
    [locale],
  );

  return { t, locale };
}
