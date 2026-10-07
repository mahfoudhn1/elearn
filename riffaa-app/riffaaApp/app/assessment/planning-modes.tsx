import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  AppText,
  Badge,
  Card,
  ErrorState,
  Row,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Skeleton,
  Stack,
  type SegmentedOption,
} from '../../components/ui';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import {
  getSubjectPlanning,
  updateSubjectPlanning,
  type SubjectPlanningMode,
  type SubjectPlanningState,
} from '../../services/api/planner';
import { TIER_KEY } from '../../utils/assessmentReasons';

/**
 * Per-subject planning mode selector. The tier (CORE/STANDARD/LIGHT) is shown
 * subtly because it caps how much planner time the subject can receive; a weak
 * but low-importance subject explains why its time is limited.
 */
export default function PlanningModesScreen() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [state, setState] = useState<SubjectPlanningState | null>(null);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const modeOptions = useMemo<SegmentedOption<SubjectPlanningMode>[]>(
    () => [
      { value: 'AUTO', label: t('assessmentModeAuto') },
      { value: 'MORE', label: t('assessmentModeMore') },
      { value: 'TRACKING_ONLY', label: t('assessmentModeTrackingOnly') },
    ],
    [t],
  );

  const load = useCallback(async () => {
    setError(false);
    try {
      setState(await getSubjectPlanning());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setMode = async (subject: string, mode: SubjectPlanningMode) => {
    setSaving(subject);
    try {
      const next = await updateSubjectPlanning([{ subject, mode }]);
      setState(next);
    } catch {
      Alert.alert(t('assessmentError'));
    } finally {
      setSaving(null);
    }
  };

  return (
    <View className="flex-1">
      <ScreenHeader
        title={t('assessmentPlanningMode')}
        subtitle={t('assessmentPlanningModeHint')}
        onBack={() => router.back()}
      />
      <Screen scroll>
        {error ? (
          <ErrorState
            error={new Error(t('assessmentError'))}
            onRetry={() => {
              void load();
            }}
            retryLabel={t('assessmentRetry')}
          />
        ) : !state ? (
          <Stack gap={10}>
            <Skeleton height={120} radius={24} />
            <Skeleton height={120} radius={24} />
          </Stack>
        ) : (
          <Stack gap={12}>
            {state.subjects.map((row) => {
              const lowImportanceWeak =
                row.tier === 'LIGHT' && row.mode !== 'TRACKING_ONLY';
              return (
                <Card key={row.subject} variant="list" subject={row.subject}>
                  <Stack gap={10}>
                    <Stack gap={6}>
                      <Stack gap={4}>
                        <AppText variant="bodySm" weight="semibold" numberOfLines={1}>
                          {row.subject}
                        </AppText>
                        <Row gap={8} align="center">
                          <Badge label={t(TIER_KEY[row.tier])} tone="neutral" />
                          {!row.coefficient_known ? (
                            <AppText variant="micro" tone="subtle" className="flex-1">
                              {t('assessmentImportanceUnknownHint')}
                            </AppText>
                          ) : null}
                        </Row>
                      </Stack>
                      {lowImportanceWeak ? (
                        <Row gap={6} align="center">
                          <Ionicons name="information-circle-outline" size={14} color={tokens.inkSubtle} />
                          <AppText variant="micro" tone="subtle" className="flex-1">
                            {t('assessmentWeakLowImportance')}
                          </AppText>
                        </Row>
                      ) : null}
                    </Stack>
                    <SegmentedControl
                      options={modeOptions}
                      value={row.mode}
                      onChange={(mode) => {
                        if (mode !== row.mode && saving !== row.subject) {
                          void setMode(row.subject, mode);
                        }
                      }}
                    />
                    <AppText variant="micro" tone="subtle">
                      {t(
                        row.mode === 'MORE'
                          ? 'assessmentModeMoreDesc'
                          : row.mode === 'TRACKING_ONLY'
                            ? 'assessmentModeTrackingOnlyDesc'
                            : 'assessmentModeAutoDesc',
                      )}
                    </AppText>
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        )}
      </Screen>
    </View>
  );
}
