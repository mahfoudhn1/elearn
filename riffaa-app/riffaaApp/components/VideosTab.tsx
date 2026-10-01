import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';

import { AppText, Button, Card, EmptyState, Row, Screen, Stack } from './ui';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

function readString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

/** Recorded group lessons (Cloudflare R2 signed URLs when the backend provides them). */
export default function VideosTab({ videos }: { videos: Record<string, unknown>[] }) {
  const { tokens } = useTheme();
  const { t } = useTranslation();

  if (videos.length === 0) {
    return (
      <Screen>
        <EmptyState icon="videocam-outline" title={t('noVideos')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <AppText
        variant="micro"
        weight="medium"
        tone="subtle"
        className="mb-3 uppercase tracking-widest"
      >
        {t('recordedLessonsHint')}
      </AppText>
      <Stack gap={12}>
        {videos.map((video, index) => {
          const url = readString(video.video_url) || readString(video.url);
          const duration = readString(video.duration);
          return (
            <Card key={readString(video.id) || String(index)} variant="list">
              <Row gap={12} align="center">
                <Row
                  justify="center"
                  align="center"
                  className="h-11 w-11 rounded-pill bg-info/15"
                >
                  <Ionicons name="play" size={18} color={tokens.info} />
                </Row>
                <Stack gap={2} className="flex-1">
                  <AppText variant="body" weight="medium" numberOfLines={1}>
                    {readString(video.title)}
                  </AppText>
                  <AppText variant="micro" tone="subtle" numberOfLines={1}>
                    {duration ? `${duration} • ` : ''}
                    {readString(video.created_at)}
                  </AppText>
                </Stack>
                <Button
                  label={t('play')}
                  size="sm"
                  variant="secondary"
                  icon="play"
                  disabled={!url}
                  onPress={() => {
                    if (url) void Linking.openURL(url);
                  }}
                />
              </Row>
            </Card>
          );
        })}
      </Stack>
    </Screen>
  );
}
