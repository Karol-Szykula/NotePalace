import { createMachine, transition, type StateValue } from "xstate";
import {
  NOTE_LIFECYCLE_EVENTS,
  NOTE_LIFECYCLE_STATUSES,
  type NoteLifecycleEvent,
  type NoteLifecycleStatus,
} from "./lifecycle-statuses";

type TransitionTable = Record<
  NoteLifecycleStatus,
  Partial<Record<NoteLifecycleEvent, NoteLifecycleStatus>>
>;

export const lifecycleTransitions: TransitionTable = {
  "ankiOnly.neverImported": {
    IMPORT: "synced.clean",
    SKIP: "ankiOnly.neverImported",
  },
  "ankiOnly.fileDeleted": {
    RESURRECT: "synced.ankiNewer",
    PURGE: "orphaned",
  },
  "synced.clean": { CHECK: "synced.clean" },
  "synced.ankiNewer": {
    PULL: "synced.clean",
    FORCE_PUSH: "synced.clean",
  },
  "synced.vaultNewer": {
    PUSH: "synced.clean",
    FORCE_PULL: "synced.clean",
    RESOLVE_NEWEST: "synced.clean",
  },
  "synced.diverged": {
    FORCE_PULL: "synced.clean",
    FORCE_PUSH: "synced.clean",
    RESOLVE_NEWEST: "synced.clean",
  },
  "linked.unenrolled": { ENROLL: "synced.clean" },
  "vaultOnly.unexported": { EXPORT: "synced.clean" },
  "vaultOnly.unenrolled": { ENROLL: "synced.clean" },
  "vaultOnly.ankiDeleted": {
    DELETE_FILE: "orphaned",
    EXPORT: "synced.clean",
  },
  orphaned: { PURGE: "orphaned" },
};

const knownEvents = new Set<string>(NOTE_LIFECYCLE_EVENTS);

export function transitionNoteLifecycle(
  status: NoteLifecycleStatus,
  event: NoteLifecycleEvent,
): NoteLifecycleStatus {
  if (!knownEvents.has(event)) {
    throw new Error(`Unknown lifecycle event: ${event}`);
  }
  const snapshot = snapshotForStatus(status);
  if (!snapshot.can({ type: event })) {
    throw new Error(`Event ${event} is not allowed in ${status}`);
  }
  const [next] = transition(noteLifecycleMachine, snapshot, { type: event });
  return statusOfSnapshot(next);
}

const machineId = "noteLifecycle";

function regionOf(status: NoteLifecycleStatus): string {
  const dot = status.indexOf(".");
  return dot === -1 ? status : status.slice(0, dot);
}

function leafOf(status: NoteLifecycleStatus): string | undefined {
  const dot = status.indexOf(".");
  return dot === -1 ? undefined : status.slice(dot + 1);
}

function targetOf(target: NoteLifecycleStatus): string {
  return `#${machineId}.${target}`;
}

interface LeafConfig {
  on: Record<string, string>;
}

interface RegionConfig {
  initial?: string;
  on?: Record<string, string>;
  states?: Record<string, LeafConfig>;
}

function regionConfig(
  region: string,
  leaves: NoteLifecycleStatus[],
): RegionConfig {
  const movesOf = (status: NoteLifecycleStatus): Record<string, string> => {
    const moves: Record<string, string> = {};
    for (const [event, target] of Object.entries(
      lifecycleTransitions[status],
    )) {
      moves[event] = targetOf(target);
    }
    return moves;
  };
  const single = leaves.length === 1 ? leaves[0] : undefined;
  if (single !== undefined && leafOf(single) === undefined) {
    return { on: movesOf(single) };
  }
  const states: Record<string, LeafConfig> = {};
  for (const status of leaves) {
    states[leafOf(status) ?? region] = { on: movesOf(status) };
  }
  const firstLeaf = leaves[0];
  return {
    initial:
      (firstLeaf === undefined ? undefined : leafOf(firstLeaf)) ?? region,
    states,
  };
}

function machineStates(): Record<string, RegionConfig> {
  const grouped = new Map<string, NoteLifecycleStatus[]>();
  for (const status of NOTE_LIFECYCLE_STATUSES) {
    const region = regionOf(status);
    grouped.set(region, [...(grouped.get(region) ?? []), status]);
  }
  const states: Record<string, RegionConfig> = {};
  for (const [region, leaves] of grouped) {
    states[region] = regionConfig(region, leaves);
  }
  return states;
}

export const noteLifecycleMachine = createMachine({
  id: machineId,
  initial: "synced",
  states: machineStates(),
});

function toStateValue(status: NoteLifecycleStatus): StateValue {
  const dot = status.indexOf(".");
  if (dot === -1) {
    return { [status]: {} };
  }
  return { [status.slice(0, dot)]: status.slice(dot + 1) };
}

export function snapshotForStatus(status: NoteLifecycleStatus) {
  return noteLifecycleMachine.resolveState({ value: toStateValue(status) });
}

const knownStatuses = new Set<string>(NOTE_LIFECYCLE_STATUSES);

export function statusOfSnapshot(snapshot: {
  value: StateValue;
}): NoteLifecycleStatus {
  const value = snapshot.value;
  const status =
    typeof value === "string"
      ? value
      : (() => {
          const entries = Object.entries(value);
          if (entries.length !== 1) {
            throw new Error(
              `Unexpected machine value: ${JSON.stringify(value)}`,
            );
          }
          const [entryName, leaf] = entries[0] ?? [];
          return `${entryName ?? "?"}.${typeof leaf === "string" ? leaf : JSON.stringify(leaf)}`;
        })();
  if (!knownStatuses.has(status)) {
    throw new Error(`Unknown lifecycle status: ${status}`);
  }
  return status as NoteLifecycleStatus;
}
