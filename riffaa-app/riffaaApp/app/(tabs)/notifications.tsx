import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { FlatList, Platform, RefreshControl, View } from 'react-native';

import {
  AppText,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  ListItem,
  Row,
  ScreenHeader,
  Skeleton,
  Stack,
} from '../../components/ui';
import type { IoniconName } from '../../components/ui';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { useNotifications } from '../../hooks/queries';
import { formatDate, formatTime } from '../../utils/format';
import { getArrayFromPayload } from '../../utils/realData';

interface NotificationEntry {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string | null;
  isRead: boolean;
}

interface NotificationSection {
  key: 'today' | 'earlier';
  title: string;
  data: NotificationEntry[];
}

type Tone = 'brand' | 'success' | 'info';

function classify(title: string): { icon: IoniconName; tone: Tone } {
  const value = title.toLowerCase();
  if (value.includes('بث') || value.includes('مباشر') || value.includes('حصة') || value.includes('live')) {
    return { icon: 'videocam-outline', tone: 'success' };
  }
  if (value.includes('ملف') || value.includes('مادة') || value.includes('pdf') || value.includes('document')) {
    return { icon: 'document-text-outline', tone: 'info' };
  }
  return { icon: 'notifications-outline', tone: 'brand' };
}

const TONE_CLASS: Record<Tone, string> = {
  brand: 'bg-brand/15',
  success: 'bg-success/15',
  info: 'bg-info/15',
};

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const SectionCard = memo(function SectionCard({
  section,
  onPressItem,
}: {
  section: NotificationSection;
  onPressItem: (entry: NotificationEntry) => void;
}) {
  const { tokens } = useTheme();

  return (
    <View className="mb-5">
      <AppText
        variant="micro"
        weight="medium"
        tone="subtle"
        className="mb-3 uppercase tracking-widest"
      >
        {section.title}
      </AppText>
      <Card variant="list" className="p-0">
        <Stack gap={0} className="px-4">
          {section.data.map((entry, index) => {
            const { icon, tone } = classify(entry.title);
            const unread = !entry.isRead;
            return (
              <View key={entry.id}>
                {index > 0 ? <Divider /> : null}
                <ListItem
                  title={entry.title}
                  subtitle={entry.subtitle || undefined}
                  onPress={() => onPressItem(entry)}
                  leading={
                    <Row
                      justify="center"
                      align="center"
                      className={`h-10 w-10 rounded-pill ${TONE_CLASS[tone]}`}
                    >
                      <Ionicons
                        name={icon}
                        size={20}
                        color={
                          tone === 'success'
                            ? tokens.success
                            : tone === 'info'
                              ? tokens.info
                              : tokens.brand
                        }
                      />
                    </Row>
                  }
                  trailing={
                    <Stack gap={4} align="flex-end">
                      {entry.createdAt ? (
                        <AppText variant="micro" tone="subtle">
                          {formatDate(entry.createdAt, { day: 'numeric', month: 'short' })}
                          {' · '}
                          {formatTime(entry.createdAt)}
                        </AppText>
                      ) : null}
                      {unread ? <View className="h-2 w-2 rounded-full bg-brand" /> : null}
                    </Stack>
                  }
                />
              </View>
            );
          })}
        </Stack>
      </Card>
    </View>
  );
});

export default function NotificationsScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const bottomInset = useBottomInset();

  const { data, isLoading, isError, error, refetch, isRefetching } = useNotifications();

  const sections = useMemo<NotificationSection[]>(() => {
    const entries: NotificationEntry[] = getArrayFromPayload(data).map((item, index) => ({
      id: String(item.id ?? `${index}`),
      title: String(item.title ?? item.message ?? item.subject ?? ''),
      subtitle: String(item.body ?? item.content ?? item.message ?? ''),
      createdAt:
        (item.created_at as string) ?? (item.createdAt as string) ?? (item.time as string) ?? null,
      isRead: item.is_read !== false,
    }));

    const now = new Date();
    const today: NotificationEntry[] = [];
    const earlier: NotificationEntry[] = [];
    entries.forEach((entry) => {
      const date = entry.createdAt ? new Date(entry.createdAt) : null;
      if (date && !Number.isNaN(date.getTime()) && sameDay(date, now)) today.push(entry);
      else earlier.push(entry);
    });

    const next: NotificationSection[] = [];
    if (today.length) next.push({ key: 'today', title: t('todayLabel'), data: today });
    if (earlier.length) next.push({ key: 'earlier', title: t('earlierLabel'), data: earlier });
    return next;
  }, [data, t]);

  const openEntry = useCallback(() => {
    // Notifications have no detail route yet; the tap is a placeholder for
    // deep-linking to the related group/course once the backend exposes a link.
  }, []);

  return (
    <View className="flex-1">
      <ScreenHeader title={t('notifications')} />

      {isLoading ? (
        <Stack gap={12} className="px-4 pt-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={72} radius={28} />
          ))}
        </Stack>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(section) => section.key}
          renderItem={({ item }) => <SectionCard section={item} onPressItem={openEntry} />}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: bottomInset,
          }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={tokens.brand}
              colors={[tokens.brand]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              title={t('notificationsEmpty')}
              actionLabel={t('home')}
              onAction={() => router.push('/home')}
            />
          }
        />
      )}
    </View>
  );
}
