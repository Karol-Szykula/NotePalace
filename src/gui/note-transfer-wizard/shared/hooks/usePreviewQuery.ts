import { useState } from "react";
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
): PreviewQuery {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const onQueryChange = (value: string): void => {
    setQuery(value);
    onPageChange(0);
  };

  const onQueryClear = (): void => {
    setQuery("");
    onPageChange(0);
  };

  const resetQuery = (): void => {
    setQuery("");
  };

  return { debouncedQuery, onQueryChange, onQueryClear, query, resetQuery };
}
