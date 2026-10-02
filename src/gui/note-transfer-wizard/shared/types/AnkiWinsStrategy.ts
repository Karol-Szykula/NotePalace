import type { ForceStrategy } from "./forceStrategy";
import type { SyncDecisionRow } from "src/services/notes/decision-table";
import type {
  NoteLifecycleStatus,
  NoteLifecycleEvent,
} from "src/services/notes/lifecycle";
import { decisionActFor } from "src/services/notes/decision-table";

export const ankiWinsStrategy: ForceStrategy = {
  label: "Anki wins",

  getForcedOutcome(row: SyncDecisionRow): string | undefined {
    return row.forcedOutcome;
  },

  getAriaLabel(row: SyncDecisionRow): string {
    return (
      row.forcedOutcome ??
      "Anki wins: overwrite what is in Obsidian with Anki's version"
    );
  },

  appliesToStatus(status: NoteLifecycleStatus): boolean {
    const act = decisionActFor("import", status, true) as NoteLifecycleEvent;
    const defaultAct = decisionActFor(
      "import",
      status,
      false,
    ) as NoteLifecycleEvent;
    return act !== defaultAct;
  },
};
