import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppText, Card, Row, Stack } from '../ui';
import { subjectTint } from '../../constants/subjects';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';

export interface UnmetDemandItem {
  subject: string;
  minutes: number;
  suggestion?: string;
}

/**
 * AI Study Coach tip recommending study adjustments when targets are unmet.
 */
export function UnmetBanner({ items }: { items: UnmetDemandItem[] }) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  if (items.length === 0) return null;

  return (
    <Card variant="hero" tone="brand" className="overflow-hidden p-4">
      <Stack gap={10}>
        <Row gap={8} align="center">
          <View className="h-7 w-7 items-center justify-center rounded-full bg-brand/20">
            <Ionicons name="bulb-outline" size={16} color={tokens.brand} />
          </View>
          <AppText variant="micro" weight="medium" tone="brand" className="uppercase tracking-widest">
            {t('plannerCoachTip')}
          </AppText>
        </Row>
        {items.slice(0, 3).map((item) => {
          const tint = subjectTint(item.subject);
          return (
            <Row key={`${item.subject}-${item.minutes}`} gap={10} align="flex-start" className="mt-1">
              <View
                className="mt-0.5 h-6 w-6 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${tint.color}25` }}
              >
                <Ionicons name={tint.icon} size={14} color={tint.color} />
              </View>
              <Stack gap={2} className="flex-1">
                <AppText variant="bodySm" weight="medium">
                  {t('plannerUnmetLine', { minutes: item.minutes, subject: item.subject })}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {item.suggestion ?? t('plannerUnmetSuggestion')}
                </AppText>
              </Stack>
            </Row>
          );
        })}
      </Stack>
    </Card>
  );
}

