import { useState, type JSX } from "react";
import type { Vault } from "obsidian";
import { t } from "src/i18n";
import { Anki } from "src/services/anki/anki";
import type { ISettings } from "src/conf/settings";
import { WizardShell, type WizardPage } from "@shared/components";
import { noteTransferWizardClasses } from "@shared/classes";
import type { WizardScope } from "@shared/utils/active-note-scope";
import {
  useExportWizardPages,
  useExportWizardState,
} from "src/gui/note-transfer-wizard/export/use-export-wizard";
import type { ExportWizardContext } from "src/gui/note-transfer-wizard/export/export-wizard-pages";

export interface ExportTransferWizardProps {
  readonly activeScope: WizardScope;
  readonly onCancel: () => void;
  readonly saveSettings: () => Promise<void>;
  readonly settings: ISettings;
  readonly vault: Vault;
}

interface ExportWizardShellProps {
  readonly executionFinished: boolean;
  readonly initialPage: number;
  readonly notesSelectedToExportCount: number;
  readonly notice?: string | undefined;
  readonly onCancel: () => void;
  readonly onPreviewPageChange: (page: number) => void;
  readonly onPreviewReset: () => void;
  readonly pages: WizardPage<ExportWizardContext>[];
  readonly previewPage: number;
  readonly previewTotalPages: number;
  readonly selectedDeckName: string;
}

function countSelected(selected: Record<number, boolean>): number {
  return Object.values(selected).filter(Boolean).length;
}

function ExportWizardShell({
  executionFinished,
  initialPage,
  notesSelectedToExportCount,
  notice,
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
        executionFinished,
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
      initialPage={initialPage}
      notice={notice}
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
  activeScope,
  onCancel,
  saveSettings,
  settings,
  vault,
}: ExportTransferWizardProps): JSX.Element {
  const [anki] = useState(() => new Anki());
  const [executionFinished, setExecutionFinished] = useState(false);
  const state = useExportWizardState(activeScope);

  const failExport = (): void => setExecutionFinished(true);

  const finishExport = (): void => {
    setExecutionFinished(true);
    void saveSettings();
  };

  const pages = useExportWizardPages({
    ...state,
    anki,
    failExport,
    finishExport,
    ignoredDirectories: settings.ignoredDirectories,
    settings,
    vault,
  });

  const notesSelectedToExportCount = countSelected(state.notesSelectedToExport);
  const initialPage = activeScope.kind === "scoped" ? 2 : 1;
  const notice =
    activeScope.kind === "unavailable"
      ? t("preview.scopeUnavailable")
      : undefined;

  return (
    <ExportWizardShell
      executionFinished={executionFinished}
      initialPage={initialPage}
      notesSelectedToExportCount={notesSelectedToExportCount}
      notice={notice}
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
