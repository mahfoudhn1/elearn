import { View } from 'react-native';

import { AppText, Row, Stack } from '../ui';
import { useTranslation } from '../../hooks/useTranslation';
import type { PlannerReason } from '../../services/api/planner';
import { reasonDetail, reasonKey } from '../../utils/plannerReasons';

/** Renders structured engine reasons as translated code + optional detail. */
export function ReasonList({ reasons }: { reasons: PlannerReason[] }) {
  const { t } = useTranslation();
  const visible = reasons.filter((reason) => reasonKey(reason.code));

  if (visible.length === 0) return null;

  return (
    <Stack gap={8}>
      {visible.map((reason, index) => {
        const key = reasonKey(reason.code);
        const detail = reasonDetail(reason);
        return (
          <Row key={`${reason.code}-${index}`} gap={10} align="center" justify="space-between">
            <Row gap={8} align="center" className="flex-1">
              <View className="h-1.5 w-1.5 rounded-full bg-brand" />
              <AppText variant="bodySm" numberOfLines={2}>
                {key ? t(key) : reason.code}
              </AppText>
            </Row>
            {detail ? (
              <AppText variant="caption" tone="muted">
                {detail}
              </AppText>
            ) : null}
          </Row>
        );
      })}
    </Stack>
  );
}
