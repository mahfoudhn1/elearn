import { Ionicons } from '@expo/vector-icons';
import { Pressable, TextInput, View } from 'react-native';

import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { QuestionOption, ServedQuestion } from '../../services/api/assessment';
import { Row, Stack } from '../ui';
import { MathText } from './MathText';
/**
 * The read/answer surface for a single question: prompt (LaTeX-aware), options
 * or a numeric field. Shared by the quiz player and the adaptive diagnostic so
 * the answer interactions stay identical. Grading is always server-side; this
 * component only collects a response.
 */
export interface QuestionBodyProps {
  question: ServedQuestion;
  selected: string[];
  numeric: string;
  onToggleOption: (option: QuestionOption) => void;
  onNumericChange: (value: string) => void;
  disabled?: boolean;
}

export function QuestionBody({
  question,
  selected,
  numeric,
  onToggleOption,
  onNumericChange,
  disabled = false,
}: QuestionBodyProps) {
  const { t, locale } = useTranslation();
  const { tokens } = useTheme();
  const isNumeric = question.kind === 'NUMERIC';

  return (
    <Stack gap={12}>
      <MathText variant="title">{locale === 'ar' ? question.prompt_ar : question.prompt_fr}</MathText>

      {isNumeric ? (
        <TextInput
          value={numeric}
          onChangeText={onNumericChange}
          editable={!disabled}
          keyboardType="numbers-and-punctuation"
          placeholder={t('assessmentTypeAnswer')}
          placeholderTextColor={tokens.inkSubtle}
          className="rounded-2xl border border-line bg-surface-2 px-4 py-3 text-ink"
        />
      ) : (
        <Stack gap={8}>
          {question.options.map((option) => {
            const active = selected.includes(option.id);
            const isTrueFalse = question.kind === 'TRUE_FALSE';
            const label = isTrueFalse
              ? option.order === 0
                ? t('assessmentTrue')
                : t('assessmentFalse')
              : locale === 'ar'
                ? option.text_ar
                : option.text_fr;
            return (
              <Pressable
                key={option.id}
                onPress={() => onToggleOption(option)}
                disabled={disabled}
                className={`rounded-2xl border px-4 py-3 ${
                  active ? 'border-brand bg-surface-2' : 'border-line'
                }`}
              >
                <Row gap={10} align="center">
                  <View
                    className={`h-6 w-6 items-center justify-center rounded-full border ${
                      active ? 'border-brand' : 'border-line'
                    }`}
                  >
                    {active ? <Ionicons name="checkmark" size={14} color={tokens.brand} /> : null}
                  </View>
                  <MathText variant="bodySm" className="flex-1">
                    {label}
                  </MathText>
                </Row>
              </Pressable>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
