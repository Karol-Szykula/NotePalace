import { useMemo } from "react";
import {
  leftToDecide,
  pageSelection,
  type PageRowSelection,
  type RowProjection,
} from "../utils/note-selection";
import type { NotesTableProps } from "./table-types";

export interface TableRows<T> {
  readonly allRows: PageRowSelection[];
  readonly isTableEmpty: boolean;
  readonly notesLeftToDecide: PageRowSelection[];
  readonly pageNotes: T[];
  readonly pageRows: PageRowSelection[];
  readonly resurrectableLeft: boolean;
}

function useRowProjection<T>(props: NotesTableProps<T>): RowProjection<T> {
  return useMemo(
    () => ({
      getNoteId: props.getNoteId,
      getDefaultSelected: props.getDefaultSelected,
      getStatus: props.getStatus,
      forceStrategy: props.forceStrategy,
      isSelectionLocked: props.isSelectionLocked,
    }),
    [
      props.getNoteId,
      props.getDefaultSelected,
      props.getStatus,
      props.forceStrategy,
      props.isSelectionLocked,
    ],
  );
}

export function useTableRows<T>(props: NotesTableProps<T>): TableRows<T> {
  const totalItems = props.allItems ?? props.items;
  const projection = useRowProjection(props);
  const allRows = useMemo(
    () =>
      pageSelection(
        totalItems,
        props.notesSelectedToImport,
        props.forcedNoteIds,
        projection,
      ),
    [totalItems, props.notesSelectedToImport, props.forcedNoteIds, projection],
  );
  const pageNotes = useMemo(
    () =>
      props.items.slice(
        props.currentPage * props.pageSize,
        props.currentPage * props.pageSize + props.pageSize,
      ),
    [props.items, props.currentPage, props.pageSize],
  );
  const pageRows = useMemo(
    () =>
      pageSelection(
        pageNotes,
        props.notesSelectedToImport,
        props.forcedNoteIds,
        projection,
      ),
    [pageNotes, props.notesSelectedToImport, props.forcedNoteIds, projection],
  );
  const notesLeftToDecide = leftToDecide(allRows);
  const resurrectableLeft = totalItems.some(
    (item) =>
      !props.getDefaultSelected(item) &&
      !props.forcedNoteIds[props.getNoteId(item)] &&
      props.isResurrectable(item),
  );
  return {
    allRows,
    isTableEmpty: totalItems.length === 0,
    notesLeftToDecide,
    pageNotes,
    pageRows,
    resurrectableLeft,
  };
}
