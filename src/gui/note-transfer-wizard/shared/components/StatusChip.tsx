import type { JSX, ReactNode } from "react";
import { mergeClasses } from "src/gui/classes";
import type { OutcomeKind } from "src/services/notes/decision-table";
import { chipClasses } from "../classes/common";

export interface StatusChipProps {
  readonly kind: OutcomeKind;
  readonly label: string;
  readonly tooltip: string;
}

function chipIcon(kind: OutcomeKind): ReactNode {
  switch (kind) {
    case "create":
      return (
        <>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 5.5v5M5.5 8h5" />
        </>
      );
    case "overwrite":
      return (
        <>
          <path d="M13.5 8a5.5 5.5 0 1 1-2.2-4.4" />
          <path d="M12.8 1.8v2.6h-2.6" />
        </>
      );
    case "skip":
      return (
        <>
          <circle cx="8" cy="8" r="6" />
          <path d="M4.5 11.5 11.5 4.5" />
        </>
      );
    case "conflict":
      return (
        <>
          <path d="M8 2.5 13.5 12.5H2.5Z" />
          <path d="M8 6.5v2.6" />
          <circle cx="8" cy="11" fill="currentColor" r="0.7" stroke="none" />
        </>
      );
    case "quiet":
      return (
        <>
          <circle cx="8" cy="8" r="6" />
          <path d="M5.5 8.2 7.2 10l3-3.4" />
        </>
      );
    case "missing":
      return (
        <>
          <circle cx="8" cy="8" r="6" />
          <path d="M6 6l4 4M10 6l-4 4" />
        </>
      );
  }
}

const chipKindClass: Record<OutcomeKind, string> = {
  conflict: chipClasses.chipConflict,
  create: chipClasses.chipCreate,
  missing: chipClasses.chipMissing,
  overwrite: chipClasses.chipOverwrite,
  quiet: chipClasses.chipQuiet,
  skip: chipClasses.chipSkip,
};

export function StatusChip({
  kind,
  label,
  tooltip,
}: StatusChipProps): JSX.Element {
  return (
    <span
      aria-label={tooltip}
      className={mergeClasses(
        chipClasses.chip,
        chipKindClass[kind],
        kind === "missing" ? chipClasses.chipDanger : undefined,
      )}
      role="group"
      title={tooltip}
    >
      <span aria-hidden="true" className={chipClasses.chipIcon}>
        <svg
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          viewBox="0 0 16 16"
        >
          {chipIcon(kind)}
        </svg>
      </span>
      <span>{label}</span>
    </span>
  );
}
