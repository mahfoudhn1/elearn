import { AppText, Card, Stack } from '../ui';
import { useTranslation } from '../../hooks/useTranslation';

export interface UnmetDemandItem {
  subject: string;
  minutes: number;
  suggestion?: string;
}

/** Banner listing demand the engine could not place ("you need X more min"). */
export function UnmetBanner({ items }: { items: UnmetDemandItem[] }) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <Card variant="list" className="border border-line">
      <Stack gap={8}>
        <AppText variant="micro" weight="medium" tone="brand" className="uppercase tracking-widest">
          {t('plannerUnmetTitle')}
        </AppText>
        {items.slice(0, 4).map((item) => (
          <Stack key={`${item.subject}-${item.minutes}`} gap={2}>
            <AppText variant="bodySm" weight="medium">
              {t('plannerUnmetLine', { minutes: item.minutes, subject: item.subject })}
            </AppText>
            <AppText variant="caption" tone="muted">
              {item.suggestion ?? t('plannerUnmetSuggestion')}
            </AppText>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
