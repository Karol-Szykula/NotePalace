import type { SyncDecisionRow } from "src/services/notes/decision-table";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";

export interface ForceStrategy {
  readonly appliesToStatus: (status: NoteLifecycleStatus) => boolean;
  readonly getAriaLabel: (row: SyncDecisionRow) => string;
  readonly getForcedOutcome: (row: SyncDecisionRow) => string | undefined;
  readonly label: string;
}
