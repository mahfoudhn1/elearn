import { AppText, Card, EmptyState, Row, Screen, Stack } from './ui';
import { useTranslation } from '../hooks/useTranslation';

function readString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

/** Group announcements: text-heavy, so they sit on calm `list` cards. */
export default function AnnouncementsTab({
  announcements,
}: {
  announcements: Record<string, unknown>[];
}) {
  const { t } = useTranslation();

  if (announcements.length === 0) {
    return (
      <Screen>
        <EmptyState icon="megaphone-outline" title={t('noAnnouncements')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Stack gap={12}>
        {announcements.map((announcement, index) => (
          <Card key={readString(announcement.id) || String(index)} variant="list">
            <Row justify="space-between" align="center" className="mb-2">
              <AppText
                variant="micro"
                weight="medium"
                tone="brand"
                className="uppercase tracking-widest"
              >
                {t('announcement')}
              </AppText>
              <AppText variant="caption" tone="subtle">
                {readString(announcement.created_at)}
              </AppText>
            </Row>
            <AppText variant="body">{readString(announcement.content)}</AppText>
          </Card>
        ))}
      </Stack>
    </Screen>
  );
}
