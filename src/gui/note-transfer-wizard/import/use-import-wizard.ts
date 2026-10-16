import { useEffect, useMemo, useState } from "react";
import { startAsyncLoad } from "@shared/hooks/useAsyncLoad";
import type { Vault } from "obsidian";
import type { ISettings } from "src/conf/settings";
import type { VaultNoteIndex } from "src/services/vault/vault";
import { collectVaultNoteIndex } from "src/services/vault/vault";
import type { FieldMapping as FieldMap } from "src/entities/field-mapping";
import {
  buildImportWizardPages,
  completeImport,
  type ImportWizardContext,
  type ImportWizardPageDeps,
} from "src/gui/note-transfer-wizard/import/import-wizard-pages";
import type { WizardPage } from "@shared/components";
import type { WizardScope } from "@shared/utils/active-note-scope";
import type { ImportExecutionReport } from "src/services/commands/import-deck";

interface ImportFieldMappings {
  readonly fieldMappings: Record<string, FieldMap>;
  readonly mergeSessionFieldMappings: (
    mappings: Record<string, FieldMap>,
  ) => void;
}

interface ImportPreviewPagination {
  readonly handleNotesPreviewPageChange: (page: number) => void;
  readonly handleNotesPreviewTotalPagesChange: (totalPages: number) => void;
  readonly notesPreviewPage: number;
  readonly notesPreviewTotalPages: number;
  readonly reset: () => void;
}

interface ImportSelection {
  readonly forcedNoteIds: Record<number, boolean>;
  readonly highlightKey: number | null;
  readonly initialQuery: string;
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly selectDeckName: (deckName: string) => void;
  readonly selectedDeckName: string;
  readonly setForcedNoteIds: (ids: Record<number, boolean>) => void;
  readonly setNotesSelectedToImport: (
    selected: Record<number, boolean>,
  ) => void;
}

interface ScopedSeed {
  readonly highlightKey: number | null;
  readonly query: string;
}

interface ImportSyncState {
  readonly syncedMods: Record<number, number>;
}

interface ImportCompletionDeps {
  readonly fieldMappings: Record<string, FieldMap>;
  readonly saveSettings: () => Promise<void>;
  readonly selectedDeckName: string;
  readonly settings: ISettings;
  readonly vault: Vault;
}

interface ImportCompletion {
  readonly executionFinished: boolean;
  readonly failImport: () => void;
  readonly finishImport: (report: ImportExecutionReport) => void;
}

export function useImportCompletion(
  deps: ImportCompletionDeps,
): ImportCompletion {
  const [executionFinished, setExecutionFinished] = useState(false);

  const failImport = (): void => setExecutionFinished(true);

  const finishImport = (report: ImportExecutionReport): void => {
    setExecutionFinished(true);
    completeImport({
      fieldMappings: deps.fieldMappings,
      report,
      saveSettings: deps.saveSettings,
      selectedDeckName: deps.selectedDeckName,
      settings: deps.settings,
      vault: deps.vault,
    });
  };

  return { executionFinished, failImport, finishImport };
}

export function useImportSelection(activeScope: WizardScope): ImportSelection {
  const [selectedDeckName, setSelectedDeckName] = useState(
    activeScope.kind === "scoped" ? activeScope.deckName : "",
  );
  const [seed, setSeed] = useState<ScopedSeed | null>(
    activeScope.kind === "scoped"
      ? { highlightKey: activeScope.highlightKey, query: activeScope.query }
      : null,
  );
  const [notesSelectedToImport, setNotesSelectedToImport] = useState<
    Record<number, boolean>
  >({});
  const [forcedNoteIds, setForcedNoteIds] = useState<Record<number, boolean>>(
    {},
  );

  const selectDeckName = (deckName: string): void => {
    setSelectedDeckName(deckName);
    setSeed(null);
    setNotesSelectedToImport({});
    setForcedNoteIds({});
  };

  return {
    forcedNoteIds,
    highlightKey: seed?.highlightKey ?? null,
    initialQuery: seed?.query ?? "",
    notesSelectedToImport,
    selectDeckName,
    selectedDeckName,
    setForcedNoteIds,
    setNotesSelectedToImport,
  };
}

export function useImportFieldMappings(): ImportFieldMappings {
  const [fieldMappings, setFieldMappings] = useState<Record<string, FieldMap>>(
    {},
  );

  const mergeSessionFieldMappings = (next: Record<string, FieldMap>): void => {
    setFieldMappings((previous) => ({ ...previous, ...next }));
  };

  return { fieldMappings, mergeSessionFieldMappings };
}

export function useImportPreviewPagination(): ImportPreviewPagination {
  const [notesPreviewPage, setNotesPreviewPage] = useState(0);
  const [notesPreviewTotalPages, setNotesPreviewTotalPages] = useState(1);

  const handleNotesPreviewPageChange = (page: number): void => {
    setNotesPreviewPage(page);
  };

  const handleNotesPreviewTotalPagesChange = (totalPages: number): void => {
    setNotesPreviewTotalPages(totalPages);
  };

  const reset = (): void => {
    setNotesPreviewPage(0);
    setNotesPreviewTotalPages(1);
  };

  return {
    handleNotesPreviewPageChange,
    handleNotesPreviewTotalPagesChange,
    notesPreviewPage,
    notesPreviewTotalPages,
    reset,
  };
}

export function useVaultNoteIndexLoader(
  vault: Vault,
  settings: ISettings,
): VaultNoteIndex {
  const [vaultNoteIndex, setVaultNoteIndex] = useState<VaultNoteIndex>(
    new Map(),
  );

  const loadVaultNoteIndex = (): (() => void) =>
    startAsyncLoad(async (isLive) => {
      const known = await collectVaultNoteIndex(vault);
      if (isLive()) {
        setVaultNoteIndex(known);
      }
    });

  useEffect(loadVaultNoteIndex, [vault, settings]);
  return vaultNoteIndex;
}

export function useImportSyncState(
  noteLifecycle: ISettings["noteLifecycle"],
): ImportSyncState {
  return useMemo(() => {
    const syncedMods: Record<number, number> = {};
    for (const [id, record] of Object.entries(noteLifecycle)) {
      syncedMods[Number(id)] = record.lastMod;
    }
    return { syncedMods };
  }, [noteLifecycle]);
}

export function useImportWizardPages(
  deps: ImportWizardPageDeps,
): WizardPage<ImportWizardContext>[] {
  return useMemo(
    () => buildImportWizardPages(deps),
    [
      deps.anki,
      deps.deckNotes,
      deps.failImport,
      deps.fieldMappings,
      deps.finishImport,
      deps.forcedNoteIds,
      deps.handleNotesLoaded,
      deps.handleNotesPreviewPageChange,
      deps.handleNotesPreviewTotalPagesChange,
      deps.highlightKey,
      deps.initialQuery,
      deps.mergeSessionFieldMappings,
      deps.notesPreviewPage,
      deps.notesPreviewTotalPages,
      deps.notesSelectedToImport,
      deps.previewStatuses,
      deps.selectDeckName,
      deps.selectedDeckName,
      deps.setForcedNoteIds,
      deps.setNotesSelectedToImport,
      deps.settings,
      deps.syncState,
      deps.vault,
      deps.vaultNoteIndex,
    ],
  );
}
