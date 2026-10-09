import { useEffect, useRef, type JSX } from "react";
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

export function Switch({
  ariaLabel,
  checked,
  className,
  disabled = false,
  indeterminate = false,
  onChange,
}: SwitchProps): JSX.Element {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current !== null) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      checked={checked}
      className={mergeClasses(switchClasses.switch, className)}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      ref={ref}
      role="switch"
      type="checkbox"
    />
  );
}
