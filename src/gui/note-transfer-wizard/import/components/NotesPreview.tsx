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
  const emptyMatchText =
    props.initialQuery !== undefined &&
    props.initialQuery !== "" &&
    preview.query.query === props.initialQuery
      ? t("preview.scopedNoMatch", { deck: props.deckName })
      : undefined;

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
      emptyMatchText={emptyMatchText}
      filteredNotes={preview.filteredNotes}
      forcedNoteIds={props.forcedNoteIds}
      highlightKey={props.highlightKey ?? null}
      notesSelectedToImport={props.notesSelectedToImport}
      onForcedNoteIdsChange={props.onForcedNoteIdsChange}
      onNotesSelectedToImportChange={props.onNotesSelectedToImportChange}
      query={preview.query}
    />
  );
}
