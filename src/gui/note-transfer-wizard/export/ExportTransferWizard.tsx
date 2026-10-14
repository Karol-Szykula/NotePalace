import { useMemo, useState, type JSX } from "react";
import type { Vault } from "obsidian";
import { t } from "src/i18n";
import { Anki } from "src/services/anki/anki";
import type { ISettings } from "src/conf/settings";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import type { ExportReport } from "src/services/commands/export-deck";
import { DeckSelection } from "src/gui/note-transfer-wizard/export/components/DeckSelection";
import { NotesPreview } from "src/gui/note-transfer-wizard/export/components/NotesPreview";
import { ExportExecution } from "src/gui/note-transfer-wizard/export/components/ExportExecution";
import { WizardShell, type WizardPage } from "@shared/components";
import {
  commonWizardClasses,
  noteTransferWizardClasses,
} from "@shared/classes";

export interface ExportTransferWizardProps {
  readonly onCancel: () => void;
  readonly saveSettings: () => Promise<void>;
  readonly settings: ISettings;
  readonly vault: Vault;
}

interface ExportWizardContext {
  readonly notesSelectedToExportCount: number;
  readonly selectedDeckName: string;
}

interface ExportWizardPageDeps {
  readonly anki: Anki;
  readonly finishExport: (report: ExportReport) => void;
  readonly forcedNoteIds: Record<number, boolean>;
  readonly handleNotesPreviewPageChange: (page: number) => void;
  readonly handleNotesPreviewTotalPagesChange: (totalPages: number) => void;
  readonly handleStatusesLoaded: (
    statuses: Record<number, NoteLifecycleStatus>,
  ) => void;
  readonly ignoredDirectories: string;
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

interface ExportWizardShellProps {
  readonly notesSelectedToExportCount: number;
  readonly onCancel: () => void;
  readonly onPreviewPageChange: (page: number) => void;
  readonly onPreviewReset: () => void;
  readonly pages: WizardPage<ExportWizardContext>[];
  readonly previewPage: number;
  readonly previewTotalPages: number;
  readonly selectedDeckName: string;
}

interface ExportWizardState {
  readonly forcedNoteIds: Record<number, boolean>;
  readonly handleNotesPreviewPageChange: (page: number) => void;
  readonly handleNotesPreviewTotalPagesChange: (totalPages: number) => void;
  readonly handleStatusesLoaded: (
    statuses: Record<number, NoteLifecycleStatus>,
  ) => void;
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

function countSelected(selected: Record<number, boolean>): number {
  return Object.values(selected).filter(Boolean).length;
}

function buildExportWizardPages(
  deps: ExportWizardPageDeps,
): WizardPage<ExportWizardContext>[] {
  return [
    {
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
    },
    {
      canAdvance: (context) => context.notesSelectedToExportCount > 0,
      render: () => (
        <NotesPreview
          anki={deps.anki}
          className={commonWizardClasses.pageView}
          currentPage={deps.notesPreviewPage}
          deckName={deps.selectedDeckName}
          forcedNoteIds={deps.forcedNoteIds}
          ignoredDirectories={deps.ignoredDirectories}
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
    },
    {
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
    },
  ];
}

function useExportWizardState(): ExportWizardState {
  const [selectedDeckName, setSelectedDeckName] = useState("");
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

function useExportWizardPages(
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
      deps.ignoredDirectories,
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

function ExportWizardShell({
  notesSelectedToExportCount,
  onCancel,
  onPreviewPageChange,
  onPreviewReset,
  pages,
  previewPage,
  previewTotalPages,
  selectedDeckName,
}: ExportWizardShellProps): JSX.Element {
  return (
    <WizardShell
      className={noteTransferWizardClasses.modal}
      getContext={() => ({
        notesSelectedToExportCount,
        selectedDeckName,
      })}
      getNextLabel={(page) => (page === 2 ? t("wizard.export") : undefined)}
      getPagination={(page) =>
        page === 2
          ? {
              currentPage: previewPage,
              onPageChange: onPreviewPageChange,
              totalPages: previewTotalPages,
            }
          : undefined
      }
      initialPage={1}
      onBeforeAdvance={(fromPage) => {
        if (fromPage === 2) {
          onPreviewReset();
        }
      }}
      onCancel={onCancel}
      pages={pages}
    />
  );
}

export function ExportTransferWizard({
  onCancel,
  saveSettings,
  settings,
  vault,
}: ExportTransferWizardProps): JSX.Element {
  const [anki] = useState(() => new Anki());
  const state = useExportWizardState();

  const finishExport = (): void => {
    void saveSettings();
  };

  const pages = useExportWizardPages({
    ...state,
    anki,
    finishExport,
    ignoredDirectories: settings.ignoredDirectories,
    settings,
    vault,
  });

  const notesSelectedToExportCount = countSelected(state.notesSelectedToExport);

  return (
    <ExportWizardShell
      notesSelectedToExportCount={notesSelectedToExportCount}
      onCancel={onCancel}
      onPreviewPageChange={state.handleNotesPreviewPageChange}
      onPreviewReset={state.reset}
      pages={pages}
      previewPage={state.notesPreviewPage}
      previewTotalPages={state.notesPreviewTotalPages}
      selectedDeckName={state.selectedDeckName}
    />
  );
}
