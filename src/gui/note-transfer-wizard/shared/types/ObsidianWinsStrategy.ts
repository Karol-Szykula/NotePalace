import { t, type MessageKey } from "src/i18n";
import { forcedOutcomeText, type ForceStrategy } from "./forceStrategy";
import type { SyncDecisionRow } from "src/services/notes/decision-table";
import type {
  NoteLifecycleEvent,
  NoteLifecycleStatus,
} from "src/services/notes/lifecycle";
import { decisionActFor } from "src/services/notes/decision-table";

const labelKey: MessageKey = "force.obsidianWins";

export const obsidianWinsStrategy: ForceStrategy = {
  labelKey,

  getForcedOutcome(row: SyncDecisionRow): string | undefined {
    return forcedOutcomeText(labelKey, row);
  },

  getAriaLabel(row: SyncDecisionRow): string {
    return forcedOutcomeText(labelKey, row) ?? t("force.obsidianWinsFallback");
  },

  appliesToStatus(status: NoteLifecycleStatus): boolean {
    const act = decisionActFor("export", status, true) as NoteLifecycleEvent;
    const defaultAct = decisionActFor(
      "export",
      status,
      false,
    ) as NoteLifecycleEvent;
    return act !== defaultAct;
  },
};
