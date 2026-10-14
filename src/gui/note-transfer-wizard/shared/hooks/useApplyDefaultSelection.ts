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
    if (!items.some((item) => !(getKey(item) in current))) {
      return;
    }
    onChange(mergedWithDefaults(items, current, getKey, getDefault));
  }, [items, getKey, getDefault, current, onChange]);
}

function mergedWithDefaults<T>(
  items: readonly T[],
  current: Record<number, boolean>,
  getKey: (item: T) => number,
  getDefault: (item: T) => boolean,
): Record<number, boolean> {
  const merged = { ...current };
  for (const item of items) {
    const key = getKey(item);
    if (!(key in merged)) {
      merged[key] = getDefault(item);
    }
  }
  return merged;
}
