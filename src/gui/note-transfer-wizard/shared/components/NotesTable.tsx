import { useMemo, type JSX, type ReactNode } from "react";
import { mergeClasses } from "src/gui/classes";
import { Switch } from "src/gui/components/Switch";
import { t } from "src/i18n";
import type { SyncDecisionRow } from "src/services/notes/decision-table";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import { listClasses } from "../classes/common";
import { forcedOutcomeText, type ForceStrategy } from "../types/forceStrategy";
import {
  clearForceAllOnPage,
  forceAllOnPage,
  isRowSelectable,
  leftToDecide,
  pageSelection,
  selectedCount,
  selectionCheckState,
  setNoteForced,
  setNoteSelected,
  setSelectableOnPage,
} from "../utils/note-selection";
import { Checkbox } from "./Checkbox";
import { List } from "./List";
import { ListRow } from "./ListRow";

export interface ColumnDef<T> {
  readonly header: string;
  readonly render: (item: T, index: number) => ReactNode;
  readonly width: string;
}

interface NoteRowProps<T> {
  readonly columns: ColumnDef<T>[];
  readonly forcedNoteIds: Record<number, boolean>;
  readonly getDefaultSelected: (item: T) => boolean;
  readonly getNoteId: (item: T) => number;
  readonly getRow: (item: T) => SyncDecisionRow;
  readonly getRowAriaLabel: (item: T) => string;
  readonly getRowClassName: (item: T) => string | undefined;
  readonly index: number;
  readonly isForced: boolean;
  readonly isSelectable: boolean;
  readonly isSelected: boolean;
  readonly item: T;
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly onForcedChange: (
    forced: Record<number, boolean>,
    selected: Record<number, boolean>,
  ) => void;
  readonly onSelectedChange: (selected: Record<number, boolean>) => void;
}

function NoteRow<T>({
  item,
  index,
  columns,
  forcedNoteIds,
  isForced,
  isSelected,
  isSelectable,
  onForcedChange,
  onSelectedChange,
  getNoteId,
  getRow,
  getRowAriaLabel,
  getRowClassName,
  getDefaultSelected,
  notesSelectedToImport,
}: NoteRowProps<T>): JSX.Element {
  const noteId = getNoteId(item);
  return (
    <ListRow
      cells={[
        <Checkbox
          ariaLabel={getRowAriaLabel(item)}
          checked={isSelected}
          disabled={!isSelectable}
          key="select"
          onChange={(isNowSelected) =>
            onSelectedChange(
              setNoteSelected(notesSelectedToImport, noteId, isNowSelected),
            )
          }
        />,
        <Switch
          ariaLabel={
            forcedOutcomeText(getRow(item)) ?? t("preview.forceColumn")
          }
          checked={isForced}
          key="force"
          onChange={(isNowForced) => {
            const next = setNoteForced(
              forcedNoteIds,
              notesSelectedToImport,
              noteId,
              isNowForced,
              getDefaultSelected(item),
            );
            onForcedChange(next.forced, next.selected);
          }}
        />,
        ...columns.map((col, colIndex) => (
          <div key={colIndex}>{col.render(item, index)}</div>
        )),
      ]}
      className={mergeClasses(listClasses.listRow, getRowClassName(item))}
      key={noteId}
    />
  );
}

export interface NotesTableProps<T> {
  readonly columns: ColumnDef<T>[];
  readonly countText?: (selectedCount: number, total: number) => string;
  readonly currentPage: number;
  readonly forcedNoteIds: Record<number, boolean>;
  readonly forceStrategy: ForceStrategy;
  readonly getDefaultSelected: (item: T) => boolean;
  readonly getNoteId: (item: T) => number;
  readonly getRow: (item: T) => SyncDecisionRow;
  readonly getRowAriaLabel: (item: T) => string;
  readonly getRowClassName?: (item: T) => string | undefined;
  readonly getStatus: (item: T) => NoteLifecycleStatus;
  readonly isResurrectable: (item: T) => boolean;
  readonly isSelectionLocked?: (item: T) => boolean | undefined;
  readonly items: T[];
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly onForceChange: (
    forced: Record<number, boolean>,
    selected: Record<number, boolean>,
  ) => void;
  readonly onSelectionChange: (selected: Record<number, boolean>) => void;
  readonly pageSize: number;
  readonly resurrectionWarning?: string | undefined;
  readonly selectionNotice?: string | undefined;
}

export function NotesTable<T>({
  items,
  currentPage,
  pageSize,
  columns,
  countText = (selectedCount: number, total: number) =>
    t("preview.notesToImport", { selected: selectedCount, total }),
  getDefaultSelected,
  getNoteId,
  getRow,
  getRowAriaLabel,
  getRowClassName,
  getStatus,
  isResurrectable,
  isSelectionLocked,
  forceStrategy,
  selectionNotice,
  resurrectionWarning,
  forcedNoteIds,
  onForceChange,
  onSelectionChange,
  notesSelectedToImport,
}: NotesTableProps<T>): JSX.Element {
  const projection = useMemo(
    () => ({
      getNoteId,
      getDefaultSelected,
      getStatus,
      forceStrategy,
      isSelectionLocked,
    }),
    [
      getNoteId,
      getDefaultSelected,
      getStatus,
      forceStrategy,
      isSelectionLocked,
    ],
  );
  const allRows = useMemo(
    () =>
      pageSelection(items, notesSelectedToImport, forcedNoteIds, projection),
    [items, notesSelectedToImport, forcedNoteIds, projection],
  );
  const pageNotes = useMemo(
    () =>
      items.slice(currentPage * pageSize, currentPage * pageSize + pageSize),
    [items, currentPage, pageSize],
  );
  const pageRows = useMemo(
    () =>
      pageSelection(
        pageNotes,
        notesSelectedToImport,
        forcedNoteIds,
        projection,
      ),
    [pageNotes, notesSelectedToImport, forcedNoteIds, projection],
  );
  const selectableRows = pageRows.filter(isRowSelectable);
  const selectAllState = selectionCheckState(
    selectableRows.filter((row) => row.isSelected).length,
    selectableRows.length,
  );
  const forceableRows = pageRows.filter((row) => row.isForceable);
  const forcedRows = forceableRows.filter((row) => row.isForced);
  const notesLeftToDecide = leftToDecide(allRows);
  const resurrectableLeft = items.some(
    (item) =>
      !getDefaultSelected(item) &&
      !forcedNoteIds[getNoteId(item)] &&
      isResurrectable(item),
  );

  if (items.length === 0) {
    return (
      <div>
        <p>{t("preview.noNotes")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className={listClasses.listToolbar}>
        <p className={listClasses.listToolbarCount}>
          {countText(selectedCount(allRows), items.length)}
        </p>
        {selectionNotice && notesLeftToDecide.length > 0 && (
          <p className={listClasses.listToolbarBanner}>{selectionNotice}</p>
        )}
      </div>
      {resurrectionWarning && resurrectableLeft && (
        <p className={listClasses.listToolbarBanner}>{resurrectionWarning}</p>
      )}
      <List
        columns={[
          t("preview.selectColumn"),
          t("preview.forceColumn"),
          ...columns.map((column) => column.header),
        ]}
        columnWidths={[
          "auto",
          "auto",
          ...columns.map((column) => column.width),
        ].join(" ")}
        headerControls={[
          <Checkbox
            ariaLabel={t("preview.selectAllOnPage")}
            checked={selectAllState.checked}
            disabled={selectAllState.disabled}
            indeterminate={selectAllState.indeterminate}
            key="select-all"
            onChange={(isNowChecked) =>
              onSelectionChange(
                setSelectableOnPage(
                  pageRows,
                  notesSelectedToImport,
                  isNowChecked,
                ),
              )
            }
          />,
          <Switch
            ariaLabel={t("preview.forceAllOnPage")}
            checked={
              forceableRows.length > 0 &&
              forcedRows.length === forceableRows.length
            }
            disabled={forceableRows.length === 0}
            indeterminate={
              forcedRows.length > 0 && forcedRows.length < forceableRows.length
            }
            key="force-all"
            onChange={(isNowForced) => {
              const next = isNowForced
                ? forceAllOnPage(pageRows, forcedNoteIds, notesSelectedToImport)
                : clearForceAllOnPage(
                    pageRows,
                    forcedNoteIds,
                    notesSelectedToImport,
                  );
              onForceChange(next.forced, next.selected);
            }}
          />,
        ]}
      >
        {pageRows.map((row, index) => {
          const item = pageNotes[index];
          if (item === undefined) {
            return null;
          }
          return (
            <NoteRow
              columns={columns}
              forcedNoteIds={forcedNoteIds}
              getDefaultSelected={getDefaultSelected}
              getNoteId={getNoteId}
              getRow={getRow}
              getRowAriaLabel={getRowAriaLabel}
              getRowClassName={getRowClassName ?? (() => undefined)}
              index={index}
              isForced={row.isForced}
              isSelectable={isRowSelectable(row)}
              isSelected={row.isSelected}
              item={item}
              key={row.id}
              notesSelectedToImport={notesSelectedToImport}
              onForcedChange={onForceChange}
              onSelectedChange={onSelectionChange}
            />
          );
        })}
      </List>
    </div>
  );
}
