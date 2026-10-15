import { useRef, useState } from "react";
import { useDebouncedValue } from "./useDebouncedValue";

export interface PreviewQuery {
  readonly debouncedQuery: string;
  readonly onQueryChange: (value: string) => void;
  readonly onQueryClear: () => void;
  readonly query: string;
  readonly resetQuery: () => void;
}

export function usePreviewQuery(
  onPageChange: (page: number) => void,
  initialQuery = "",
): PreviewQuery {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query);
  const isSeeded = useRef(initialQuery.length > 0);

  const onQueryChange = (value: string): void => {
    setQuery(value);
    onPageChange(0);
  };

  const onQueryClear = (): void => {
    setQuery("");
    onPageChange(0);
  };

  const resetQuery = (): void => {
    if (isSeeded.current) {
      isSeeded.current = false;
      return;
    }
    setQuery("");
  };

  return { debouncedQuery, onQueryChange, onQueryClear, query, resetQuery };
}
