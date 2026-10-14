import { type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { t } from "src/i18n";
import { commonWizardClasses } from "@shared/classes";
import { ImportPreviewTable, PreviewMessage } from "./ImportPreviewTable";
import type { NotesPreviewProps } from "./importPreviewHelpers";
import { useImportPreview } from "./useImportPreview";

export type { NotesPreviewProps };

export function NotesPreview(props: NotesPreviewProps): JSX.Element {
  const rootClassName = mergeClasses(
    commonWizardClasses.pageView,
    props.className,
  );
  const preview = useImportPreview(props);

  if (preview.loadError) {
    return (
      <PreviewMessage className={rootClassName} text={preview.loadError} />
    );
  }
  if (!preview.classified) {
    return (
      <PreviewMessage
        className={rootClassName}
        text={preview.progress || t("preview.loading")}
      />
    );
  }

  return (
    <ImportPreviewTable
      classified={preview.classified}
      className={rootClassName}
      columns={preview.columns}
      currentPage={props.currentPage}
      filteredNotes={preview.filteredNotes}
      forcedNoteIds={props.forcedNoteIds}
      notesSelectedToImport={props.notesSelectedToImport}
      onForcedNoteIdsChange={props.onForcedNoteIdsChange}
      onNotesSelectedToImportChange={props.onNotesSelectedToImportChange}
      query={preview.query}
    />
  );
}
