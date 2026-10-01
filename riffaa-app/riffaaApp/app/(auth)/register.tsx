import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Chip,
  ProgressBar,
  Row,
  Screen,
  Stack,
  TextField,
} from '../../components/ui';
import { HIGH_BRANCHES, HIGH_YEARS, MIDDLE_YEARS } from '../../constants/register';
import { useTranslation } from '../../hooks/useTranslation';
import { signUpWithEmail } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';

type SchoolStage = 'middle' | 'high';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const setUser = useAuthStore((state) => state.setUser);
  const setSession = useAuthStore((state) => state.setSession);

  const [step, setStep] = useState<1 | 2>(1);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [wilaya, setWilaya] = useState('');
  const [schoolStage, setSchoolStage] = useState<SchoolStage | null>(null);
  const [educationLevel, setEducationLevel] = useState('');
  const [branch, setBranch] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const years = schoolStage === 'high' ? HIGH_YEARS : MIDDLE_YEARS;

  function handleNextStep() {
    if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
      setError(t('fillAllFields'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }
    setError(null);
    setStep(2);
  }

  async function handleRegister() {
    if (!wilaya || !schoolStage || !educationLevel || (schoolStage === 'high' && !branch)) {
      setError(t('fillSchoolFields'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { session, profile } = await signUpWithEmail(
        `${firstName} ${lastName}`.trim(),
        email,
        password,
        {
          firstName,
          lastName,
          username,
          email,
          password,
          wilaya,
          schoolStage,
          educationLevel,
          branch: schoolStage === 'high' ? branch : null,
        },
      );
      setSession(session);
      setUser(profile);
      router.replace('/home');
    } catch (caught) {
      setError((caught as Error).message || t('registerFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll padded={false} edges={{ top: true }}>
      <KeyboardAvoidingView
        className="flex-1 justify-center px-6"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Stack gap={24}>
          <Stack gap={10} align="center">
            <View className="rounded-hero bg-brand px-7 py-5">
              <AppText variant="display" weight="light" className="text-on-brand">
                {t('appName')}
              </AppText>
            </View>
            <AppText variant="heading" align="center">
              {step === 1 ? t('register') : t('schoolInfo')}
            </AppText>
            <AppText variant="bodySm" tone="muted" align="center">
              {step === 1 ? t('registerSubtitle') : t('fillSchoolFields')}
            </AppText>
            <AppText variant="micro" weight="medium" tone="brand">
              {step === 1 ? t('step1of2') : t('step2of2')}
            </AppText>
            <View className="w-full">
              <ProgressBar value={step === 1 ? 50 : 100} />
            </View>
          </Stack>

          <Card variant="raised">
            {step === 1 ? (
              <Stack gap={16}>
                <Row gap={12}>
                  <View className="flex-1">
                    <TextField
                      label={t('firstName')}
                      placeholder={t('firstName')}
                      value={firstName}
                      onChangeText={setFirstName}
                    />
                  </View>
                  <View className="flex-1">
                    <TextField
                      label={t('lastName')}
                      placeholder={t('lastName')}
                      value={lastName}
                      onChangeText={setLastName}
                    />
                  </View>
                </Row>
                <TextField
                  label={t('usernameLabel')}
                  placeholder={t('usernameLabel')}
                  icon="person-outline"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextField
                  label={t('emailLabel')}
                  placeholder="name@example.com"
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextField
                  label={t('password')}
                  placeholder={t('password')}
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  secureToggle
                />
                <TextField
                  label={t('confirmPassword')}
                  placeholder={t('confirmPassword')}
                  icon="lock-closed-outline"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  secureToggle
                  error={
                    confirmPassword.length > 0 && password !== confirmPassword
                      ? t('passwordMismatch')
                      : undefined
                  }
                />

                {error ? (
                  <AppText variant="bodySm" tone="danger">
                    {error}
                  </AppText>
                ) : null}

                <Button
                  label={t('next')}
                  trailingIcon="arrow-forward"
                  fullWidth
                  onPress={handleNextStep}
                />
              </Stack>
            ) : (
              <Stack gap={20}>
                <TextField
                  label={t('wilayaLabel')}
                  placeholder={t('wilayaLabel')}
                  icon="location-outline"
                  value={wilaya}
                  onChangeText={setWilaya}
                />

                <Stack gap={8}>
                  <AppText variant="bodySm" weight="medium">
                    {t('stageLabel')}
                  </AppText>
                  <Row gap={12}>
                    <Chip
                      className="flex-1 justify-center"
                      label={t('stageMiddle')}
                      selected={schoolStage === 'middle'}
                      onPress={() => {
                        setSchoolStage('middle');
                        setEducationLevel('');
                        setBranch('');
                      }}
                    />
                    <Chip
                      className="flex-1 justify-center"
                      label={t('stageHigh')}
                      selected={schoolStage === 'high'}
                      onPress={() => {
                        setSchoolStage('high');
                        setEducationLevel('');
                      }}
                    />
                  </Row>
                </Stack>

                {schoolStage ? (
                  <Stack gap={8}>
                    <AppText variant="bodySm" weight="medium">
                      {t('yearLabel')}
                    </AppText>
                    <Row gap={8} wrap>
                      {years.map((year) => (
                        <Chip
                          key={year}
                          label={year}
                          selected={educationLevel === year}
                          onPress={() => setEducationLevel(year)}
                        />
                      ))}
                    </Row>
                  </Stack>
                ) : null}

                {schoolStage === 'high' ? (
                  <Stack gap={8}>
                    <AppText variant="bodySm" weight="medium">
                      {t('branchLabel')}
                    </AppText>
                    <Row gap={8} wrap>
                      {HIGH_BRANCHES.map((option) => (
                        <Chip
                          key={option}
                          label={option}
                          selected={branch === option}
                          onPress={() => setBranch(option)}
                        />
                      ))}
                    </Row>
                  </Stack>
                ) : null}

                {error ? (
                  <AppText variant="bodySm" tone="danger">
                    {error}
                  </AppText>
                ) : null}

                <Row gap={12}>
                  <Button
                    label={t('back')}
                    variant="secondary"
                    onPress={() => {
                      setError(null);
                      setStep(1);
                    }}
                  />
                  <View className="flex-1">
                    <Button
                      fullWidth
                      label={t('register')}
                      loading={loading}
                      onPress={() => void handleRegister()}
                    />
                  </View>
                </Row>
              </Stack>
            )}
          </Card>

          {step === 1 ? (
            <>
              <Row gap={12} align="center">
                <View className="h-px flex-1 bg-hairline" />
                <AppText variant="caption" tone="muted">
                  {t('orContinueWith')}
                </AppText>
                <View className="h-px flex-1 bg-hairline" />
              </Row>

              <Button
                label={`${t('google')} · ${t('comingSoon')}`}
                variant="secondary"
                icon="logo-google"
                fullWidth
                disabled
                onPress={() => {}}
              />

              <Row gap={6} justify="center" align="center">
                <AppText variant="bodySm" tone="muted">
                  {t('haveAccount')}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('signIn')}
                  onPress={() => router.push('/login')}
                >
                  <AppText variant="bodySm" weight="medium" tone="brand">
                    {t('signIn')}
                  </AppText>
                </Pressable>
              </Row>
            </>
          ) : null}
        </Stack>
      </KeyboardAvoidingView>
    </Screen>
  );
}
