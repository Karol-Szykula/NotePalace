import { type JSX, type ReactNode } from "react";
import { mergeClasses } from "src/gui/classes";
import { Switch } from "src/gui/components/Switch";
import { t } from "src/i18n";
import type { SyncDecisionRow } from "src/services/notes/decision-table";
import { listClasses } from "../classes/common";
import { forcedOutcomeText } from "../types/forceStrategy";
import { setNoteForced, setNoteSelected } from "../utils/note-selection";
import { Checkbox } from "./Checkbox";
import { ListRow } from "./ListRow";
import { NoteDetails, type NoteDetailsData } from "./NoteDetails";
import type { ColumnDef } from "./table-types";

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

interface ExpandToggleProps {
  readonly isExpanded: boolean;
  readonly noteId: number;
  readonly onExpandedChange: (noteId: number) => void;
  readonly summary: string;
}

function ExpandToggle({
  isExpanded,
  noteId,
  onExpandedChange,
  summary,
}: ExpandToggleProps): JSX.Element {
  return (
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
    </button>
  );
}

interface SelectCellProps {
  readonly ariaLabel: string;
  readonly isSelectable: boolean;
  readonly isSelected: boolean;
  readonly noteId: number;
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly onSelectedChange: (selected: Record<number, boolean>) => void;
}

function SelectCell({
  ariaLabel,
  isSelectable,
  isSelected,
  noteId,
  notesSelectedToImport,
  onSelectedChange,
}: SelectCellProps): JSX.Element {
  return (
    <span className={listClasses.listControlCell}>
      <Checkbox
        ariaLabel={ariaLabel}
        checked={isSelected}
        disabled={!isSelectable}
        onChange={(isNowSelected) =>
          onSelectedChange(
            setNoteSelected(notesSelectedToImport, noteId, isNowSelected),
          )
        }
      />
    </span>
  );
}

interface ForceCellProps {
  readonly defaultSelected: boolean;
  readonly forcedNoteIds: Record<number, boolean>;
  readonly isForced: boolean;
  readonly noteId: number;
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly onForcedChange: (
    forced: Record<number, boolean>,
    selected: Record<number, boolean>,
  ) => void;
  readonly row: SyncDecisionRow;
}

function ForceCell({
  defaultSelected,
  forcedNoteIds,
  isForced,
  noteId,
  notesSelectedToImport,
  onForcedChange,
  row,
}: ForceCellProps): JSX.Element {
  return (
    <span className={listClasses.listControlCell}>
      <Switch
        ariaLabel={forcedOutcomeText(row) ?? t("preview.forceColumn")}
        checked={isForced}
        onChange={(isNowForced) => {
          const next = setNoteForced(
            forcedNoteIds,
            notesSelectedToImport,
            noteId,
            isNowForced,
            defaultSelected,
          );
          onForcedChange(next.forced, next.selected);
        }}
      />
    </span>
  );
}

function noteRowCells<T>(props: NoteRowProps<T>): ReactNode[] {
  const noteId = props.getNoteId(props.item);
  const summary = props.getRowTitle(props.item);
  return [
    <ExpandToggle
      isExpanded={props.isExpanded}
      key="expand"
      noteId={noteId}
      onExpandedChange={props.onExpandedChange}
      summary={summary}
    />,
    <SelectCell
      ariaLabel={props.getRowAriaLabel(props.item)}
      isSelectable={props.isSelectable}
      isSelected={props.isSelected}
      key="select"
      noteId={noteId}
      notesSelectedToImport={props.notesSelectedToImport}
      onSelectedChange={props.onSelectedChange}
    />,
    <ForceCell
      defaultSelected={props.getDefaultSelected(props.item)}
      forcedNoteIds={props.forcedNoteIds}
      isForced={props.isForced}
      key="force"
      noteId={noteId}
      notesSelectedToImport={props.notesSelectedToImport}
      onForcedChange={props.onForcedChange}
      row={props.getRow(props.item)}
    />,
    ...props.columns.map((col, colIndex) => (
      <div key={colIndex}>{col.render(props.item, props.index)}</div>
    )),
  ];
}

export function NoteRow<T>(props: NoteRowProps<T>): JSX.Element {
  const noteId = props.getNoteId(props.item);
  return (
    <ListRow
      cellRole="gridcell"
      cells={noteRowCells(props)}
      className={mergeClasses(
        listClasses.listRow,
        props.getRowClassName(props.item),
      )}
      details={
        props.isExpanded ? (
          <NoteDetails data={props.getRowDetails(props.item)} />
        ) : undefined
      }
      key={noteId}
      role="row"
    />
  );
}
