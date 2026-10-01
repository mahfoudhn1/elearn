import { useState } from 'react';
import { Switch, View } from 'react-native';
import {
  AppBackground,
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  ErrorState,
  GlassSurface,
  IconButton,
  ListItem,
  ProgressBar,
  ProgressRing,
  Row,
  Screen,
  ScreenHeader,
  SectionHeader,
  SegmentedControl,
  Sheet,
  Skeleton,
  Stack,
  TextField,
} from '../components/ui';
import { subjectTint } from '../constants/subjects';
import { DirectionProvider, useDirection } from '../hooks/useDirection';
import { themeVarsFor, useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useSettingsStore, type AppLocale } from '../store/settingsStore';

/**
 * Temporary dev-only playground for the design system. Deleted in Phase 10.
 */
export default function DevKitRoute() {
  if (!__DEV__) {
    return <NotAvailable />;
  }
  return <DevKit />;
}

function NotAvailable() {
  const { t } = useTranslation();
  return (
    <View className="flex-1">
      <AppBackground />
      <Screen>
        <EmptyState title={t('notAvailable')} />
      </Screen>
    </View>
  );
}

const SUBJECT_SAMPLES = ['Mathematics', 'Physics', 'English', 'History', 'Computer science', ''];

function DevKit() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const theme = useSettingsStore((state) => state.theme);
  const locale = useSettingsStore((state) => state.locale);
  const reduceGlass = useSettingsStore((state) => state.reduceGlass);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setLocale = useSettingsStore((state) => state.setLocale);
  const setReduceGlass = useSettingsStore((state) => state.setReduceGlass);
  const { isRTL } = useDirection();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [chip, setChip] = useState('ar');
  const [showError, setShowError] = useState(false);

  return (
    <View className="flex-1">
      <AppBackground />
      <Screen scroll>
        <ScreenHeader title={t('designKit')} showBack />

        <Stack gap={24} className="pb-8">
          <Stack gap={12}>
            <SectionHeader title="Theme & direction" />
            <Row gap={8}>
              <Button
                label="Dark"
                size="sm"
                variant={theme === 'dark' ? 'primary' : 'secondary'}
                onPress={() => setTheme('dark')}
              />
              <Button
                label="Light"
                size="sm"
                variant={theme === 'light' ? 'primary' : 'secondary'}
                onPress={() => setTheme('light')}
              />
            </Row>
            <SegmentedControl<AppLocale>
              options={[
                { label: 'AR', value: 'ar' },
                { label: 'EN', value: 'en' },
                { label: 'FR', value: 'fr' },
              ]}
              value={locale}
              onChange={setLocale}
            />
            <Row gap={12} justify="space-between">
              <Stack gap={2} className="flex-1">
                <AppText variant="body">{t('reduceGlass')}</AppText>
                <AppText variant="caption" tone="muted">
                  {t('reduceGlassHint')}
                </AppText>
              </Stack>
              <Switch value={reduceGlass} onValueChange={setReduceGlass} />
            </Row>
            <AppText variant="caption" tone="muted">
              Direction: {isRTL ? 'RTL' : 'LTR'} · theme: {theme} · glass:{' '}
              {reduceGlass ? 'reduced' : 'on'}
            </AppText>
          </Stack>

          <Stack gap={12}>
            <SectionHeader title="Glass levels" />
            <GlassSurface level="glass-1" className="p-4">
              <AppText variant="title">glass-1 regular</AppText>
              <AppText variant="bodySm" tone="muted">
                Most cards and sections. Body text stays readable.
              </AppText>
            </GlassSurface>
            <GlassSurface level="glass-2" className="p-5">
              <AppText variant="title">glass-2 raised</AppText>
              <AppText variant="bodySm" tone="muted">
                Hero card, sticky header, sheets, tab bar. Inner top highlight.
              </AppText>
            </GlassSurface>
            <GlassSurface level="glass-3" className="p-4">
              <AppText variant="title">glass-3 dense</AppText>
              <AppText variant="bodySm" tone="muted">
                Chat, forms and anything read for more than a few seconds.
              </AppText>
            </GlassSurface>
            <GlassSurface level="glass-1" blur={false} className="p-4">
              <AppText variant="title">Faux glass (no blur)</AppText>
              <AppText variant="bodySm" tone="muted">
                What list rows use — nearly identical over the backdrop, but free.
              </AppText>
            </GlassSurface>
          </Stack>

          <Stack gap={12}>
            <SectionHeader title="Tones" />
            <Row gap={8} wrap>
              <GlassSurface level="glass-2" tone="brand" className="flex-1 p-4">
                <AppText weight="semibold">brand</AppText>
              </GlassSurface>
              <GlassSurface level="glass-2" tone="success" className="flex-1 p-4">
                <AppText weight="semibold">success</AppText>
              </GlassSurface>
              <GlassSurface level="glass-2" tone="info" className="flex-1 p-4">
                <AppText weight="semibold">info</AppText>
              </GlassSurface>
              <GlassSurface level="glass-2" tone="danger" className="flex-1 p-4">
                <AppText weight="semibold">danger</AppText>
              </GlassSurface>
            </Row>
          </Stack>

          <Stack gap={12}>
            <SectionHeader title="Subject tints" />
            <Row gap={8} wrap>
              {SUBJECT_SAMPLES.map((subject, index) => {
                const tint = subjectTint(subject);
                return (
                  <Row
                    key={index}
                    gap={6}
                    className="rounded-full border px-3 py-1.5"
                    style={{ borderColor: `${tint.color}59` }}
                  >
                    <View
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: tint.color }}
                    />
                    <AppText variant="caption">
                      {subject || 'other'} · {tint.kind}
                    </AppText>
                  </Row>
                );
              })}
            </Row>
          </Stack>

          <Stack gap={12}>
            <SectionHeader title="Type scale" />
            <Card variant="raised">
              <Stack gap={8}>
                <AppText variant="display">Display 28</AppText>
                <AppText variant="heading">Heading 22</AppText>
                <AppText variant="title">Title 18</AppText>
                <AppText variant="body">Body 16 — sample</AppText>
                <AppText variant="bodySm" tone="muted">
                  Body small 14
                </AppText>
                <AppText variant="caption" tone="subtle">
                  Caption 12
                </AppText>
                <AppText variant="timer" tone="brand">
                  25:00
                </AppText>
              </Stack>
            </Card>
          </Stack>

          <Stack gap={12}>
            <SectionHeader title="Buttons" />
            <Row gap={8} wrap>
              <Button label="Primary" onPress={() => {}} />
              <Button label="Secondary" variant="secondary" onPress={() => {}} />
              <Button label="Ghost" variant="ghost" onPress={() => {}} />
              <Button label="Danger" variant="danger" onPress={() => {}} />
            </Row>
            <Row gap={8} wrap>
              <Button label="Small" size="sm" onPress={() => {}} />
              <Button label="Loading" loading onPress={() => {}} />
              <Button label="Disabled" disabled onPress={() => {}} />
              <Button label="With icon" icon="play" onPress={() => {}} />
            </Row>
            <Row gap={8}>
              <IconButton icon="notifications-outline" accessibilityLabel="Notify" variant="surface" onPress={() => {}} />
              <IconButton icon="heart" accessibilityLabel="Like" variant="brand" onPress={() => {}} />
              <IconButton icon="ellipsis-horizontal" accessibilityLabel="More" onPress={() => {}} />
            </Row>
          </Stack>

          <Stack gap={12}>
            <SectionHeader title="Chips & badges" />
            <Row gap={8} wrap>
              <Chip label="Selected" selected onPress={() => setChip('ar')} />
              <Chip label="Idle" onPress={() => setChip('x')} />
              <Chip label={`Value: ${chip}`} onPress={() => {}} />
            </Row>
            <Row gap={8} wrap>
              <Badge label="Neutral" />
              <Badge label="Brand" tone="brand" />
              <Badge label="Live" tone="success" />
              <Badge label="Error" tone="danger" />
              <Badge label="Info" tone="info" />
            </Row>
          </Stack>

          <Stack gap={12}>
            <SectionHeader title="Cards" />
            <Card>
              <AppText>Default card (faux glass)</AppText>
            </Card>
            <Card variant="dense">
              <AppText>Dense card</AppText>
            </Card>
            <Card variant="raised">
              <AppText>Raised card</AppText>
            </Card>
            <Card variant="hero">
              <AppText variant="title">Hero card</AppText>
              <AppText tone="muted" variant="bodySm">
                The only tinted, raised element on a screen.
              </AppText>
            </Card>
            <Card subject="Mathematics" onPress={() => {}}>
              <AppText>Card with a subject-tinted border</AppText>
            </Card>
          </Stack>

          <Stack gap={12}>
            <SectionHeader title="Avatars & progress" />
            <Row gap={12}>
              <Avatar name="Ahmed Benali" size={48} />
              <Avatar url="https://i.pravatar.cc/100" size={48} />
              <Avatar name="S" size={32} />
            </Row>
            <ProgressBar value={64} />
            <Row gap={24}>
              <ProgressRing value={72} size={110}>
                <AppText variant="heading">72%</AppText>
              </ProgressRing>
              <ProgressRing value={30} size={80} strokeWidth={8} color={tokens.success}>
                <AppText variant="title">30%</AppText>
              </ProgressRing>
            </Row>
          </Stack>

          <Stack gap={12}>
            <SectionHeader title="List group" action={{ label: 'See all', onPress: () => {} }} />
            <Card className="p-0">
              <Stack gap={0} className="px-4">
                <ListItem icon="book-outline" title="Mathematics" subtitle="Next session today" showChevron onPress={() => {}} />
                <Divider />
                <ListItem
                  avatar={{ name: 'Yacine' }}
                  title="Yacine M."
                  subtitle="Physics teacher"
                  trailing={<Badge label="Live" tone="success" />}
                  onPress={() => {}}
                />
              </Stack>
            </Card>
          </Stack>

          <Stack gap={12}>
            <SectionHeader title="Inputs" />
            <TextField label="Email" placeholder="name@example.com" icon="mail-outline" />
            <TextField label="Password" placeholder="••••••••" secureTextEntry secureToggle />
            <TextField label="With error" placeholder="0123456789" error="Enter a valid phone number" />
          </Stack>

          <Stack gap={12}>
            <SectionHeader title="States" />
            <Skeleton height={16} />
            <Skeleton width="60%" height={16} />
            <Card className="items-center">
              <EmptyState
                icon="calendar-outline"
                title="Nothing scheduled"
                message="Plan your day to see it here."
                actionLabel="Add task"
                onAction={() => {}}
              />
            </Card>
            {showError ? (
              <Card>
                <ErrorState error={new Error('boom')} onRetry={() => setShowError(false)} />
              </Card>
            ) : (
              <Button label="Show error state" variant="secondary" onPress={() => setShowError(true)} />
            )}
          </Stack>

          <Stack gap={12}>
            <SectionHeader title="Sheet" />
            <Button label="Open sheet" onPress={() => setSheetOpen(true)} />
            <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters">
              <Stack gap={12} className="pb-4">
                <TextField label="Wilaya" placeholder="Algiers" icon="location-outline" />
                <Row gap={8}>
                  <Button label="Apply" fullWidth className="flex-1" onPress={() => setSheetOpen(false)} />
                  <Button label="Reset" variant="secondary" onPress={() => {}} />
                </Row>
              </Stack>
            </Sheet>
          </Stack>

          <Stack gap={12}>
            <SectionHeader title="Forced opposite theme & direction" />
            <View style={themeVarsFor(theme === 'dark' ? 'light' : 'dark')} className="rounded-2xl border border-line p-4">
              <DirectionProvider value={{ isRTL: !isRTL, dir: isRTL ? 'ltr' : 'rtl' }}>
                <Row gap={12} justify="space-between">
                  <AppText variant="title">
                    {isRTL ? 'Forced LTR' : 'Forced RTL'}
                  </AppText>
                  <Badge label={isRTL ? 'LTR' : 'RTL'} tone="brand" />
                </Row>
                <AppText variant="bodySm" tone="muted" className="mt-2">
                  Panel previews the opposite theme tokens and mirrored layout.
                </AppText>
              </DirectionProvider>
            </View>
          </Stack>
        </Stack>
      </Screen>
    </View>
  );
}
