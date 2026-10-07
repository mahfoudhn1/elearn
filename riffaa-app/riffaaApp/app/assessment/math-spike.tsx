import { View } from 'react-native';

import { MathText } from '../../components/assessment/MathText';
import { AppText, Card, Screen, ScreenHeader, Stack } from '../../components/ui';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * SPIKE (Phase A8): a manual test surface for Arabic/French + LaTeX rendering.
 *
 * Open on both Android and iOS and confirm:
 *  - Arabic flows RTL while embedded math stays LTR and legible.
 *  - Display math centres and does not overflow its card.
 *  - The WebView height matches its content (no clipping, no dead space).
 *  - Text with no math renders without a WebView (fast path).
 *
 * Limits and the decision record live in `docs/mobile/00_math_rtl_spike.md`.
 */
const CASES: { label: string; value: string }[] = [
  { label: 'Arabic inline', value: 'حل المعادلة $x^2 + 2x + 1 = 0$ ثم استنتج المميز.' },
  {
    label: 'Arabic display',
    value: 'قانون المساحة:\n$$A = \\pi r^2$$',
  },
  {
    label: 'French inline',
    value: 'La dérivée de $f(x) = x^3$ est $f\'(x) = 3x^2$.' ,
  },
  {
    label: 'French display',
    value: 'Théorème de Pythagore :\n$$a^2 + b^2 = c^2$$',
  },
  {
    label: 'Mixed fraction',
    value: 'احسب $\\frac{3}{4} + \\frac{1}{2}$ ثم بسّط الناتج.',
  },
  { label: 'No math (fast path)', value: 'نص عادي بدون رياضيات — Texte simple sans maths.' },
];

export default function MathSpikeScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1">
      <ScreenHeader title={t('assessmentMathSpike')} subtitle={t('assessmentMathSpikeHint')} />
      <Screen scroll>
        <Stack gap={12}>
          {CASES.map((testCase) => (
            <Card key={testCase.label} variant="list">
              <Stack gap={8}>
                <AppText variant="micro" weight="medium" tone="subtle" className="uppercase tracking-widest">
                  {testCase.label}
                </AppText>
                <MathText variant="body">{testCase.value}</MathText>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Screen>
    </View>
  );
}
