import { forcedOutcomeText, type ForceStrategy } from "./forceStrategy";
import type { SyncDecisionRow } from "src/services/notes/decision-table";
import { decisionActFor } from "src/services/notes/decision-table";
import type {
  NoteLifecycleEvent,
  NoteLifecycleStatus,
} from "src/services/notes/lifecycle";

export const obsidianWinsStrategy: ForceStrategy = {
  getForcedOutcome(row: SyncDecisionRow): string | undefined {
    return forcedOutcomeText(row);
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
