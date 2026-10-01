import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useDirection } from '../../hooks/useDirection';

type BaseIconProps = Omit<ComponentProps<typeof Ionicons>, 'name'>;

export interface DirIconProps extends BaseIconProps {
  /** Directional glyph, expressed in reading order (flips with the locale). */
  name: 'chevron-forward' | 'chevron-back' | 'arrow-forward' | 'arrow-back';
}

const MIRROR: Record<DirIconProps['name'], ComponentProps<typeof Ionicons>['name']> = {
  'chevron-forward': 'chevron-back',
  'chevron-back': 'chevron-forward',
  'arrow-forward': 'arrow-back',
  'arrow-back': 'arrow-forward',
};

/** Icon that points "forward"/"back" in reading order for the current locale. */
export function DirIcon({ name, ...rest }: DirIconProps) {
  const { isRTL } = useDirection();
  return <Ionicons {...rest} name={isRTL ? MIRROR[name] : name} />;
}
