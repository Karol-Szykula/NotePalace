import { type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { t } from "src/i18n";
import { commonWizardClasses } from "@shared/classes";
import { ExportPreviewTable, PreviewMessage } from "./ExportPreviewTable";
import type { NotesPreviewProps } from "./exportPreviewHelpers";
import { useExportPreview } from "./useExportPreview";

export type { NotesPreviewProps };

export function NotesPreview(props: NotesPreviewProps): JSX.Element {
  const rootClassName = mergeClasses(
    commonWizardClasses.pageView,
    props.className,
  );
  const preview = useExportPreview(props);
  const emptyMatchText =
    props.initialQuery === undefined || props.initialQuery === ""
      ? undefined
      : t("preview.scopedNoMatch", { deck: props.deckName });

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
    <ExportPreviewTable
      classified={preview.classified}
      className={rootClassName}
      columns={preview.columns}
      currentPage={props.currentPage}
      emptyMatchText={emptyMatchText}
      filteredBlocks={preview.filteredBlocks}
      forcedNoteIds={props.forcedNoteIds}
      highlightKey={props.highlightKey ?? null}
      notesSelectedToExport={props.notesSelectedToExport}
      onForcedNoteIdsChange={props.onForcedNoteIdsChange}
      onNotesSelectedToExportChange={props.onNotesSelectedToExportChange}
      query={preview.query}
    />
  );
}
