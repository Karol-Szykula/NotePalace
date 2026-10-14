import type { JSX } from "react";
import { t } from "src/i18n";
import { listClasses } from "../classes/common";
import { selectedCount } from "../utils/note-selection";
import { TableGrid } from "./TableGrid";
import { TableNotices } from "./TableNotices";
import { TableToolbar } from "./TableToolbar";
import type { NotesTableProps } from "./table-types";
import type { ExpandedRows } from "./useExpandedRows";
import type { TableRows } from "./useTableRows";

function defaultCountText(selected: number, total: number): string {
  return t("preview.notesToImport", { selected, total });
}

function noRowClassName(): undefined {
  return undefined;
}

interface NotesTableContentProps<T> {
  readonly expansion: ExpandedRows;
  readonly props: NotesTableProps<T>;
  readonly rows: TableRows<T>;
}

export function NotesTableContent<T>({
  expansion,
  props,
  rows,
}: NotesTableContentProps<T>): JSX.Element {
  const countText = props.countText ?? defaultCountText;
  const getRowClassName = props.getRowClassName ?? noRowClassName;
  const hasQuery = (props.search?.value.trim().length ?? 0) > 0;
  return (
    <div>
      <TableToolbar
        anyExpandedOnPage={expansion.anyExpandedOnPage}
        count={countText(selectedCount(rows.allRows), rows.allRows.length)}
        onExpandAllToggle={expansion.onExpandAllToggle}
        search={props.search}
      />
      <TableNotices
        notesLeftToDecide={rows.notesLeftToDecide.length}
        resurrectableLeft={rows.resurrectableLeft}
        resurrectionWarning={props.resurrectionWarning}
        selectionNotice={props.selectionNotice}
      />
      {hasQuery && props.items.length === 0 ? (
        <p className={listClasses.listEmpty}>
          {props.emptyMatchText ??
            t("preview.noSearchMatches", { query: props.search?.value ?? "" })}
        </p>
      ) : (
        <TableGrid
          columns={props.columns}
          expandedIds={expansion.expandedIds}
          forcedNoteIds={props.forcedNoteIds}
          getDefaultSelected={props.getDefaultSelected}
          getNoteId={props.getNoteId}
          getRow={props.getRow}
          getRowAriaLabel={props.getRowAriaLabel}
          getRowClassName={getRowClassName}
          getRowDetails={props.getRowDetails}
          getRowTitle={props.getRowTitle}
          notesSelectedToImport={props.notesSelectedToImport}
          onExpandedChange={expansion.onExpandedToggle}
          onForceChange={props.onForceChange}
          onSelectionChange={props.onSelectionChange}
          pageNotes={rows.pageNotes}
          pageRows={rows.pageRows}
        />
      )}
    </div>
  );
}
