import { useMemo, type JSX, type ReactNode } from "react";
import { mergeClasses } from "src/gui/classes";
import { listClasses } from "../classes/common";
import type { SyncDecisionRow } from "src/services/notes/decision-table";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import type { ForceStrategy } from "../types/forceStrategy";
import { List } from "./List";
import { ListRow } from "./ListRow";

export interface ColumnDef<T> {
  readonly header: string;
  readonly render: (item: T, index: number) => ReactNode;
  readonly width: string;
}

export interface NotesTableProps<T> {
  readonly bulkActionHandler: () => void;
  readonly bulkActionLabel: string;
  readonly columns: ColumnDef<T>[];
  readonly countText?: (selectedCount: number, total: number) => string;
  readonly currentPage: number;
  readonly forcedNoteIds: Record<number, boolean>;
  readonly forceStrategy: ForceStrategy;
  readonly getDefaultSelected: (item: T) => boolean;
  readonly getNoteId: (item: T) => number;
  readonly getRow: (item: T) => SyncDecisionRow;
  readonly getRowClassName?: (item: T) => string | undefined;
  readonly getStatus: (item: T) => NoteLifecycleStatus;
  readonly isResurrectable: (item: T) => boolean;
  readonly isSelectionLocked?: (item: T) => boolean;
  readonly items: T[];
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly onForcedChange: (noteId: number, isForced: boolean) => void;
  readonly onPageChange: (page: number) => void;
  readonly onSelectedChange: (
    selected: Record<number, boolean>,
    noteId: number,
    isSelected: boolean,
  ) => void;
  readonly pageSize: number;
  readonly resurrectionWarning?: string;
  readonly selectionNotice?: string;
}

function NoteRow<T>({
  item,
  index,
  columns,
  forcedNoteIds,
  notesSelectedToImport,
  onForcedChange,
  onSelectedChange,
  getDefaultSelected,
  getNoteId,
  getRow,
  getRowClassName,
  getStatus,
  isSelectionLocked,
  forceStrategy,
}: {
  readonly item: T;
  readonly index: number;
  readonly columns: ColumnDef<T>[];
  readonly forcedNoteIds: Record<number, boolean>;
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly onForcedChange: (noteId: number, isForced: boolean) => void;
  readonly onSelectedChange: (
    selected: Record<number, boolean>,
    noteId: number,
    isSelected: boolean,
  ) => void;
  readonly getDefaultSelected: (item: T) => boolean;
  readonly getNoteId: (item: T) => number;
  readonly getRow: (item: T) => SyncDecisionRow;
  readonly getRowClassName?: (item: T) => string | undefined;
  readonly getStatus: (item: T) => NoteLifecycleStatus;
  readonly isSelectionLocked?: (item: T) => boolean;
  readonly forceStrategy: ForceStrategy;
}): JSX.Element {
  const noteId = getNoteId(item);
  const isLocked = isSelectionLocked?.(item) ?? false;
  const isSelected = isLocked
    ? true
    : (notesSelectedToImport[noteId] ?? getDefaultSelected(item));
  const isForced = forcedNoteIds[noteId] ?? false;
  const row = getRow(item);
  const showForceToggle = forceStrategy.appliesToStatus(getStatus(item));

  return (
    <ListRow
      cells={[
        <span key="select">
          <input
            checked={isSelected}
            disabled={isLocked || !getDefaultSelected(item)}
            key="select"
            onChange={(event) =>
              onSelectedChange(
                notesSelectedToImport,
                noteId,
                event.target.checked,
              )
            }
            type="checkbox"
          />
          {showForceToggle && (
            <label>
              <input
                aria-label={forceStrategy.getAriaLabel(row)}
                checked={isForced}
                key="force"
                onChange={(event) =>
                  onForcedChange(noteId, event.target.checked)
                }
                type="checkbox"
              />
              {forceStrategy.label}
            </label>
          )}
        </span>,
        ...columns
          .slice(1)
          .map((col, colIndex) => (
            <div key={colIndex}>{col.render(item, index)}</div>
          )),
      ]}
      className={mergeClasses(listClasses.listRow, getRowClassName?.(item))}
      key={noteId}
    />
  );
}

export function NotesTable<T>({
  items,
  currentPage,
  onPageChange,
  pageSize,
  columns,
  countText = (selectedCount: number, total: number) =>
    `Cards to import: ${selectedCount}/${total}.`,
  getDefaultSelected,
  getNoteId,
  getRow,
  getRowClassName,
  getStatus,
  isResurrectable,
  isSelectionLocked,
  forceStrategy,
  bulkActionLabel,
  bulkActionHandler,
  selectionNotice,
  resurrectionWarning,
  forcedNoteIds,
  onForcedChange,
  onSelectedChange,
  notesSelectedToImport,
}: NotesTableProps<T>): JSX.Element {
  const notesSelectedToImportCount =
    Object.values(notesSelectedToImport).filter(Boolean).length +
    items.filter(
      (item) =>
        (isSelectionLocked?.(item) ?? false) &&
        !(getNoteId(item) in notesSelectedToImport),
    ).length;
  const pageNotes = useMemo(
    () =>
      items.slice(currentPage * pageSize, currentPage * pageSize + pageSize),
    [items, currentPage, pageSize],
  );
  const notesLeftToDecide = useMemo(
    () =>
      items.filter(
        (item) => !getDefaultSelected(item) && !forcedNoteIds[getNoteId(item)],
      ),
    [items, getDefaultSelected, getNoteId, forcedNoteIds],
  );

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  if (items.length === 0) {
    return (
      <div>
        <p>No notes to display.</p>
      </div>
    );
  }

  return (
    <div>
      <p>{countText(notesSelectedToImportCount, items.length)}</p>
      {notesSelectedToImportCount === 0 && selectionNotice && (
        <p className={mergeClasses(listClasses.listRow)}>{selectionNotice}</p>
      )}
      {notesLeftToDecide.length > 0 && (
        <button onClick={bulkActionHandler} type="button">
          {bulkActionLabel.replace("X", String(notesLeftToDecide.length))}
        </button>
      )}
      {resurrectionWarning &&
        notesLeftToDecide.some((item) => isResurrectable(item)) && (
          <p className={mergeClasses(listClasses.listRow)}>
            {resurrectionWarning}
          </p>
        )}
      <List
        columns={columns.map((c) => c.header)}
        columnWidths={columns.map((c) => c.width).join(" ")}
      >
        {pageNotes.map((item, index) => (
          <NoteRow
            columns={columns}
            forcedNoteIds={forcedNoteIds}
            forceStrategy={forceStrategy}
            getDefaultSelected={getDefaultSelected}
            getNoteId={getNoteId}
            getRow={getRow}
            getRowClassName={getRowClassName}
            getStatus={getStatus}
            index={index}
            isSelectionLocked={isSelectionLocked}
            item={item}
            key={getNoteId(item)}
            notesSelectedToImport={notesSelectedToImport}
            onForcedChange={onForcedChange}
            onSelectedChange={onSelectedChange}
          />
        ))}
      </List>
      {totalPages > 1 && (
        <div className={mergeClasses(listClasses.listRow)}>
          <button
            disabled={currentPage === 0}
            onClick={() => onPageChange(currentPage - 1)}
          >
            ← Prev
          </button>
          <span>
            {currentPage + 1} / {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages - 1}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
