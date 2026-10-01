import { useDirection } from './useDirection';

export type EdgeSide = 'left' | 'right';

/**
 * Logical edge helper. Prefer `gap` and symmetric padding; use this only when a
 * one-sided inset is unavoidable, so margins flip with the locale instead of
 * relying on `ml-*`/`mr-*`.
 */
export function useEdge(): { start: EdgeSide; end: EdgeSide } {
  const { isRTL } = useDirection();
  return {
    start: isRTL ? 'right' : 'left',
    end: isRTL ? 'left' : 'right',
  };
}
