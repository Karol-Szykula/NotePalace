import type { SyncDecisionRow } from "src/services/notes/decision-table";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import { t, type MessageKey } from "src/i18n";

export interface ForceStrategy {
  readonly appliesToStatus: (status: NoteLifecycleStatus) => boolean;
  readonly getAriaLabel: (row: SyncDecisionRow) => string;
  readonly getForcedOutcome: (row: SyncDecisionRow) => string | undefined;
  readonly labelKey: MessageKey;
}

export function forcedOutcomeText(
  forceLabelKey: MessageKey,
  row: SyncDecisionRow,
): string | undefined {
  if (row.forcedOutcomeKey === undefined) {
    return undefined;
  }
  return t("force.outcome", {
    force: t(forceLabelKey),
    outcome: t(row.forcedOutcomeKey),
  });
}
