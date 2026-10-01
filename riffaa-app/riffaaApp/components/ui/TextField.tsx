import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  TextInput,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { Row } from './Row';
import { Stack } from './Stack';
import type { IoniconName } from './types';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  icon?: IoniconName;
  /** Shows a show/hide control when `secureTextEntry` is set. */
  secureToggle?: boolean;
  style?: TextStyle;
  className?: string;
}

/**
 * Labelled input. Text alignment and icon placement follow the app locale, and
 * errors are announced inline instead of via an alert.
 */
export function TextField({
  label,
  error,
  icon,
  secureToggle = false,
  secureTextEntry,
  multiline = false,
  onFocus,
  onBlur,
  style,
  className,
  ...rest
}: TextFieldProps) {
  const { isRTL } = useDirection();
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const [focused, setFocused] = useState(false);
  const hasToggle = secureToggle && Boolean(secureTextEntry);

  const inputStyle: TextStyle = {
    flex: 1,
    minHeight: multiline ? 88 : 46,
    paddingVertical: multiline ? 8 : 0,
    color: tokens.ink,
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 16,
    lineHeight: 24,
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: isRTL ? 'rtl' : 'ltr',
    textAlignVertical: multiline ? 'top' : 'center',
  };

  return (
    <Stack gap={6} className={className}>
      {label ? (
        <AppText variant="bodySm" weight="medium" tone="muted">
          {label}
        </AppText>
      ) : null}
      <Row
        gap={8}
        align={multiline ? 'flex-start' : 'center'}
        className="rounded-xl border bg-surface-2 px-3"
        style={{
          minHeight: 48,
          borderColor: error
            ? tokens.danger
            : focused
              ? tokens.brand
              : tokens.line,
        }}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={tokens.inkSubtle}
            style={{ marginTop: multiline ? 10 : 0 }}
          />
        ) : null}
        <TextInput
          {...rest}
          multiline={multiline}
          secureTextEntry={hasToggle ? hidden : secureTextEntry}
          placeholderTextColor={tokens.inkSubtle}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[inputStyle, style]}
        />
        {hasToggle ? (
          <IconButton
            icon={hidden ? 'eye-outline' : 'eye-off-outline'}
            accessibilityLabel={hidden ? t('showPassword') : t('hidePassword')}
            variant="ghost"
            size={20}
            onPress={() => setHidden((value) => !value)}
          />
        ) : null}
      </Row>
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </Stack>
  );
}
