import type { AriaRole, JSX, ReactNode } from "react";
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

interface HeaderRoles {
  column: AriaRole | undefined;
  control: AriaRole | undefined;
  row: AriaRole | undefined;
  rowgroup: AriaRole | undefined;
}

function headerRoles(role: "grid" | undefined): HeaderRoles {
  if (role === undefined) {
    return {
      column: undefined,
      control: undefined,
      row: undefined,
      rowgroup: undefined,
    };
  }
  return {
    column: "columnheader",
    control: "gridcell",
    row: "row",
    rowgroup: "rowgroup",
  };
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
      <ListHeader columns={columns} controls={headerControls} role={role} />
      {children}
    </div>
  );
}

interface ListHeaderProps {
  readonly columns?: string[] | undefined;
  readonly controls?: ReactNode[] | undefined;
  readonly role?: "grid" | undefined;
}

function ListHeader({
  columns,
  controls,
  role,
}: ListHeaderProps): JSX.Element | null {
  if (columns === undefined || columns.length === 0) {
    return null;
  }
  const roles = headerRoles(role);
  return (
    <div className={listClasses.listHeader} role={roles.rowgroup}>
      <div className={listClasses.listHeaderRow} role={roles.row}>
        {columns.map((column) => (
          <span key={column} role={roles.column}>
            {column}
          </span>
        ))}
      </div>
      <ListHeaderControls
        controlRole={roles.control}
        controls={controls}
        rowRole={roles.row}
      />
    </div>
  );
}

interface ListHeaderControlsProps {
  readonly controlRole: AriaRole | undefined;
  readonly controls?: ReactNode[] | undefined;
  readonly rowRole: AriaRole | undefined;
}

function ListHeaderControls({
  controls,
  controlRole,
  rowRole,
}: ListHeaderControlsProps): JSX.Element | null {
  if (controls === undefined || controls.length === 0) {
    return null;
  }
  return (
    <div className={listClasses.listHeaderRow} role={rowRole}>
      {controls.map((control, index) => (
        <span
          className={listClasses.listHeaderControl}
          key={index}
          role={controlRole}
        >
          {control}
        </span>
      ))}
    </div>
  );
}
