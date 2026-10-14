import { useEffect, useMemo, useState } from "react";
import { startAsyncLoad } from "@shared/hooks/useAsyncLoad";
import type { Vault } from "obsidian";
import type { ISettings } from "src/conf/settings";
import type { VaultNoteIndex } from "src/services/vault/vault";
import { collectVaultNoteIndex } from "src/services/vault/vault";
import type { FieldMapping as FieldMap } from "src/entities/field-mapping";
import {
  buildImportWizardPages,
  type ImportWizardContext,
  type ImportWizardPageDeps,
} from "src/gui/note-transfer-wizard/import/import-wizard-pages";
import type { WizardPage } from "@shared/components";

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
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly selectDeckName: (deckName: string) => void;
  readonly selectedDeckName: string;
  readonly setForcedNoteIds: (ids: Record<number, boolean>) => void;
  readonly setNotesSelectedToImport: (
    selected: Record<number, boolean>,
  ) => void;
}

interface ImportSyncState {
  readonly syncedMods: Record<number, number>;
}

export function useImportSelection(): ImportSelection {
  const [selectedDeckName, setSelectedDeckName] = useState("");
  const [notesSelectedToImport, setNotesSelectedToImport] = useState<
    Record<number, boolean>
  >({});
  const [forcedNoteIds, setForcedNoteIds] = useState<Record<number, boolean>>(
    {},
  );

  const selectDeckName = (deckName: string): void => {
    setSelectedDeckName(deckName);
    setNotesSelectedToImport({});
    setForcedNoteIds({});
  };

  return {
    forcedNoteIds,
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
      deps.fieldMappings,
      deps.finishImport,
      deps.forcedNoteIds,
      deps.handleNotesLoaded,
      deps.handleNotesPreviewPageChange,
      deps.handleNotesPreviewTotalPagesChange,
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
