import type { JSX } from "react";
import { t } from "src/i18n";
import { NotesTableContent } from "./NotesTableContent";
import type { NotesTableProps } from "./table-types";
import { useExpandedRows } from "./useExpandedRows";
import { useTableRows } from "./useTableRows";

export type { ColumnDef, NotesTableProps } from "./table-types";

export function NotesTable<T>(props: NotesTableProps<T>): JSX.Element {
  const rows = useTableRows(props);
  const expansion = useExpandedRows(rows.pageRows);

  if (rows.isTableEmpty) {
    return (
      <div>
        <p>{t("preview.noNotes")}</p>
      </div>
    );
  }

  return <NotesTableContent expansion={expansion} props={props} rows={rows} />;
}
