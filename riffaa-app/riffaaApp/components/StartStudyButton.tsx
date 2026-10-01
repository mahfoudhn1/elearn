import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button } from './ui';
import { usePomodoro } from '../hooks/usePomodoro';
import type { PomodoroSource } from '../store/pomodoroStore';
import { useTranslation } from '../hooks/useTranslation';
import { describeApiError } from '../services/api/client';

export function StartStudyButton({ source }: { source: PomodoroSource }) {
  const router = useRouter();
  const { t } = useTranslation();
  const activeSession = usePomodoro().activeSession;
  const start = usePomodoro().start;
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    setBusy(true);
    try {
      if (!activeSession) await start(source);
      router.push('/study-session');
    } catch (error) {
      Alert.alert(t('error'), describeApiError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      label={activeSession ? t('openPomodoro') : t('startStudying')}
      icon={activeSession ? 'timer-outline' : 'play'}
      size="sm"
      variant="secondary"
      loading={busy}
      onPress={() => void onPress()}
    />
  );
}
