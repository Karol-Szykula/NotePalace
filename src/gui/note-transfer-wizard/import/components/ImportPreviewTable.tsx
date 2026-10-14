import { type JSX } from "react";
import { t } from "src/i18n";
import type { ClassifiedNote } from "src/services/commands/import-deck";
import { syncDecisionFor } from "src/services/notes/decision-table";
import { NotesTable, type ColumnDef } from "@shared/components";
import type { NotesTableProps } from "@shared/components/NotesTable";
import { ankiWinsStrategy } from "@shared/types/AnkiWinsStrategy";
import {
  countNotesToResurrect,
  importRowClassName,
  importRowDetails,
  isImportSelectedByDefault,
  noteSummary,
  previewPageSize,
  resurrectionWarning,
  selectionNotice,
  type PreviewQuery,
} from "./importPreviewHelpers";

interface PreviewMessageProps {
  readonly className: string;
  readonly text: string;
}

export function PreviewMessage({
  className,
  text,
}: PreviewMessageProps): JSX.Element {
  return (
    <div className={className}>
      <p>{text}</p>
    </div>
  );
}

interface ImportPreviewTableProps {
  readonly classified: ClassifiedNote[];
  readonly className: string;
  readonly columns: ColumnDef<ClassifiedNote>[];
  readonly currentPage: number;
  readonly filteredNotes: ClassifiedNote[];
  readonly forcedNoteIds: Record<number, boolean>;
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly onForcedNoteIdsChange: (
    forcedNoteIds: Record<number, boolean>,
  ) => void;
  readonly onNotesSelectedToImportChange: (
    notesSelectedToImport: Record<number, boolean>,
  ) => void;
  readonly query: PreviewQuery;
}

type ImportTableProps = Omit<ImportPreviewTableProps, "className">;

function buildImportTableProps(
  params: ImportTableProps,
): NotesTableProps<ClassifiedNote> {
  return {
    allItems: params.classified,
    columns: params.columns,
    currentPage: params.currentPage,
    emptyMatchText: t("preview.noSearchMatches", {
      query: params.query.debouncedQuery,
    }),
    forcedNoteIds: params.forcedNoteIds,
    forceStrategy: ankiWinsStrategy,
    getDefaultSelected: (item) => isImportSelectedByDefault(item.status),
    getNoteId: (item) => item.note.noteId,
    getRow: (item) => syncDecisionFor("import", item.status),
    getRowAriaLabel: (item) =>
      t("preview.selectRow", { summary: noteSummary(item.note) }),
    getRowClassName: importRowClassName,
    getRowDetails: (item) =>
      importRowDetails(item, params.forcedNoteIds[item.note.noteId] ?? false),
    getRowTitle: (item) => noteSummary(item.note),
    getStatus: (item) => item.status,
    isResurrectable: (item) => item.previewStatus === "noFile",
    items: params.filteredNotes,
    notesSelectedToImport: params.notesSelectedToImport,
    onForceChange: (forced, selected) => {
      params.onForcedNoteIdsChange(forced);
      params.onNotesSelectedToImportChange(selected);
    },
    onSelectionChange: params.onNotesSelectedToImportChange,
    pageSize: previewPageSize,
    resurrectionWarning: resurrectionWarning(
      countNotesToResurrect(params.classified, params.forcedNoteIds),
    ),
    search: {
      label: t("preview.searchLabel"),
      onChange: params.query.onQueryChange,
      onClear: params.query.onQueryClear,
      placeholder: t("preview.searchPlaceholder"),
      value: params.query.query,
    },
    selectionNotice: selectionNotice(params.classified),
  };
}

export function ImportPreviewTable({
  className,
  ...tableProps
}: ImportPreviewTableProps): JSX.Element {
  return (
    <div className={className}>
      <NotesTable {...buildImportTableProps(tableProps)} />
    </div>
  );
}
