import { Ionicons } from '@expo/vector-icons';
import type { NormalizedGroup } from '../../utils/realData';
import { subjectTint } from '../../constants/subjects';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { AppText, Badge, Card, Row } from '../ui';

interface GroupCardProps {
  group: NormalizedGroup;
  onPress: () => void;
}

/**
 * Wide group card for the home carousel: subject icon on the start side, live
 * and member count on the end side, with the group and instructor as the
 * high-contrast focal content.
 */
export function GroupCard({ group, onPress }: GroupCardProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  const tint = subjectTint(group.language ?? group.grade ?? group.school_level ?? group.name);
  const studentCount = group.students_count ?? 0;

  return (
    <Card
      variant="raised"
      subject={group.name}
      onPress={onPress}
      className="w-72 flex-shrink-0 overflow-hidden"
      style={{ borderTopWidth: 3, borderTopColor: tint.color }}
    >
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
            className="rounded-full bg-surface-2 px-2 py-0.5"
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
    </Card>
  );
}
