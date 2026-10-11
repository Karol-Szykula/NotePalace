import type { ForceStrategy } from "../types/forceStrategy";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";

export interface PageRowSelection {
  readonly defaultSelected: boolean;
  readonly id: number;
  readonly isForceable: boolean;
  readonly isForced: boolean;
  readonly isLocked: boolean;
  readonly isSelected: boolean;
}

export interface RowProjection<T> {
  readonly forceStrategy: ForceStrategy;
  readonly getDefaultSelected: (item: T) => boolean;
  readonly getNoteId: (item: T) => number;
  readonly getStatus: (item: T) => NoteLifecycleStatus;
  readonly isSelectionLocked?: ((item: T) => boolean | undefined) | undefined;
}

export function pageSelection<T>(
  items: readonly T[],
  selected: Record<number, boolean>,
  forced: Record<number, boolean>,
  projection: RowProjection<T>,
): PageRowSelection[] {
  return items.map((item) => {
    const id = projection.getNoteId(item);
    const isLocked = projection.isSelectionLocked?.(item) ?? false;
    const defaultSelected = projection.getDefaultSelected(item);
    return {
      id,
      isLocked,
      defaultSelected,
      isSelected: isLocked ? true : (selected[id] ?? defaultSelected),
      isForceable: projection.forceStrategy.appliesToStatus(
        projection.getStatus(item),
      ),
      isForced: forced[id] ?? false,
    };
  });
}

export function isRowSelectable(row: PageRowSelection): boolean {
  return !row.isLocked && row.defaultSelected;
}

export interface SelectionCheckState {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly indeterminate: boolean;
}

export function selectionCheckState(
  activeCount: number,
  selectableCount: number,
): SelectionCheckState {
  return {
    checked: selectableCount > 0 && activeCount === selectableCount,
    indeterminate: activeCount > 0 && activeCount < selectableCount,
    disabled: selectableCount === 0,
  };
}

export function setSelectableOnPage(
  rows: readonly PageRowSelection[],
  selected: Record<number, boolean>,
  checked: boolean,
): Record<number, boolean> {
  const next = { ...selected };
  for (const row of rows) {
    if (isRowSelectable(row)) {
      next[row.id] = checked;
    }
  }
  return next;
}

export interface ForcedSelectionChange {
  readonly forced: Record<number, boolean>;
  readonly selected: Record<number, boolean>;
}

export function forceAllOnPage(
  rows: readonly PageRowSelection[],
  forced: Record<number, boolean>,
  selected: Record<number, boolean>,
): ForcedSelectionChange {
  const nextForced = { ...forced };
  const nextSelected = { ...selected };
  for (const row of rows) {
    if (row.isForceable) {
      nextForced[row.id] = true;
      nextSelected[row.id] = true;
    }
  }
  return { forced: nextForced, selected: nextSelected };
}

export function clearForceAllOnPage(
  rows: readonly PageRowSelection[],
  forced: Record<number, boolean>,
  selected: Record<number, boolean>,
): ForcedSelectionChange {
  const nextForced = { ...forced };
  const nextSelected = { ...selected };
  for (const row of rows) {
    if (row.isForceable) {
      nextForced[row.id] = false;
      nextSelected[row.id] = row.defaultSelected;
    }
  }
  return { forced: nextForced, selected: nextSelected };
}

export function setNoteForced(
  forced: Record<number, boolean>,
  selected: Record<number, boolean>,
  noteId: number,
  isForced: boolean,
  defaultSelected: boolean,
): ForcedSelectionChange {
  return {
    forced: { ...forced, [noteId]: isForced },
    selected: { ...selected, [noteId]: isForced ? true : defaultSelected },
  };
}

export function setNoteSelected(
  selected: Record<number, boolean>,
  noteId: number,
  isSelected: boolean,
): Record<number, boolean> {
  return { ...selected, [noteId]: isSelected };
}

export function selectedCount(rows: readonly PageRowSelection[]): number {
  return rows.filter((row) => row.isSelected).length;
}

export function leftToDecide(
  rows: readonly PageRowSelection[],
): PageRowSelection[] {
  return rows.filter((row) => !row.defaultSelected && !row.isForced);
}
