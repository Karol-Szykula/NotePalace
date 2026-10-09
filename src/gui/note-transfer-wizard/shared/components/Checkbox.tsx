import { useEffect, useRef, type JSX } from "react";

export interface CheckboxProps {
  readonly ariaLabel: string;
  readonly checked: boolean;
  readonly disabled?: boolean | undefined;
  readonly indeterminate?: boolean | undefined;
  readonly onChange: (checked: boolean) => void;
}

export function Checkbox({
  ariaLabel,
  checked,
  disabled = false,
  indeterminate = false,
  onChange,
}: CheckboxProps): JSX.Element {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current !== null) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      ref={ref}
      type="checkbox"
    />
  );
}
