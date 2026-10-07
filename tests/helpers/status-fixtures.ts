import type { AnkiNoteInfo } from "src/entities/anki-note";
import { computeContentHash } from "src/services/notes/content-hash";
import type { NoteLifecycleRecord } from "src/services/notes/lifecycle";

interface ImportStatusFixture {
  readonly ankiMod: number;
  readonly files: Record<string, string>;
  readonly noteLifecycle: Record<number, NoteLifecycleRecord>;
}

export interface ImportStatusFixtureSpec {
  readonly ankiMod: number;
  readonly buildFixture: (id: number) => Promise<ImportStatusFixture>;
}

export type ReachableImportStatus =
  | "ankiOnly.neverImported"
  | "ankiOnly.fileDeleted"
  | "linked.unenrolled"
  | "synced.ankiNewer"
  | "synced.clean"
  | "synced.diverged"
  | "synced.vaultNewer";

const importNoteFields = {
  Back: { value: "<p>4</p>" },
  Front: { value: "<p>What is 2+2?</p>" },
};

const cleanNoteFields = {
  Back: { value: "A" },
  Front: { value: "Q" },
};

export function basicAnkiNote(noteId: number, mod: number): AnkiNoteInfo {
  return {
    cards: [11],
    fields: importNoteFields,
    modelName: "Basic",
    mod,
    noteId,
    tags: [],
  };
}

export function cleanAnkiNote(noteId: number, mod: number): AnkiNoteInfo {
  return {
    cards: [11],
    fields: cleanNoteFields,
    modelName: "Basic",
    mod,
    noteId,
    tags: [],
  };
}

function importedNoteForm(noteId: number, front = "Q"): string {
  return [
    "```note-form",
    `front: ${front}`,
    "back: A",
    `id: ${noteId}`,
    "```",
    "",
  ].join("\n");
}

async function cleanRecordWithHash(
  lastMod: number,
): Promise<NoteLifecycleRecord> {
  const lastHash = await computeContentHash("Q", "A", "", "Basic");
  return {
    lastHash,
    lastMod,
    status: "synced.clean",
    updatedAt: 100,
    v: 1,
  };
}

async function neverImportedFixture(): Promise<ImportStatusFixture> {
  return { ankiMod: 100, files: {}, noteLifecycle: {} };
}

async function ankiNewerFixture(id: number): Promise<ImportStatusFixture> {
  return {
    ankiMod: 600,
    files: { "Newer.md": importedNoteForm(id) },
    noteLifecycle: { [id]: await cleanRecordWithHash(100) },
  };
}

async function unenrolledFixture(id: number): Promise<ImportStatusFixture> {
  return {
    ankiMod: 600,
    files: { "Enrolled.md": importedNoteForm(id) },
    noteLifecycle: {},
  };
}

async function fileDeletedFixture(id: number): Promise<ImportStatusFixture> {
  return {
    ankiMod: 600,
    files: {},
    noteLifecycle: { [id]: await cleanRecordWithHash(100) },
  };
}

async function cleanFixture(id: number): Promise<ImportStatusFixture> {
  return {
    ankiMod: 100,
    files: { "UpToDate.md": importedNoteForm(id) },
    noteLifecycle: { [id]: await cleanRecordWithHash(100) },
  };
}

async function vaultNewerFixture(id: number): Promise<ImportStatusFixture> {
  return {
    ankiMod: 100,
    files: { "VaultNewer.md": importedNoteForm(id, "Q edited") },
    noteLifecycle: { [id]: await cleanRecordWithHash(100) },
  };
}

async function divergedFixture(id: number): Promise<ImportStatusFixture> {
  return {
    ankiMod: 600,
    files: { "Diverged.md": importedNoteForm(id, "Q edited") },
    noteLifecycle: { [id]: await cleanRecordWithHash(100) },
  };
}

export const importStatusFixtures: Record<
  ReachableImportStatus,
  ImportStatusFixtureSpec
> = {
  "ankiOnly.neverImported": {
    ankiMod: 100,
    buildFixture: neverImportedFixture,
  },
  "ankiOnly.fileDeleted": { ankiMod: 600, buildFixture: fileDeletedFixture },
  "linked.unenrolled": { ankiMod: 600, buildFixture: unenrolledFixture },
  "synced.ankiNewer": { ankiMod: 600, buildFixture: ankiNewerFixture },
  "synced.clean": { ankiMod: 100, buildFixture: cleanFixture },
  "synced.diverged": { ankiMod: 600, buildFixture: divergedFixture },
  "synced.vaultNewer": { ankiMod: 100, buildFixture: vaultNewerFixture },
};
