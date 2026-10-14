import { lifecycleTransitions } from "./lifecycle-machine";
import { NOTE_LIFECYCLE_STATUSES } from "./lifecycle-statuses";

export function noteLifecycleMermaid(): string {
  const idOf = (status: string): string => status.replace(".", "_");
  const lines = [
    "stateDiagram-v2",
    "  direction TB",
    "  [*] --> ankiOnly_neverImported",
  ];
  for (const status of NOTE_LIFECYCLE_STATUSES) {
    lines.push(`  ${idOf(status)}["${status}"]`);
  }
  for (const status of NOTE_LIFECYCLE_STATUSES) {
    for (const [event, target] of Object.entries(
      lifecycleTransitions[status],
    )) {
      lines.push(`  ${idOf(status)} --> ${idOf(target)}: ${event}`);
    }
  }
  return lines.join("\n");
}
