import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { AppText, Row } from '../ui';

export interface OfflineNoticeProps {
  visible: boolean;
  className?: string;
}

/** Small "showing saved data" hint for screens backed by the offline cache. */
export function OfflineNotice({ visible, className }: OfflineNoticeProps) {
  const { tokens } = useTheme();
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  return (
    <Row
      gap={6}
      align="center"
      className={`self-start rounded-full bg-surface-2 px-3 py-1${className ? ` ${className}` : ''}`}
    >
      <Ionicons name="cloud-offline-outline" size={14} color={tokens.inkMuted} />
      <AppText variant="micro" tone="muted">
        {t('showingCached')}
      </AppText>
    </Row>
  );
}
