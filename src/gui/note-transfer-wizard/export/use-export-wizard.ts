import { useMemo, useState } from "react";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import type { WizardPage } from "@shared/components";
import type { WizardScope } from "@shared/utils/active-note-scope";
import {
  buildExportWizardPages,
  type ExportWizardContext,
  type ExportWizardPageDeps,
} from "./export-wizard-pages";

export interface ExportWizardState {
  readonly forcedNoteIds: Record<number, boolean>;
  readonly handleNotesPreviewPageChange: (page: number) => void;
  readonly handleNotesPreviewTotalPagesChange: (totalPages: number) => void;
  readonly handleStatusesLoaded: (
    statuses: Record<number, NoteLifecycleStatus>,
  ) => void;
  readonly highlightKey: number | null;
  readonly initialQuery: string;
  readonly notesPreviewPage: number;
  readonly notesPreviewTotalPages: number;
  readonly notesSelectedToExport: Record<number, boolean>;
  readonly previewStatuses: Record<number, NoteLifecycleStatus>;
  readonly reset: () => void;
  readonly selectDeckName: (deckName: string) => void;
  readonly selectedDeckName: string;
  readonly setForcedNoteIds: (ids: Record<number, boolean>) => void;
  readonly setNotesSelectedToExport: (
    selected: Record<number, boolean>,
  ) => void;
}

interface ExportScopedSeed {
  readonly highlightKey: number | null;
  readonly query: string;
}

function initialDeckName(activeScope: WizardScope): string {
  return activeScope.kind === "scoped" ? activeScope.deckName : "";
}

function scopedSeed(activeScope: WizardScope): ExportScopedSeed | null {
  return activeScope.kind === "scoped"
    ? { highlightKey: activeScope.highlightKey, query: activeScope.query }
    : null;
}

export function useExportWizardState(
  activeScope: WizardScope,
): ExportWizardState {
  const [selectedDeckName, setSelectedDeckName] = useState(
    initialDeckName(activeScope),
  );
  const [seed, setSeed] = useState<ExportScopedSeed | null>(
    scopedSeed(activeScope),
  );
  const [notesSelectedToExport, setNotesSelectedToExport] = useState<
    Record<number, boolean>
  >({});
  const [forcedNoteIds, setForcedNoteIds] = useState<Record<number, boolean>>(
    {},
  );
  const [previewStatuses, setPreviewStatuses] = useState<
    Record<number, NoteLifecycleStatus>
  >({});
  const [notesPreviewPage, setNotesPreviewPage] = useState(0);
  const [notesPreviewTotalPages, setNotesPreviewTotalPages] = useState(1);

  const selectDeckName = (deckName: string): void => {
    setSelectedDeckName(deckName);
    setSeed(null);
    setNotesSelectedToExport({});
    setForcedNoteIds({});
    setPreviewStatuses({});
  };

  const handleNotesPreviewPageChange = (page: number): void => {
    setNotesPreviewPage(page);
  };

  const handleNotesPreviewTotalPagesChange = (totalPages: number): void => {
    setNotesPreviewTotalPages(totalPages);
  };

  const handleStatusesLoaded = (
    statuses: Record<number, NoteLifecycleStatus>,
  ): void => {
    setPreviewStatuses(statuses);
  };

  const reset = (): void => {
    setNotesPreviewPage(0);
    setNotesPreviewTotalPages(1);
  };

  return {
    forcedNoteIds,
    handleNotesPreviewPageChange,
    handleNotesPreviewTotalPagesChange,
    handleStatusesLoaded,
    highlightKey: seed?.highlightKey ?? null,
    initialQuery: seed?.query ?? "",
    notesPreviewPage,
    notesPreviewTotalPages,
    notesSelectedToExport,
    previewStatuses,
    reset,
    selectDeckName,
    selectedDeckName,
    setForcedNoteIds,
    setNotesSelectedToExport,
  };
}

export function useExportWizardPages(
  deps: ExportWizardPageDeps,
): WizardPage<ExportWizardContext>[] {
  return useMemo(
    () => buildExportWizardPages(deps),
    [
      deps.anki,
      deps.finishExport,
      deps.forcedNoteIds,
      deps.handleNotesPreviewPageChange,
      deps.handleNotesPreviewTotalPagesChange,
      deps.handleStatusesLoaded,
      deps.highlightKey,
      deps.ignoredDirectories,
      deps.initialQuery,
      deps.notesPreviewPage,
      deps.notesPreviewTotalPages,
      deps.notesSelectedToExport,
      deps.previewStatuses,
      deps.selectDeckName,
      deps.selectedDeckName,
      deps.setForcedNoteIds,
      deps.setNotesSelectedToExport,
      deps.settings,
      deps.vault,
    ],
  );
}
