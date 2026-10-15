import { t } from "src/i18n";
import type { Vault } from "obsidian";
import type { Anki } from "src/services/anki/anki";
import type { ISettings } from "src/conf/settings";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import type { ExportReport } from "src/services/commands/export-deck";
import { DeckSelection } from "src/gui/note-transfer-wizard/export/components/DeckSelection";
import { NotesPreview } from "src/gui/note-transfer-wizard/export/components/NotesPreview";
import { ExportExecution } from "src/gui/note-transfer-wizard/export/components/ExportExecution";
import type { WizardPage } from "@shared/components";
import { commonWizardClasses } from "@shared/classes";

export interface ExportWizardContext {
  readonly notesSelectedToExportCount: number;
  readonly selectedDeckName: string;
}

export interface ExportWizardPageDeps {
  readonly anki: Anki;
  readonly finishExport: (report: ExportReport) => void;
  readonly forcedNoteIds: Record<number, boolean>;
  readonly handleNotesPreviewPageChange: (page: number) => void;
  readonly handleNotesPreviewTotalPagesChange: (totalPages: number) => void;
  readonly handleStatusesLoaded: (
    statuses: Record<number, NoteLifecycleStatus>,
  ) => void;
  readonly highlightKey: number | null;
  readonly ignoredDirectories: string;
  readonly initialQuery: string;
  readonly notesPreviewPage: number;
  readonly notesPreviewTotalPages: number;
  readonly notesSelectedToExport: Record<number, boolean>;
  readonly previewStatuses: Record<number, NoteLifecycleStatus>;
  readonly selectDeckName: (deckName: string) => void;
  readonly selectedDeckName: string;
  readonly setForcedNoteIds: (ids: Record<number, boolean>) => void;
  readonly setNotesSelectedToExport: (
    selected: Record<number, boolean>,
  ) => void;
  readonly settings: ISettings;
  readonly vault: Vault;
}

function buildDeckSelectionPage(
  deps: ExportWizardPageDeps,
): WizardPage<ExportWizardContext> {
  return {
    canAdvance: (context) => context.selectedDeckName !== "",
    render: () => (
      <DeckSelection
        className={commonWizardClasses.pageView}
        ignoredDirectories={deps.ignoredDirectories}
        onSelectDeckName={deps.selectDeckName}
        selectedDeckName={deps.selectedDeckName}
        vault={deps.vault}
      />
    ),
    title: t("deck.title"),
  };
}

function buildNotesPreviewPage(
  deps: ExportWizardPageDeps,
): WizardPage<ExportWizardContext> {
  return {
    canAdvance: (context) => context.notesSelectedToExportCount > 0,
    render: () => (
      <NotesPreview
        anki={deps.anki}
        className={commonWizardClasses.pageView}
        currentPage={deps.notesPreviewPage}
        deckName={deps.selectedDeckName}
        forcedNoteIds={deps.forcedNoteIds}
        highlightKey={deps.highlightKey}
        ignoredDirectories={deps.ignoredDirectories}
        initialQuery={deps.initialQuery}
        key={deps.selectedDeckName}
        noteLifecycle={deps.settings.noteLifecycle}
        notesSelectedToExport={deps.notesSelectedToExport}
        onForcedNoteIdsChange={deps.setForcedNoteIds}
        onNotesSelectedToExportChange={deps.setNotesSelectedToExport}
        onPageChange={deps.handleNotesPreviewPageChange}
        onStatusesLoaded={deps.handleStatusesLoaded}
        onTotalPagesChange={deps.handleNotesPreviewTotalPagesChange}
        totalPages={deps.notesPreviewTotalPages}
        vault={deps.vault}
      />
    ),
    title: t("deck.notesTitle"),
  };
}

function buildExportExecutionPage(
  deps: ExportWizardPageDeps,
): WizardPage<ExportWizardContext> {
  return {
    render: () => (
      <ExportExecution
        anki={deps.anki}
        className={commonWizardClasses.pageView}
        forcedNoteIds={deps.forcedNoteIds}
        ignoredDirectories={deps.ignoredDirectories}
        key={deps.selectedDeckName}
        notesSelectedToExport={deps.notesSelectedToExport}
        onFinish={deps.finishExport}
        previewStatuses={deps.previewStatuses}
        settings={deps.settings}
        vault={deps.vault}
      />
    ),
    title: t("deck.saveTitle"),
  };
}

export function buildExportWizardPages(
  deps: ExportWizardPageDeps,
): WizardPage<ExportWizardContext>[] {
  return [
    buildDeckSelectionPage(deps),
    buildNotesPreviewPage(deps),
    buildExportExecutionPage(deps),
  ];
}
