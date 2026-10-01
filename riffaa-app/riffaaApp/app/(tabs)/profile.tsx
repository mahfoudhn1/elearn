import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  GhostNumber,
  IconButton,
  Row,
  Screen,
  ScreenHeader,
  Stack,
} from '../../components/ui';
import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../hooks/useTheme';
import { useUnreadNotificationsCount } from '../../hooks/useUnreadCounts';
import { signOut } from '../../services/auth';
import { translate } from '../../services/i18n';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore, type AppLocale } from '../../store/settingsStore';

const LANGUAGES: { code: AppLocale; label: string; native: string }[] = [
  { code: 'ar', label: 'AR', native: 'العربية' },
  { code: 'en', label: 'EN', native: 'English' },
  { code: 'fr', label: 'FR', native: 'Français' },
];

const COMPLETED_COURSES = [
  { id: 'cert-1', label: 'الفيزياء: مراجعة الميكانيك الشاملة' },
  { id: 'cert-2', label: 'العلوم: تركيب البروتين من الصفر' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { isRTL } = useDirection();
  const unreadNotifications = useUnreadNotificationsCount();

  const user = useAuthStore((state) => state.user);
  const locale = useSettingsStore((state) => state.locale);
  const setLocale = useSettingsStore((state) => state.setLocale);
  const toggleTheme = useSettingsStore((state) => state.toggleTheme);
  const theme = useSettingsStore((state) => state.theme);
  const isDark = theme === 'dark';

  if (!user) {
    return null;
  }

  const initial = (user.name?.trim()?.charAt(0) || '?').toUpperCase();

  return (
    <View className="flex-1">
      <ScreenHeader
        showBack={false}
        title={translate('profile')}
        right={
          <View>
            <IconButton
              icon="notifications-outline"
              accessibilityLabel={translate('notifications')}
              variant="surface"
              onPress={() => router.push('/notifications')}
            />
            {unreadNotifications > 0 ? (
              <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-brand" />
            ) : null}
          </View>
        }
      />

      <Screen scroll padded={false}>
        <View className="px-5 pt-2">
          {/* Identity hero */}
          <Card variant="hero" className="mb-4 overflow-hidden">
            <GhostNumber
              value={initial}
              size={128}
              style={{
                position: 'absolute',
                top: -26,
                ...(isRTL ? { left: -6 } : { right: -6 }),
              }}
            />
            <Row gap={14} align="center">
              <Avatar name={user.name} url={user.avatarUrl} size={56} />
              <Stack gap={3} className="flex-1">
                <AppText variant="title" numberOfLines={1}>
                  {user.name}
                </AppText>
                <AppText variant="bodySm" tone="muted" numberOfLines={1}>
                  {user.email}
                </AppText>
                <View className="mt-1 self-start">
                  <Badge
                    label={user.role === 'student' ? translate('studentAccount') : user.role}
                    tone="brand"
                  />
                </View>
              </Stack>
            </Row>
          </Card>

          {/* Settings */}
          <Card variant="list" className="mb-4">
            <Row justify="space-between" align="center" className="mb-4">
              <AppText
                variant="micro"
                weight="medium"
                tone="subtle"
                className="uppercase tracking-widest"
              >
                {translate('settings')}
              </AppText>
              <Ionicons name="options-outline" size={16} color={tokens.brand} />
            </Row>

            {/* Theme toggle */}
            <Pressable
              onPress={toggleTheme}
              accessibilityRole="switch"
              accessibilityState={{ checked: isDark }}
              accessibilityLabel={isDark ? translate('darkMode') : translate('lightMode')}
              className="mb-5 rounded-card border border-hairline bg-surface-2 p-4"
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Row justify="space-between" align="center">
                <Row gap={12} align="center">
                  <View className="h-10 w-10 items-center justify-center rounded-card bg-brand/15">
                    <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={tokens.brand} />
                  </View>
                  <Stack gap={2}>
                    <AppText variant="bodySm" weight="medium">
                      {isDark ? translate('darkMode') : translate('lightMode')}
                    </AppText>
                    <AppText variant="micro" tone="subtle">
                      {translate('darkModeHint')}
                    </AppText>
                  </Stack>
                </Row>
                <View
                  className={`h-7 w-12 justify-center rounded-pill p-1 ${
                    isDark ? 'bg-brand' : 'bg-line'
                  }`}
                >
                  <View
                    className={`h-5 w-5 rounded-pill bg-on-brand ${
                      isDark ? 'self-start' : 'self-end'
                    }`}
                  />
                </View>
              </Row>
            </Pressable>

            {/* Language */}
            <Row justify="space-between" align="center" className="mb-2.5">
              <AppText variant="bodySm" weight="medium">
                {translate('language')}
              </AppText>
              <AppText variant="micro" tone="subtle">
                {translate('languageHint')}
              </AppText>
            </Row>
            <Row gap={8}>
              {LANGUAGES.map((item) => {
                const selected = locale === item.code;
                return (
                  <Pressable
                    key={item.code}
                    onPress={() => setLocale(item.code)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={item.native}
                    className={`flex-1 items-center rounded-card border py-3 ${
                      selected ? 'border-brand/40 bg-brand/15' : 'border-hairline bg-surface-2'
                    }`}
                    style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                  >
                    <AppText
                      variant="bodySm"
                      weight="medium"
                      className={selected ? 'text-brand' : 'text-ink-muted'}
                    >
                      {item.label}
                    </AppText>
                    <AppText
                      variant="micro"
                      className={selected ? 'text-brand' : 'text-ink-subtle'}
                    >
                      {item.native}
                    </AppText>
                  </Pressable>
                );
              })}
            </Row>
          </Card>

          {/* Completed courses */}
          <Card variant="list" className="mb-6">
            <AppText
              variant="micro"
              weight="medium"
              tone="subtle"
              className="mb-4 uppercase tracking-widest"
            >
              {translate('completedCourses')}
            </AppText>
            <Stack gap={14}>
              {COMPLETED_COURSES.map((course) => (
                <Row key={course.id} gap={12} align="center">
                  <View className="h-10 w-10 items-center justify-center rounded-card bg-brand/15">
                    <Ionicons name="ribbon-outline" size={18} color={tokens.brand} />
                  </View>
                  <Stack gap={2} className="flex-1">
                    <AppText variant="bodySm" weight="medium" numberOfLines={2}>
                      {course.label}
                    </AppText>
                    <AppText variant="micro" tone="brand">
                      {translate('certificates')}
                    </AppText>
                  </Stack>
                </Row>
              ))}
            </Stack>
          </Card>

          {/* Logout */}
          <Button
            label={translate('logout')}
            variant="danger"
            icon="log-out-outline"
            fullWidth
            onPress={() => {
              void signOut().then(() => router.replace('/login'));
            }}
          />
        </View>
      </Screen>
    </View>
  );
}
