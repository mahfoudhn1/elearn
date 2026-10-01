import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/** Ionicons glyph names (the app's single icon set). */
export type IoniconName = ComponentProps<typeof Ionicons>['name'];
