import { useState, useCallback } from "react";
import type { ForceStrategy } from "../types/forceStrategy";
import type { SyncDecisionRow } from "src/services/notes/decision-table";

export interface ForceToggleState {
  forcedNoteIds: Record<number, boolean>;
}

export interface ForceToggleActions {
  getAriaLabel: (row: SyncDecisionRow) => string;
  getForcedOutcome: (row: SyncDecisionRow) => string | undefined;
  isForced: (noteId: number) => boolean;
  setForced: (noteId: number, isForced: boolean) => void;
  toggleForced: (noteId: number, isForced: boolean) => void;
}

export function useForceToggle(
  initialForced: Record<number, boolean> = {},
  strategy: ForceStrategy,
): [ForceToggleState, ForceToggleActions] {
  const [forcedNoteIds, setForcedNoteIds] =
    useState<Record<number, boolean>>(initialForced);

  const toggleForced = useCallback((noteId: number, isForced: boolean) => {
    setForcedNoteIds((prev) => ({ ...prev, [noteId]: isForced }));
  }, []);

  const setForced = useCallback((noteId: number, isForced: boolean) => {
    setForcedNoteIds((prev) => ({ ...prev, [noteId]: isForced }));
  }, []);

  const isForced = useCallback(
    (noteId: number) => {
      return forcedNoteIds[noteId] ?? false;
    },
    [forcedNoteIds],
  );

  return [
    { forcedNoteIds },
    {
      toggleForced,
      setForced,
      isForced,
      getForcedOutcome: strategy.getForcedOutcome,
      getAriaLabel: strategy.getAriaLabel,
    },
  ];
}
