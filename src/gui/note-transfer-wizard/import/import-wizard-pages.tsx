import { t } from "src/i18n";
import type { Vault } from "obsidian";
import type { Anki } from "src/services/anki/anki";
import { logger } from "src/services/logger";
import type { ISettings } from "src/conf/settings";
import type { VaultNoteIndex } from "src/services/vault/vault";
import type { FieldMapping as FieldMap } from "src/entities/field-mapping";
import { mergeFieldMappings } from "src/entities/field-mapping";
import type { ImportExecutionReport } from "src/services/commands/import-deck";
import { syncedCleanRecord } from "src/services/notes/lifecycle";
import {
  builtInPackFor,
  notePackVersion,
  savePack,
} from "src/services/notes/packs";
import { noteShapeFor } from "src/entities/note-shapes";
import type { useDeckPreview } from "src/gui/note-transfer-wizard/import/use-deck-preview";
import { DeckSelection } from "src/gui/note-transfer-wizard/import/components/DeckSelection";
import { FieldMapping } from "src/gui/note-transfer-wizard/import/components/FieldMapping";
import { NotesPreview } from "src/gui/note-transfer-wizard/import/components/NotesPreview";
import { ImportExecution } from "src/gui/note-transfer-wizard/import/components/ImportExecution";
import type { WizardPage } from "@shared/components";
import { commonWizardClasses } from "@shared/classes";

export interface ImportWizardContext {
  readonly notesSelectedToImportCount: number;
  readonly selectedDeckName: string;
}

export interface ImportWizardPageDeps {
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
  readonly highlightKey: number | null;
  readonly initialQuery: string;
  readonly mergeSessionFieldMappings: (
    mappings: Record<string, FieldMap>,
  ) => void;
  readonly notesPreviewPage: number;
  readonly notesPreviewTotalPages: number;
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly previewStatuses: ReturnType<
    typeof useDeckPreview
  >["previewStatuses"];
  readonly selectDeckName: (deckName: string) => void;
  readonly selectedDeckName: string;
  readonly setForcedNoteIds: (ids: Record<number, boolean>) => void;
  readonly setNotesSelectedToImport: (
    selected: Record<number, boolean>,
  ) => void;
  readonly settings: ISettings;
  readonly syncState: {
    readonly syncedMods: Record<number, number>;
  };
  readonly vault: Vault;
  readonly vaultNoteIndex: VaultNoteIndex;
}

interface CompleteImportParams {
  readonly fieldMappings: Record<string, FieldMap>;
  readonly report: ImportExecutionReport;
  readonly saveSettings: () => Promise<void>;
  readonly selectedDeckName: string;
  readonly settings: ISettings;
  readonly vault: Vault;
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

function buildDeckSelectionPage(
  deps: ImportWizardPageDeps,
): WizardPage<ImportWizardContext> {
  return {
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
    title: t("deck.title"),
  };
}

function buildFieldMappingPage(
  deps: ImportWizardPageDeps,
): WizardPage<ImportWizardContext> {
  return {
    render: () => (
      <FieldMapping
        anki={deps.anki}
        className={commonWizardClasses.pageView}
        deckName={deps.selectedDeckName}
        key={deps.selectedDeckName}
        onMappingsChange={deps.mergeSessionFieldMappings}
        savedMappings={{
          ...deps.settings.fieldMappings,
          ...deps.fieldMappings,
        }}
      />
    ),
    title: t("deck.fieldsTitle"),
  };
}

function buildNotesPreviewPage(
  deps: ImportWizardPageDeps,
): WizardPage<ImportWizardContext> {
  return {
    canAdvance: (context) => context.notesSelectedToImportCount > 0,
    render: () => (
      <NotesPreview
        anki={deps.anki}
        className={commonWizardClasses.pageView}
        currentPage={deps.notesPreviewPage}
        deckName={deps.selectedDeckName}
        forcedNoteIds={deps.forcedNoteIds}
        highlightKey={deps.highlightKey}
        initialQuery={deps.initialQuery}
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
    title: t("deck.notesTitle"),
  };
}

function buildImportExecutionPage(
  deps: ImportWizardPageDeps,
): WizardPage<ImportWizardContext> {
  return {
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
    title: t("deck.saveTitle"),
  };
}

export function buildImportWizardPages(
  deps: ImportWizardPageDeps,
): WizardPage<ImportWizardContext>[] {
  return [
    buildDeckSelectionPage(deps),
    buildFieldMappingPage(deps),
    buildNotesPreviewPage(deps),
    buildImportExecutionPage(deps),
  ];
}

export function completeImport({
  fieldMappings,
  report,
  saveSettings,
  selectedDeckName,
  settings,
  vault,
}: CompleteImportParams): void {
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
  settings.fieldMappings = mergeFieldMappings(
    settings.fieldMappings,
    fieldMappings,
  );
  void saveSettings();
  void saveModelPacksFor(vault, fieldMappings);
}
