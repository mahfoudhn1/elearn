import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { subjectTint } from '../../constants/subjects';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { NormalizedGroup } from '../../utils/realData';
import { AppText, Badge, Row } from '../ui';
import { Glass } from '../ui/Glass';

interface GroupCardProps {
  group: NormalizedGroup;
  onPress: () => void;
}

/**
 * Wide group card (glass) for the home carousel: subject icon on the start
 * side, live badge and member count on the end side, group and instructor as
 * the focal content. A live group also gets a green glow ring.
 */
export function GroupCard({ group, onPress }: GroupCardProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  const tint = subjectTint(group.language ?? group.grade ?? group.school_level ?? group.name);
  const studentCount = group.students_count ?? 0;

  return (
    <Glass onPress={onPress} tint={tint.color} padded={false} className="w-72 flex-shrink-0">
      <View className="p-4">
        <Row justify="space-between" align="center" className="mb-3">
          <Row
            justify="center"
            align="center"
            className="h-10 w-10 rounded-xl"
            style={{ backgroundColor: `${tint.color}35` }}
          >
            <Ionicons name={tint.icon} size={18} color={tint.color} />
          </Row>

          <Row gap={6} align="center">
            {group.active_live ? <Badge label={t('liveNow')} tone="success" /> : null}
            <Row
              gap={4}
              align="center"
              className="rounded-full bg-white/10 px-2 py-0.5"
              accessibilityLabel={`${studentCount}`}
            >
              <Ionicons name="people-outline" size={12} color={tokens.inkMuted} />
              <AppText variant="micro" weight="medium" tone="muted">
                {studentCount}
              </AppText>
            </Row>
          </Row>
        </Row>

        <AppText variant="heading" numberOfLines={1} className="mb-1">
          {group.name}
        </AppText>

        <AppText variant="bodySm" tone="ink" numberOfLines={1}>
          {group.teacher_name}
        </AppText>
      </View>
    </Glass>
  );
}