import { type JSX } from "react";
import { t } from "src/i18n";
import { syncDecisionFor } from "src/services/notes/decision-table";
import { NotesTable, type ColumnDef } from "@shared/components";
import type { NotesTableProps } from "@shared/components/NotesTable";
import { obsidianWinsStrategy } from "@shared/types/ObsidianWinsStrategy";
import { recreateWarning } from "@shared/utils/preview";
import {
  blockSummary,
  countBlocksToRecreate,
  exportRowClassNameFor,
  exportRowDetails,
  isExportSelectedByDefault,
  previewPageSize,
  selectionNotice,
  type ExportableBlock,
  type PreviewQuery,
} from "./exportPreviewHelpers";

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

interface ExportPreviewTableProps {
  readonly classified: ExportableBlock[];
  readonly className: string;
  readonly columns: ColumnDef<ExportableBlock>[];
  readonly currentPage: number;
  readonly emptyMatchText?: string | undefined;
  readonly filteredBlocks: ExportableBlock[];
  readonly forcedNoteIds: Record<number, boolean>;
  readonly highlightKey?: number | null;
  readonly notesSelectedToExport: Record<number, boolean>;
  readonly onForcedNoteIdsChange: (
    forcedNoteIds: Record<number, boolean>,
  ) => void;
  readonly onNotesSelectedToExportChange: (
    notesSelectedToExport: Record<number, boolean>,
  ) => void;
  readonly query: PreviewQuery;
}

type ExportTableProps = Omit<ExportPreviewTableProps, "className">;

function buildExportTableProps(
  params: ExportTableProps,
): NotesTableProps<ExportableBlock> {
  return {
    allItems: params.classified,
    columns: params.columns,
    countText: (selectedCount, total) =>
      t("preview.notesToExport", { selected: selectedCount, total }),
    currentPage: params.currentPage,
    emptyMatchText:
      params.emptyMatchText ??
      t("preview.noSearchMatches", {
        query: params.query.debouncedQuery,
      }),
    forcedNoteIds: params.forcedNoteIds,
    forceStrategy: obsidianWinsStrategy,
    getDefaultSelected: (item) =>
      item.block.id === undefined || isExportSelectedByDefault(item.status),
    getNoteId: (item) => item.rowKey,
    getRow: (item) => syncDecisionFor("export", item.status),
    getRowAriaLabel: (item) =>
      t("preview.selectRow", { summary: blockSummary(item.block) }),
    getRowClassName: exportRowClassNameFor(params.highlightKey ?? null),
    getRowDetails: (item) =>
      exportRowDetails(item, params.forcedNoteIds[item.rowKey] ?? false),
    getRowTitle: (item) => blockSummary(item.block),
    getStatus: (item) => item.status,
    isResurrectable: (item) => item.status === "vaultOnly.ankiDeleted",
    isSelectionLocked: (item) => item.block.id === undefined,
    items: params.filteredBlocks,
    notesSelectedToImport: params.notesSelectedToExport,
    onForceChange: (forced, selected) => {
      params.onForcedNoteIdsChange(forced);
      params.onNotesSelectedToExportChange(selected);
    },
    onSelectionChange: params.onNotesSelectedToExportChange,
    pageSize: previewPageSize,
    resurrectionWarning: recreateWarning(
      countBlocksToRecreate(params.classified, params.forcedNoteIds),
      "Anki",
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

export function ExportPreviewTable({
  className,
  ...tableProps
}: ExportPreviewTableProps): JSX.Element {
  return (
    <div className={className}>
      <NotesTable {...buildExportTableProps(tableProps)} />
    </div>
  );
}
