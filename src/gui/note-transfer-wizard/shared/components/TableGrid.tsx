import { type JSX, type ReactNode } from "react";
import { Switch } from "src/gui/components/Switch";
import { t } from "src/i18n";
import type { SyncDecisionRow } from "src/services/notes/decision-table";
import {
  clearForceAllOnPage,
  forceAllOnPage,
  isRowSelectable,
  selectionCheckState,
  setSelectableOnPage,
  type PageRowSelection,
} from "../utils/note-selection";
import { Checkbox } from "./Checkbox";
import { List } from "./List";
import { NoteRow } from "./NoteRow";
import type { NoteDetailsData } from "./NoteDetails";
import type { ColumnDef } from "./table-types";

interface SelectAllHeaderProps {
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly onSelectionChange: (selected: Record<number, boolean>) => void;
  readonly pageRows: PageRowSelection[];
}

function SelectAllHeader({
  notesSelectedToImport,
  onSelectionChange,
  pageRows,
}: SelectAllHeaderProps): JSX.Element {
  const selectableRows = pageRows.filter(isRowSelectable);
  const selectAllState = selectionCheckState(
    selectableRows.filter((row) => row.isSelected).length,
    selectableRows.length,
  );
  return (
    <Checkbox
      ariaLabel={t("preview.selectAllOnPage")}
      checked={selectAllState.checked}
      disabled={selectAllState.disabled}
      indeterminate={selectAllState.indeterminate}
      onChange={(isNowChecked) =>
        onSelectionChange(
          setSelectableOnPage(pageRows, notesSelectedToImport, isNowChecked),
        )
      }
    />
  );
}

interface ForceAllHeaderProps {
  readonly forcedNoteIds: Record<number, boolean>;
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly onForceChange: (
    forced: Record<number, boolean>,
    selected: Record<number, boolean>,
  ) => void;
  readonly pageRows: PageRowSelection[];
}

function ForceAllHeader({
  forcedNoteIds,
  notesSelectedToImport,
  onForceChange,
  pageRows,
}: ForceAllHeaderProps): JSX.Element {
  const forceableRows = pageRows.filter((row) => row.isForceable);
  const forcedRows = forceableRows.filter((row) => row.isForced);
  return (
    <Switch
      ariaLabel={t("preview.forceAllOnPage")}
      checked={
        forceableRows.length > 0 && forcedRows.length === forceableRows.length
      }
      disabled={forceableRows.length === 0}
      indeterminate={
        forcedRows.length > 0 && forcedRows.length < forceableRows.length
      }
      onChange={(isNowForced) => {
        const next = isNowForced
          ? forceAllOnPage(pageRows, forcedNoteIds, notesSelectedToImport)
          : clearForceAllOnPage(pageRows, forcedNoteIds, notesSelectedToImport);
        onForceChange(next.forced, next.selected);
      }}
    />
  );
}

function gridHeaders<T>(columns: ColumnDef<T>[]): string[] {
  return [
    "",
    t("preview.selectColumn"),
    t("preview.forceColumn"),
    ...columns.map((column) => column.header),
  ];
}

function gridColumnWidths<T>(columns: ColumnDef<T>[]): string {
  return [
    "auto",
    "auto",
    "auto",
    ...columns.map((column) => column.width),
  ].join(" ");
}

interface TableGridProps<T> {
  readonly columns: ColumnDef<T>[];
  readonly expandedIds: Set<number>;
  readonly forcedNoteIds: Record<number, boolean>;
  readonly getDefaultSelected: (item: T) => boolean;
  readonly getNoteId: (item: T) => number;
  readonly getRow: (item: T) => SyncDecisionRow;
  readonly getRowAriaLabel: (item: T) => string;
  readonly getRowClassName: (item: T) => string | undefined;
  readonly getRowDetails: (item: T) => NoteDetailsData;
  readonly getRowTitle: (item: T) => string;
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly onExpandedChange: (noteId: number) => void;
  readonly onForceChange: (
    forced: Record<number, boolean>,
    selected: Record<number, boolean>,
  ) => void;
  readonly onSelectionChange: (selected: Record<number, boolean>) => void;
  readonly pageNotes: T[];
  readonly pageRows: PageRowSelection[];
}

function noteRowElements<T>(props: TableGridProps<T>): ReactNode[] {
  return props.pageRows.map((row, index) => {
    const item = props.pageNotes[index];
    if (item === undefined) {
      return null;
    }
    return (
      <NoteRow
        columns={props.columns}
        forcedNoteIds={props.forcedNoteIds}
        getDefaultSelected={props.getDefaultSelected}
        getNoteId={props.getNoteId}
        getRow={props.getRow}
        getRowAriaLabel={props.getRowAriaLabel}
        getRowClassName={props.getRowClassName}
        getRowDetails={props.getRowDetails}
        getRowTitle={props.getRowTitle}
        index={index}
        isExpanded={props.expandedIds.has(row.id)}
        isForced={row.isForced}
        isSelectable={isRowSelectable(row)}
        isSelected={row.isSelected}
        item={item}
        key={row.id}
        notesSelectedToImport={props.notesSelectedToImport}
        onExpandedChange={props.onExpandedChange}
        onForcedChange={props.onForceChange}
        onSelectedChange={props.onSelectionChange}
      />
    );
  });
}

export function TableGrid<T>(props: TableGridProps<T>): JSX.Element {
  return (
    <List
      columns={gridHeaders(props.columns)}
      columnWidths={gridColumnWidths(props.columns)}
      headerControls={[
        undefined,
        <SelectAllHeader
          key="select-all"
          notesSelectedToImport={props.notesSelectedToImport}
          onSelectionChange={props.onSelectionChange}
          pageRows={props.pageRows}
        />,
        <ForceAllHeader
          forcedNoteIds={props.forcedNoteIds}
          key="force-all"
          notesSelectedToImport={props.notesSelectedToImport}
          onForceChange={props.onForceChange}
          pageRows={props.pageRows}
        />,
      ]}
      role="grid"
    >
      {noteRowElements(props)}
    </List>
  );
}
