import type {
  OutcomeKind,
  SyncDecisionRow,
} from "src/services/notes/decision-table";
import type { NotePreviewStatus } from "src/services/notes/lifecycle";

export interface PreviewBadgeClasses {
  readonly badgeImported: string;
  readonly badgeNew: string;
  readonly badgeOverwrite: string;
  readonly badgeSkipped: string;
}

export function previewBadgeClass(
  kind: OutcomeKind,
  classes: PreviewBadgeClasses,
): string {
  if (kind === "create") {
    return classes.badgeNew;
  }
  if (kind === "quiet") {
    return classes.badgeImported;
  }
  if (kind === "skip" || kind === "conflict") {
    return classes.badgeSkipped;
  }
  if (kind === "overwrite") {
    return classes.badgeOverwrite;
  }
  return classes.badgeImported;
}

export function resolveBadgeText(
  row: SyncDecisionRow,
  isForced: boolean,
  fallback: string,
): string {
  if (isForced && row.forcedOutcome !== undefined) {
    return row.forcedOutcome;
  }
  return fallback;
}

export function countNotes(count: number): string {
  return count === 1 ? "1 note" : `${count} notes`;
}

export function selectionNoticeText(reasons: string[], action: string): string {
  return `Nothing is selected yet: ${reasons.join(", ")}. ${action}`;
}

export function recreateWarning(count: number, location: string): string {
  return `This re-creates ${countNotes(count)} you deleted in ${location}.`;
}

export const previewStatusOrder: NotePreviewStatus[] = [
  "new",
  "newerInAnki",
  "newerInVault",
  "diverged",
  "noFile",
  "upToDate",
];

export function comparePreviewRank(
  first: { previewStatus: NotePreviewStatus },
  second: { previewStatus: NotePreviewStatus },
): number {
  return (
    previewStatusOrder.indexOf(first.previewStatus) -
    previewStatusOrder.indexOf(second.previewStatus)
  );
}
