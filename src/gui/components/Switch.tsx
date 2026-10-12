import type { JSX, KeyboardEvent } from "react";
import { mergeClasses } from "src/gui/classes";

const switchClasses = {
  switch: "notepalace-switch",
} as const;

export interface SwitchProps {
  readonly ariaLabel: string;
  readonly checked: boolean;
  readonly className?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly indeterminate?: boolean | undefined;
  readonly onChange: (checked: boolean) => void;
}

function toggleOnKeys(key: string): boolean {
  return key === " " || key === "Space" || key === "Enter";
}

export function Switch({
  ariaLabel,
  checked,
  className,
  disabled = false,
  indeterminate = false,
  onChange,
}: SwitchProps): JSX.Element {
  const toggle = (): void => {
    if (!disabled) {
      onChange(!checked);
    }
  };
  return (
    <span
      aria-checked={indeterminate ? "mixed" : checked}
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      className={mergeClasses(switchClasses.switch, className)}
      onClick={toggle}
      onKeyDown={(event: KeyboardEvent<HTMLSpanElement>) => {
        if (toggleOnKeys(event.key)) {
          event.preventDefault();
          toggle();
        }
      }}
      role="switch"
      tabIndex={disabled ? -1 : 0}
    />
  );
}
