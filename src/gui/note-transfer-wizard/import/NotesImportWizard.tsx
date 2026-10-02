import { useEffect, useMemo, useState, type JSX } from "react";
import { startAsyncLoad } from "@shared/hooks/useAsyncLoad";
import type { Vault } from "obsidian";
import { Anki } from "src/services/anki/anki";
import { logger } from "src/services/logger";
import type { ISettings } from "src/conf/settings";
import type { VaultNoteIndex } from "src/services/vault/vault";
import { collectVaultNoteIndex } from "src/services/vault/vault";
import type { FieldMapping as FieldMap } from "src/entities/field-mapping";
import type { ImportExecutionReport } from "src/services/commands/import-deck";
import { syncedCleanRecord } from "src/services/notes/lifecycle";
import {
  builtInPackFor,
  notePackVersion,
  savePack,
} from "src/services/notes/packs";
import { noteShapeFor } from "src/entities/note-shapes";
import { mergeFieldMappings } from "src/entities/field-mapping";
import { useDeckPreview } from "src/gui/note-transfer-wizard/import/use-deck-preview";
import { DeckSelection } from "src/gui/note-transfer-wizard/import/components/DeckSelection";
import { FieldMapping } from "src/gui/note-transfer-wizard/import/components/FieldMapping";
import { NotesPreview } from "src/gui/note-transfer-wizard/import/components/NotesPreview";
import { ImportExecution } from "src/gui/note-transfer-wizard/import/components/ImportExecution";
import { WizardShell, type WizardPage } from "@shared/components";
import {
  commonWizardClasses,
  noteTransferWizardClasses,
} from "@shared/classes";

export interface NotesImportWizardProps {
  readonly onCancel: () => void;
  readonly saveSettings: () => Promise<void>;
  readonly settings: ISettings;
  readonly vault: Vault;
}

interface ImportWizardContext {
  readonly notesSelectedToImportCount: number;
  readonly selectedDeckName: string;
}

interface ImportWizardPageDeps {
  readonly anki: Anki;
  readonly deckNotes: ReturnType<typeof useDeckPreview>["deckNotes"];
  readonly fieldMappings: Record<string, FieldMap>;
  readonly finishImport: (report: ImportExecutionReport) => void;
  readonly forcedNoteIds: Record<number, boolean>;
  readonly handleNotesLoaded: ReturnType<
    typeof useDeckPreview
  >["handleNotesLoaded"];
  readonly handleNotesPreviewPageChange: (page: number) => void;
  readonly handleNotesPreviewTotalPagesChange: (totalPages: number) => void;
  readonly notesPreviewPage: number;
  readonly notesPreviewTotalPages: number;
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly previewStatuses: ReturnType<
    typeof useDeckPreview
  >["previewStatuses"];
  readonly selectDeckName: (deckName: string) => void;
  readonly selectedDeckName: string;
  readonly setFieldMappings: (mappings: Record<string, FieldMap>) => void;
  readonly setForcedNoteIds: (ids: Record<number, boolean>) => void;
  readonly setNotesSelectedToImport: (
    selected: Record<number, boolean>,
  ) => void;
  readonly settings: ISettings;
  readonly syncState: {
    readonly fallbackRev: number;
    readonly syncedMods: Record<number, number>;
  };
  readonly vault: Vault;
  readonly vaultNoteIndex: VaultNoteIndex;
}

function saveModelPacksFor(
  vault: Vault,
  fieldMappings: Record<string, FieldMap>,
): Promise<void> {
  const saves = Object.entries(fieldMappings)
    .filter(([modelName]) => builtInPackFor(modelName) === undefined)
    .map(([modelName, mapping]) =>
      savePack(vault, {
        formTemplate: noteShapeFor(modelName),
        mapping,
        modelName,
        packVersion: notePackVersion,
      }),
    );
  return Promise.all(saves).then(
    () => undefined,
    (error: unknown) => {
      logger.error("saving settings failed", error);
    },
  );
}

function buildImportWizardPages(
  deps: ImportWizardPageDeps,
): WizardPage<ImportWizardContext>[] {
  return [
    {
      canAdvance: (context) => context.selectedDeckName !== "",
      render: () => (
        <DeckSelection
          anki={deps.anki}
          className={commonWizardClasses.pageView}
          onSelectDeckName={deps.selectDeckName}
          selectedDeckName={deps.selectedDeckName}
          syncState={deps.syncState}
          vaultNoteIndex={deps.vaultNoteIndex}
        />
      ),
      title: "Deck",
    },
    {
      render: () => (
        <FieldMapping
          anki={deps.anki}
          className={commonWizardClasses.pageView}
          deckName={deps.selectedDeckName}
          key={deps.selectedDeckName}
          onMappingsChange={deps.setFieldMappings}
          savedMappings={deps.settings.fieldMappings}
        />
      ),
      title: "Fields",
    },
    {
      canAdvance: (context) => context.notesSelectedToImportCount > 0,
      render: () => (
        <NotesPreview
          anki={deps.anki}
          className={commonWizardClasses.pageView}
          currentPage={deps.notesPreviewPage}
          deckName={deps.selectedDeckName}
          forcedNoteIds={deps.forcedNoteIds}
          key={deps.selectedDeckName}
          noteLifecycle={deps.settings.noteLifecycle}
          notesSelectedToImport={deps.notesSelectedToImport}
          onForcedNoteIdsChange={deps.setForcedNoteIds}
          onNotesLoaded={deps.handleNotesLoaded}
          onNotesSelectedToImportChange={deps.setNotesSelectedToImport}
          onPageChange={deps.handleNotesPreviewPageChange}
          onTotalPagesChange={deps.handleNotesPreviewTotalPagesChange}
          totalPages={deps.notesPreviewTotalPages}
          vault={deps.vault}
          vaultNoteIndex={deps.vaultNoteIndex}
        />
      ),
      title: "Cards",
    },
    {
      render: () => (
        <ImportExecution
          anki={deps.anki}
          className={commonWizardClasses.pageView}
          deckName={deps.selectedDeckName}
          fieldMappings={deps.fieldMappings}
          forcedNoteIds={deps.forcedNoteIds}
          key={deps.selectedDeckName}
          noteLifecycle={deps.settings.noteLifecycle}
          notes={deps.deckNotes}
          notesSelectedToImport={deps.notesSelectedToImport}
          onFinish={deps.finishImport}
          previewStatuses={deps.previewStatuses}
          vault={deps.vault}
          vaultNoteIndex={deps.vaultNoteIndex}
        />
      ),
      title: "Save",
    },
  ];
}

export function NotesImportWizard({
  onCancel,
  saveSettings,
  settings,
  vault,
}: NotesImportWizardProps): JSX.Element {
  const [anki] = useState(() => new Anki());
  const [selectedDeckName, setSelectedDeckName] = useState("");
  const { deckNotes, handleNotesLoaded, previewStatuses } = useDeckPreview();
  const [vaultNoteIndex, setVaultNoteIndex] = useState<VaultNoteIndex>(
    new Map(),
  );
  const [fieldMappings, setFieldMappings] = useState<Record<string, FieldMap>>(
    {},
  );
  const [notesSelectedToImport, setNotesSelectedToImport] = useState<
    Record<number, boolean>
  >({});
  const [forcedNoteIds, setForcedNoteIds] = useState<Record<number, boolean>>(
    {},
  );
  const [notesPreviewPage, setNotesPreviewPage] = useState(0);
  const [notesPreviewTotalPages, setNotesPreviewTotalPages] = useState(1);

  const selectDeckName = (deckName: string): void => {
    setSelectedDeckName(deckName);
    setNotesSelectedToImport({});
    setForcedNoteIds({});
  };

  const loadVaultNoteIndex = (): (() => void) =>
    startAsyncLoad(async (isLive) => {
      const known = await collectVaultNoteIndex(vault);
      if (isLive()) {
        setVaultNoteIndex(known);
      }
    });

  useEffect(loadVaultNoteIndex, [vault, settings]);

  const persistFieldMappings = () => {
    settings.fieldMappings = mergeFieldMappings(
      settings.fieldMappings,
      fieldMappings,
    );
    void saveSettings();
    void saveModelPacksFor(vault, fieldMappings);
  };

  const finishImport = (report: ImportExecutionReport) => {
    for (const [id, mod] of Object.entries(report.syncedNotes)) {
      const noteId = Number(id);
      settings.noteLifecycle[noteId] = syncedCleanRecord(
        mod,
        report.syncedHashes[noteId] ?? "",
        Date.now(),
      );
    }
    settings.deckImportSnapshots = {
      ...settings.deckImportSnapshots,
      [selectedDeckName]: {
        deckName: selectedDeckName,
        fieldMappings,
        importedAt: Date.now(),
      },
    };
    const importedMods = Object.values(report.syncedNotes);
    if (importedMods.length > 0) {
      settings.lastSyncRev = Math.max(settings.lastSyncRev, ...importedMods);
    }
    void saveSettings();
  };

  const handleNotesPreviewPageChange = (page: number) => {
    setNotesPreviewPage(page);
  };

  const handleNotesPreviewTotalPagesChange = (totalPages: number) => {
    setNotesPreviewTotalPages(totalPages);
  };

  const notesSelectedToImportCount = Object.values(
    notesSelectedToImport,
  ).filter(Boolean).length;
  const syncState = useMemo(() => {
    const syncedMods: Record<number, number> = {};
    for (const [id, record] of Object.entries(settings.noteLifecycle)) {
      syncedMods[Number(id)] = record.lastMod;
    }
    return {
      fallbackRev: settings.lastSyncRev,
      syncedMods,
    };
  }, [settings.lastSyncRev, settings.noteLifecycle]);

  const pages = useMemo(
    () =>
      buildImportWizardPages({
        anki,
        deckNotes,
        fieldMappings,
        finishImport,
        forcedNoteIds,
        handleNotesLoaded,
        handleNotesPreviewPageChange,
        handleNotesPreviewTotalPagesChange,
        notesPreviewPage,
        notesPreviewTotalPages,
        notesSelectedToImport,
        previewStatuses,
        selectDeckName,
        selectedDeckName,
        setFieldMappings,
        setForcedNoteIds,
        setNotesSelectedToImport,
        settings,
        syncState,
        vault,
        vaultNoteIndex,
      }),
    [
      anki,
      deckNotes,
      fieldMappings,
      finishImport,
      forcedNoteIds,
      handleNotesLoaded,
      handleNotesPreviewPageChange,
      handleNotesPreviewTotalPagesChange,
      notesPreviewPage,
      notesPreviewTotalPages,
      notesSelectedToImport,
      previewStatuses,
      selectDeckName,
      selectedDeckName,
      setFieldMappings,
      setForcedNoteIds,
      setNotesSelectedToImport,
      settings,
      syncState,
      vault,
      vaultNoteIndex,
    ],
  );

  return (
    <WizardShell
      className={noteTransferWizardClasses.modal}
      getContext={() => ({
        notesSelectedToImportCount,
        selectedDeckName,
      })}
      getNextLabel={(page) => (page === 3 ? "Import" : undefined)}
      getPagination={(page) =>
        page === 3
          ? {
              currentPage: notesPreviewPage,
              onPageChange: handleNotesPreviewPageChange,
              totalPages: notesPreviewTotalPages,
            }
          : undefined
      }
      initialPage={1}
      onBeforeAdvance={(fromPage) => {
        if (fromPage === 2) {
          persistFieldMappings();
        }
        if (fromPage === 3) {
          setNotesPreviewPage(0);
          setNotesPreviewTotalPages(1);
        }
      }}
      onCancel={onCancel}
      onFinish={() => undefined}
      pages={pages}
    />
  );
}
