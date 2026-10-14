import { useState } from "react";
import type { PageRowSelection } from "../utils/note-selection";

export interface ExpandedRows {
  readonly anyExpandedOnPage: boolean;
  readonly expandedIds: Set<number>;
  readonly onExpandAllToggle: () => void;
  readonly onExpandedToggle: (noteId: number) => void;
}

export function useExpandedRows(pageRows: PageRowSelection[]): ExpandedRows {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const anyExpandedOnPage = pageRows.some((row) => expandedIds.has(row.id));

  const onExpandedToggle = (noteId: number): void => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const onExpandAllToggle = (): void => {
    setExpandedIds(
      anyExpandedOnPage ? new Set() : new Set(pageRows.map((row) => row.id)),
    );
  };

  return {
    anyExpandedOnPage,
    expandedIds,
    onExpandAllToggle,
    onExpandedToggle,
  };
}
