import type { JSX } from "react";
import { mergeClasses } from "src/gui/classes";

const buttonClasses = {
  button: "notepalace-button",
} as const;

export interface ButtonProps {
  readonly children: string;
  readonly className?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly onClick: () => void;
  readonly type?: "button" | "submit";
}

export function Button({
  children,
  className,
  disabled = false,
  onClick,
  type = "button",
}: ButtonProps): JSX.Element {
  return (
    <button
      className={mergeClasses(buttonClasses.button, className)}
      disabled={disabled}
      onClick={onClick}
      title={children}
      type={type}
    >
      {children}
    </button>
  );
}
