import {
  cloneElement,
  isValidElement,
  type AriaRole,
  type CSSProperties,
  type JSX,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { mergeClasses } from "src/gui/classes";
import { listClasses } from "../classes/common";

export interface ListRowProps {
  readonly cellRole?: AriaRole | undefined;
  readonly cells: ReactNode[];
  readonly className?: string | undefined;
  readonly details?: ReactNode | undefined;
  readonly disabled?: boolean | undefined;
  readonly onSelect?: (() => void) | undefined;
  readonly role?: AriaRole | undefined;
  readonly style?: CSSProperties | undefined;
}

export function ListRow({
  cells,
  cellRole,
  className,
  details,
  disabled = false,
  onSelect,
  role,
  style,
}: ListRowProps): JSX.Element {
  return (
    <div
      className={mergeClasses(listClasses.listRow, className)}
      onClick={(event: MouseEvent<HTMLDivElement>) => {
        const interactive = (event.target as HTMLElement).closest(
          "input, select, button, a",
        );
        if (!disabled && onSelect && !interactive) {
          onSelect();
        }
      }}
      role={role}
      style={style}
    >
      {cells.map((cell, index) => (
        <div className={listClasses.listCell} key={index} role={cellRole}>
          {cell}
        </div>
      ))}
      {details !== undefined && (
        <div className={listClasses.listRowDetails}>{details}</div>
      )}
    </div>
  );
}

export interface LabeledControlProps {
  readonly className?: string | undefined;
  readonly control: ReactNode;
  readonly controlLabel?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly label: ReactNode;
  readonly tooltip?: string | undefined;
}

function accessibleControl(
  control: ReactNode,
  controlLabel?: string,
): ReactNode {
  return isValidElement(control) && controlLabel !== undefined
    ? cloneElement(control as ReactElement<Record<string, unknown>>, {
        "aria-label": controlLabel,
      })
    : control;
}

export function LabeledControl({
  control,
  controlLabel,
  disabled = false,
  label,
  tooltip,
  className,
}: LabeledControlProps): JSX.Element {
  if (disabled) {
    return (
      <span
        className={mergeClasses(
          listClasses.labeledControl,
          listClasses.labeledControlDisabled,
          className,
        )}
        title={tooltip}
      >
        {accessibleControl(control, controlLabel)}
        <span>{label}</span>
      </span>
    );
  }
  return (
    <label
      className={mergeClasses(listClasses.labeledControl, className)}
      title={tooltip}
    >
      {control}
      <span>{label}</span>
    </label>
  );
}
