import type { ReactNode } from "react";
import type { SyncDecisionRow } from "src/services/notes/decision-table";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import type { ForceStrategy } from "../types/forceStrategy";
import type { NoteDetailsData } from "./NoteDetails";
import type { SearchBoxProps } from "./SearchBox";

export interface ColumnDef<T> {
  readonly header: string;
  readonly render: (item: T, index: number) => ReactNode;
  readonly width: string;
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
