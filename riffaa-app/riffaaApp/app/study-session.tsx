import { useState } from 'react';
import { Switch, View } from 'react-native';

import { PomodoroClock } from '../components/PomodoroClock';
import { Card, ListItem, Screen, ScreenHeader, Stack } from '../components/ui';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Focus session screen. The server-driven `PomodoroClock` owns the timer; this
 * screen only frames it and exposes the Do-Not-Disturb preference.
 */
export default function StudySessionScreen() {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const [dndEnabled, setDndEnabled] = useState(false);

  return (
    <Screen scroll padded={false}>
      <ScreenHeader title={t('focusSession')} showBack />
      <View className="px-5 pb-4">
        <Stack gap={16}>
          <PomodoroClock collapsible={false} />
          <Card variant="list" className="p-0">
            <Stack className="px-4">
              <ListItem
                icon="moon-outline"
                title={t('dndTitle')}
                subtitle={t('dndBody')}
                trailing={
                  <Switch
                    value={dndEnabled}
                    onValueChange={setDndEnabled}
                    trackColor={{ true: tokens.brand, false: tokens.line }}
                    thumbColor={tokens.surface}
                  />
                }
              />
            </Stack>
          </Card>
        </Stack>
      </View>
    </Screen>
  );
}
