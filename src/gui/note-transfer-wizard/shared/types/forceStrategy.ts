import type { SyncDecisionRow } from "src/services/notes/decision-table";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import { t } from "src/i18n";

export interface ForceStrategy {
  readonly appliesToStatus: (status: NoteLifecycleStatus) => boolean;
  readonly getForcedOutcome: (row: SyncDecisionRow) => string | undefined;
}

export function forcedOutcomeText(row: SyncDecisionRow): string | undefined {
  if (row.forcedOutcomeKey === undefined) {
    return undefined;
  }
  return t("force.outcome", {
    force: t("force.label"),
    outcome: t(row.forcedOutcomeKey),
  });
}
