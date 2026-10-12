import type { JSX, ReactNode } from "react";
import { mergeClasses } from "src/gui/classes";
import { listClasses } from "../classes/common";

type ListDividers = "top" | "bottom" | "none";

export interface ListProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly columns?: string[];
  readonly columnWidths?: string;
  readonly dividers?: ListDividers;
  readonly headerControls?: ReactNode[];
  readonly role?: "grid" | undefined;
  readonly striped?: boolean;
}

function dividersClass(dividers: ListDividers): string | undefined {
  if (dividers === "top") {
    return listClasses.listDividersTop;
  }
  if (dividers === "bottom") {
    return listClasses.listDividersBottom;
  }
  return undefined;
}

export function List({
  columns,
  columnWidths,
  headerControls,
  dividers = "bottom",
  striped = false,
  role,
  className,
  children,
}: ListProps): JSX.Element {
  const headerRowRole = role === undefined ? undefined : "row";
  const headerGroupRole = role === undefined ? undefined : "rowgroup";
  const columnRole = role === undefined ? undefined : "columnheader";
  const controlRole = role === undefined ? undefined : "gridcell";
  return (
    <div
      className={mergeClasses(
        listClasses.list,
        dividersClass(dividers),
        striped ? listClasses.listStriped : undefined,
        className,
      )}
      role={role}
      style={columnWidths ? { gridTemplateColumns: columnWidths } : undefined}
    >
      {columns && columns.length > 0 && (
        <div className={listClasses.listHeader} role={headerGroupRole}>
          <div className={listClasses.listHeaderRow} role={headerRowRole}>
            {columns.map((column) => (
              <span key={column} role={columnRole}>
                {column}
              </span>
            ))}
          </div>
          {headerControls && headerControls.length > 0 && (
            <div className={listClasses.listHeaderRow} role={headerRowRole}>
              {headerControls.map((control, index) => (
                <span
                  className={listClasses.listHeaderControl}
                  key={index}
                  role={controlRole}
                >
                  {control}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
