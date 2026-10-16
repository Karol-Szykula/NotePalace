import { useState, type JSX } from "react";
import { t } from "src/i18n";
import type { Vault } from "obsidian";
import { Anki } from "src/services/anki/anki";
import type { ISettings } from "src/conf/settings";
import { useDeckPreview } from "src/gui/note-transfer-wizard/import/use-deck-preview";
import { type ImportWizardContext } from "src/gui/note-transfer-wizard/import/import-wizard-pages";
import {
  useImportCompletion,
  useImportFieldMappings,
  useImportPreviewPagination,
  useImportSelection,
  useImportSyncState,
  useImportWizardPages,
  useVaultNoteIndexLoader,
} from "src/gui/note-transfer-wizard/import/use-import-wizard";
import { WizardShell, type WizardPage } from "@shared/components";
import { noteTransferWizardClasses } from "@shared/classes";
import type { WizardScope } from "@shared/utils/active-note-scope";

export interface NotesImportWizardProps {
  readonly activeScope: WizardScope;
  readonly onCancel: () => void;
  readonly saveSettings: () => Promise<void>;
  readonly settings: ISettings;
  readonly vault: Vault;
}

interface ImportWizardShellProps {
  readonly executionFinished: boolean;
  readonly initialPage: number;
  readonly notesSelectedToImportCount: number;
  readonly notice?: string | undefined;
  readonly onCancel: () => void;
  readonly onPreviewPageChange: (page: number) => void;
  readonly onPreviewReset: () => void;
  readonly pages: WizardPage<ImportWizardContext>[];
  readonly previewPage: number;
  readonly previewTotalPages: number;
  readonly selectedDeckName: string;
}

function countSelected(selected: Record<number, boolean>): number {
  return Object.values(selected).filter(Boolean).length;
}

function ImportWizardShell({
  executionFinished,
  initialPage,
  notesSelectedToImportCount,
  notice,
  onCancel,
  onPreviewPageChange,
  onPreviewReset,
  pages,
  previewPage,
  previewTotalPages,
  selectedDeckName,
}: ImportWizardShellProps): JSX.Element {
  return (
    <WizardShell
      className={noteTransferWizardClasses.modal}
      getContext={() => ({
        executionFinished,
        notesSelectedToImportCount,
        selectedDeckName,
      })}
      getNextLabel={(page) => (page === 3 ? t("wizard.import") : undefined)}
      getPagination={(page) =>
        page === 3
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
        if (fromPage === 3) {
          onPreviewReset();
        }
      }}
      onCancel={onCancel}
      pages={pages}
    />
  );
}

export function NotesImportWizard({
  activeScope,
  onCancel,
  saveSettings,
  settings,
  vault,
}: NotesImportWizardProps): JSX.Element {
  const [anki] = useState(() => new Anki());
  const selection = useImportSelection(activeScope);
  const fieldMapping = useImportFieldMappings();
  const preview = useImportPreviewPagination();
  const vaultNoteIndex = useVaultNoteIndexLoader(vault, settings);
  const { deckNotes, handleNotesLoaded, previewStatuses } = useDeckPreview();
  const syncState = useImportSyncState(settings.noteLifecycle);
  const completion = useImportCompletion({
    fieldMappings: fieldMapping.fieldMappings,
    saveSettings,
    selectedDeckName: selection.selectedDeckName,
    settings,
    vault,
  });

  const pages = useImportWizardPages({
    ...completion,
    ...fieldMapping,
    ...preview,
    ...selection,
    anki,
    deckNotes,
    handleNotesLoaded,
    previewStatuses,
    settings,
    syncState,
    vault,
    vaultNoteIndex,
  });

  const notesSelectedToImportCount = countSelected(
    selection.notesSelectedToImport,
  );
  const initialPage = activeScope.kind === "scoped" ? 3 : 1;
  const notice =
    activeScope.kind === "unavailable"
      ? t("preview.scopeUnavailable")
      : undefined;

  return (
    <ImportWizardShell
      executionFinished={completion.executionFinished}
      initialPage={initialPage}
      notesSelectedToImportCount={notesSelectedToImportCount}
      notice={notice}
      onCancel={onCancel}
      onPreviewPageChange={preview.handleNotesPreviewPageChange}
      onPreviewReset={preview.reset}
      pages={pages}
      previewPage={preview.notesPreviewPage}
      previewTotalPages={preview.notesPreviewTotalPages}
      selectedDeckName={selection.selectedDeckName}
    />
  );
}
