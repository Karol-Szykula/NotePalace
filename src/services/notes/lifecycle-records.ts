import type { NoteLifecycleStatus } from "./lifecycle-statuses";

export interface NoteLifecycleRecord {
  deletedAt?: number;
  lastHash: string;
  lastMod: number;
  status: NoteLifecycleStatus;
  updatedAt: number;
  v: number;
}

const noteLifecycleRecordVersion = 1;

export function syncedCleanRecord(
  lastMod: number,
  lastHash: string,
  updatedAt: number = Date.now(),
): NoteLifecycleRecord {
  return {
    lastHash,
    lastMod,
    status: "synced.clean",
    updatedAt,
    v: noteLifecycleRecordVersion,
  };
}
