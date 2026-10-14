import type { AnkiNoteInfo } from "src/entities/anki-note";
import type { NoteLifecycleRecord } from "./lifecycle-records";
import type { NoteLifecycleStatus } from "./lifecycle-statuses";

export interface LifecycleInputs {
  anki?: AnkiNoteInfo | undefined;
  block?: { id: number | undefined; hash?: string } | undefined;
  record?: NoteLifecycleRecord | undefined;
}

export function classifyNoteLifecycle(
  inputs: LifecycleInputs,
): NoteLifecycleStatus {
  const { anki, block, record } = inputs;
  if (anki === undefined) {
    return classifyWithoutAnki(block, record);
  }
  if (block === undefined) {
    return record === undefined
      ? "ankiOnly.neverImported"
      : "ankiOnly.fileDeleted";
  }
  if (record === undefined) {
    return "linked.unenrolled";
  }
  return syncStatus(
    block.hash !== record.lastHash,
    (anki.mod ?? 0) > record.lastMod,
  );
}

function classifyWithoutAnki(
  block: LifecycleInputs["block"],
  record: NoteLifecycleRecord | undefined,
): NoteLifecycleStatus {
  if (block === undefined) {
    if (record === undefined) {
      throw new Error(
        "Nothing to classify: no anki note, vault block or record",
      );
    }
    return "orphaned";
  }
  if (record === undefined) {
    return block.id === undefined
      ? "vaultOnly.unexported"
      : "vaultOnly.unenrolled";
  }
  return "vaultOnly.ankiDeleted";
}

function syncStatus(
  vaultDirty: boolean,
  ankiDirty: boolean,
): NoteLifecycleStatus {
  if (vaultDirty && ankiDirty) {
    return "synced.diverged";
  }
  if (ankiDirty) {
    return "synced.ankiNewer";
  }
  if (vaultDirty) {
    return "synced.vaultNewer";
  }
  return "synced.clean";
}

export function resolveDeletedFile(
  ankiMod: number | undefined,
  deletedAt: number | undefined,
): "RESURRECT" | "PURGE" {
  if (deletedAt === undefined) {
    return "PURGE";
  }
  return (ankiMod ?? 0) * 1000 > deletedAt ? "RESURRECT" : "PURGE";
}
