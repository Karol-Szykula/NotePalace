import type { ForceStrategy } from "./forceStrategy";
import type { SyncDecisionRow } from "src/services/notes/decision-table";
import type {
  NoteLifecycleEvent,
  NoteLifecycleStatus,
} from "src/services/notes/lifecycle";
import { decisionActFor } from "src/services/notes/decision-table";

export const obsidianWinsStrategy: ForceStrategy = {
  label: "Obsidian wins",

  getForcedOutcome(row: SyncDecisionRow): string | undefined {
    return row.forcedOutcome;
  },

  getAriaLabel(row: SyncDecisionRow): string {
    return (
      row.forcedOutcome ??
      "Obsidian wins: overwrite what is in Anki with Obsidian's version"
    );
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
