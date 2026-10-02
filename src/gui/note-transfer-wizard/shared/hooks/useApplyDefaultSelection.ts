import { useEffect } from "react";

export function useApplyDefaultSelection<T>(
  items: readonly T[] | null,
  getKey: (item: T) => number,
  getDefault: (item: T) => boolean,
  current: Record<number, boolean>,
  onChange: (next: Record<number, boolean>) => void,
): void {
  useEffect(() => {
    if (!items) {
      return;
    }
    if (items.some((item) => !(getKey(item) in current))) {
      const merged = { ...current };
      for (const item of items) {
        const key = getKey(item);
        if (!(key in merged)) {
          merged[key] = getDefault(item);
        }
      }
      onChange(merged);
    }
  }, [items, getKey, getDefault, current, onChange]);
}
