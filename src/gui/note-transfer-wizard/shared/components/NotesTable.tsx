import { useMemo, useState, type JSX, type ReactNode } from "react";
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
  type PageRowSelection,
} from "../utils/note-selection";
import { Checkbox } from "./Checkbox";
import { List } from "./List";
import { ListRow } from "./ListRow";
import { NoteDetails, type NoteDetailsData } from "./NoteDetails";
import { SearchBox, type SearchBoxProps } from "./SearchBox";

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
  readonly getRowDetails: (item: T) => NoteDetailsData;
  readonly getRowTitle: (item: T) => string;
  readonly index: number;
  readonly isExpanded: boolean;
  readonly isForced: boolean;
  readonly isSelectable: boolean;
  readonly isSelected: boolean;
  readonly item: T;
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly onExpandedChange: (noteId: number) => void;
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
  isExpanded,
  forcedNoteIds,
  isForced,
  isSelected,
  isSelectable,
  onExpandedChange,
  onForcedChange,
  onSelectedChange,
  getNoteId,
  getRow,
  getRowAriaLabel,
  getRowClassName,
  getRowDetails,
  getRowTitle,
  getDefaultSelected,
  notesSelectedToImport,
}: NoteRowProps<T>): JSX.Element {
  const noteId = getNoteId(item);
  const summary = getRowTitle(item);
  return (
    <ListRow
      cellRole="gridcell"
      cells={[
        <button
          aria-expanded={isExpanded}
          aria-label={
            isExpanded
              ? t("preview.collapseRow", { summary })
              : t("preview.expandRow", { summary })
          }
          className={mergeClasses(
            listClasses.listRowToggle,
            isExpanded ? listClasses.listRowToggleExpanded : undefined,
          )}
          key="expand"
          onClick={() => onExpandedChange(noteId)}
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="none"
            height="12"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            viewBox="0 0 16 16"
            width="12"
          >
            <path d="M6 3l5 5-5 5" />
          </svg>
        </button>,
        <span className={listClasses.listControlCell} key="select">
          <Checkbox
            ariaLabel={getRowAriaLabel(item)}
            checked={isSelected}
            disabled={!isSelectable}
            onChange={(isNowSelected) =>
              onSelectedChange(
                setNoteSelected(notesSelectedToImport, noteId, isNowSelected),
              )
            }
          />
        </span>,
        <span className={listClasses.listControlCell} key="force">
          <Switch
            ariaLabel={
              forcedOutcomeText(getRow(item)) ?? t("preview.forceColumn")
            }
            checked={isForced}
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
          />
        </span>,
        ...columns.map((col, colIndex) => (
          <div key={colIndex}>{col.render(item, index)}</div>
        )),
      ]}
      className={mergeClasses(listClasses.listRow, getRowClassName(item))}
      details={
        isExpanded ? <NoteDetails data={getRowDetails(item)} /> : undefined
      }
      key={noteId}
      role="row"
    />
  );
}

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

interface TableToolbarProps {
  readonly anyExpandedOnPage: boolean;
  readonly count: string;
  readonly onExpandAllToggle: () => void;
  readonly search?: SearchBoxProps | undefined;
}

function TableToolbar({
  anyExpandedOnPage,
  count,
  onExpandAllToggle,
  search,
}: TableToolbarProps): JSX.Element {
  return (
    <div className={listClasses.listToolbar}>
      <p className={listClasses.listToolbarCount}>{count}</p>
      {search && (
        <div className={listClasses.listToolbarSearch}>
          <SearchBox {...search} />
        </div>
      )}
      <button
        className={listClasses.listToolbarAction}
        onClick={onExpandAllToggle}
        type="button"
      >
        {anyExpandedOnPage ? t("preview.collapseAll") : t("preview.expandAll")}
      </button>
    </div>
  );
}

interface TableNoticesProps {
  readonly notesLeftToDecide: number;
  readonly resurrectableLeft: boolean;
  readonly resurrectionWarning?: string | undefined;
  readonly selectionNotice?: string | undefined;
}

function TableNotices({
  notesLeftToDecide,
  resurrectableLeft,
  resurrectionWarning,
  selectionNotice,
}: TableNoticesProps): JSX.Element {
  return (
    <>
      {selectionNotice && notesLeftToDecide > 0 && (
        <p className={listClasses.listToolbarBanner}>{selectionNotice}</p>
      )}
      {resurrectionWarning && resurrectableLeft && (
        <p className={listClasses.listToolbarBanner}>{resurrectionWarning}</p>
      )}
    </>
  );
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

function TableGrid<T>({
  columns,
  expandedIds,
  forcedNoteIds,
  getDefaultSelected,
  getNoteId,
  getRow,
  getRowAriaLabel,
  getRowClassName,
  getRowDetails,
  getRowTitle,
  notesSelectedToImport,
  onExpandedChange,
  onForceChange,
  onSelectionChange,
  pageNotes,
  pageRows,
}: TableGridProps<T>): JSX.Element {
  return (
    <List
      columns={gridHeaders(columns)}
      columnWidths={gridColumnWidths(columns)}
      headerControls={[
        undefined,
        <SelectAllHeader
          key="select-all"
          notesSelectedToImport={notesSelectedToImport}
          onSelectionChange={onSelectionChange}
          pageRows={pageRows}
        />,
        <ForceAllHeader
          forcedNoteIds={forcedNoteIds}
          key="force-all"
          notesSelectedToImport={notesSelectedToImport}
          onForceChange={onForceChange}
          pageRows={pageRows}
        />,
      ]}
      role="grid"
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
            getRowClassName={getRowClassName}
            getRowDetails={getRowDetails}
            getRowTitle={getRowTitle}
            index={index}
            isExpanded={expandedIds.has(row.id)}
            isForced={row.isForced}
            isSelectable={isRowSelectable(row)}
            isSelected={row.isSelected}
            item={item}
            key={row.id}
            notesSelectedToImport={notesSelectedToImport}
            onExpandedChange={onExpandedChange}
            onForcedChange={onForceChange}
            onSelectedChange={onSelectionChange}
          />
        );
      })}
    </List>
  );
}

export interface NotesTableProps<T> {
  readonly allItems?: T[] | undefined;
  readonly columns: ColumnDef<T>[];
  readonly countText?: (selectedCount: number, total: number) => string;
  readonly currentPage: number;
  readonly emptyMatchText?: string | undefined;
  readonly forcedNoteIds: Record<number, boolean>;
  readonly forceStrategy: ForceStrategy;
  readonly getDefaultSelected: (item: T) => boolean;
  readonly getNoteId: (item: T) => number;
  readonly getRow: (item: T) => SyncDecisionRow;
  readonly getRowAriaLabel: (item: T) => string;
  readonly getRowClassName?: (item: T) => string | undefined;
  readonly getRowDetails: (item: T) => NoteDetailsData;
  readonly getRowTitle: (item: T) => string;
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
  readonly search?: SearchBoxProps | undefined;
  readonly selectionNotice?: string | undefined;
}

export function NotesTable<T>({
  items,
  allItems,
  currentPage,
  pageSize,
  columns,
  countText = (selectedCount: number, total: number) =>
    t("preview.notesToImport", { selected: selectedCount, total }),
  emptyMatchText,
  getDefaultSelected,
  getNoteId,
  getRow,
  getRowAriaLabel,
  getRowClassName = () => undefined,
  getRowDetails,
  getRowTitle,
  getStatus,
  isResurrectable,
  isSelectionLocked,
  forceStrategy,
  search,
  selectionNotice,
  resurrectionWarning,
  forcedNoteIds,
  onForceChange,
  onSelectionChange,
  notesSelectedToImport,
}: NotesTableProps<T>): JSX.Element {
  const totalItems = allItems ?? items;
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
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
      pageSelection(
        totalItems,
        notesSelectedToImport,
        forcedNoteIds,
        projection,
      ),
    [totalItems, notesSelectedToImport, forcedNoteIds, projection],
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
  const notesLeftToDecide = leftToDecide(allRows);
  const resurrectableLeft = totalItems.some(
    (item) =>
      !getDefaultSelected(item) &&
      !forcedNoteIds[getNoteId(item)] &&
      isResurrectable(item),
  );
  const anyExpandedOnPage = pageRows.some((row) => expandedIds.has(row.id));

  const onExpandedToggle = (noteId: number): void => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const onExpandAllToggle = (): void => {
    setExpandedIds(
      anyExpandedOnPage ? new Set() : new Set(pageRows.map((row) => row.id)),
    );
  };

  if (totalItems.length === 0) {
    return (
      <div>
        <p>{t("preview.noNotes")}</p>
      </div>
    );
  }

  const hasQuery = (search?.value.trim().length ?? 0) > 0;

  return (
    <div>
      <TableToolbar
        anyExpandedOnPage={anyExpandedOnPage}
        count={countText(selectedCount(allRows), totalItems.length)}
        onExpandAllToggle={onExpandAllToggle}
        search={search}
      />
      <TableNotices
        notesLeftToDecide={notesLeftToDecide.length}
        resurrectableLeft={resurrectableLeft}
        resurrectionWarning={resurrectionWarning}
        selectionNotice={selectionNotice}
      />
      {hasQuery && items.length === 0 ? (
        <p className={listClasses.listEmpty}>
          {emptyMatchText ??
            t("preview.noSearchMatches", { query: search?.value ?? "" })}
        </p>
      ) : (
        <TableGrid
          columns={columns}
          expandedIds={expandedIds}
          forcedNoteIds={forcedNoteIds}
          getDefaultSelected={getDefaultSelected}
          getNoteId={getNoteId}
          getRow={getRow}
          getRowAriaLabel={getRowAriaLabel}
          getRowClassName={getRowClassName}
          getRowDetails={getRowDetails}
          getRowTitle={getRowTitle}
          notesSelectedToImport={notesSelectedToImport}
          onExpandedChange={onExpandedToggle}
          onForceChange={onForceChange}
          onSelectionChange={onSelectionChange}
          pageNotes={pageNotes}
          pageRows={pageRows}
        />
      )}
    </div>
  );
}
