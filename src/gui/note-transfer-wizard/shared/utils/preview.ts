import type { OutcomeKind } from "src/services/notes/decision-table";
import type { NotePreviewStatus } from "src/services/notes/lifecycle";
import { plural, t } from "src/i18n";

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
  isForced: boolean,
  forcedOutcome: string | undefined,
  fallback: string,
): string {
  return isForced && forcedOutcome !== undefined ? forcedOutcome : fallback;
}

export function countNotes(count: number): string {
  return plural("preview.noteCount", count);
}

export function selectionNoticeText(reasons: string[], action: string): string {
  return t("preview.selectionNotice", { reasons: reasons.join(", "), action });
}

export function recreateWarning(count: number, location: string): string {
  return plural("preview.recreatedWarning", count, { location });
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
