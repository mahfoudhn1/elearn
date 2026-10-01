import { Image } from 'expo-image';
import { View, type ViewProps } from 'react-native';
import { AppText } from './AppText';

export interface AvatarProps extends ViewProps {
  name?: string;
  url?: string | null;
  size?: number;
  className?: string;
}

function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0)).join('') || '?';
}

/** User image with an initials fallback. */
export function Avatar({ name, url, size = 40, className, style, ...rest }: AvatarProps) {
  const classes = `items-center justify-center overflow-hidden rounded-full bg-surface-2${className ? ` ${className}` : ''}`;

  if (url) {
    return (
      <View {...rest} className={classes} style={[{ width: size, height: size }, style]}>
        <Image
          source={{ uri: url }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={150}
        />
      </View>
    );
  }

  return (
    <View {...rest} className={classes} style={[{ width: size, height: size }, style]}>
      <AppText
        weight="semibold"
        tone="muted"
        style={{ fontSize: Math.round(size * 0.4), lineHeight: Math.round(size * 0.5) }}
      >
        {initials(name)}
      </AppText>
    </View>
  );
}
