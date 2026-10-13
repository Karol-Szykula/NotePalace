import { useEffect, useState } from "react";

export const searchDebounceMs = 150;

export function useDebouncedValue<T>(
  value: T,
  delayMs: number = searchDebounceMs,
): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}
