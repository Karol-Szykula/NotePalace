import type { OutcomeKind } from "src/services/notes/decision-table";
import type { NotePreviewStatus } from "src/services/notes/lifecycle";
import type { MessageKey } from "src/i18n/messages";
import { plural, t } from "src/i18n";

export const outcomeLabelKey: Record<OutcomeKind, MessageKey> = {
  conflict: "preview.outcome.conflict",
  create: "preview.outcome.create",
  missing: "preview.outcome.missing",
  overwrite: "preview.outcome.overwrite",
  quiet: "preview.outcome.quiet",
  skip: "preview.outcome.skip",
};

export function rationaleText(
  isForced: boolean,
  forcedOutcome: string | undefined,
  rationale: string,
): string {
  return isForced && forcedOutcome !== undefined ? forcedOutcome : rationale;
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
