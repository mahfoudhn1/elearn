import type { ReactNode } from 'react';
import { Modal, Pressable, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeVars } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { AppText } from './AppText';
import { GlassSurface } from './GlassSurface';
import { IconButton } from './IconButton';
import { Row } from './Row';

export interface SheetProps extends ViewProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Bottom sheet built on RN `Modal` (no extra dependency): a `glass-2` panel
 * with a drag handle over a dimmed backdrop. Theme variables are re-applied
 * because native modals render outside the app's main view tree.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  className,
  style,
  ...rest
}: SheetProps) {
  const insets = useSafeAreaInsets();
  const themeVars = useThemeVars();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={themeVars}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('close')}
          onPress={onClose}
          className="flex-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        />
        <GlassSurface
          {...rest}
          level="glass-2"
          accessibilityViewIsModal
          className={`rounded-t-[28px] rounded-b-none px-4 pt-3${className ? ` ${className}` : ''}`}
          style={[{ paddingBottom: insets.bottom + 16 }, style]}
        >
          <View className="mb-2 h-1 w-10 self-center rounded-full bg-line" />
          {title ? (
            <Row gap={8} justify="space-between" className="mb-3">
              <AppText variant="title">{title}</AppText>
              <IconButton
                icon="close"
                accessibilityLabel={t('close')}
                variant="ghost"
                onPress={onClose}
              />
            </Row>
          ) : null}
          {children}
        </GlassSurface>
      </View>
    </Modal>
  );
}
