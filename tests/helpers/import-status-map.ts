import { computeContentHash } from "src/services/notes/content-hash";
import type {
  NoteLifecycleRecord,
  NoteLifecycleStatus,
} from "src/services/notes/lifecycle";

interface ImportVaultFixture {
  readonly files?: Record<string, string>;
  readonly noteLifecycle?: Record<number, NoteLifecycleRecord>;
}

export interface ImportStatusCase {
  readonly buildFixture: (id: number) => Promise<ImportVaultFixture>;
  readonly expectFileCreated?: boolean;
  readonly noteMod: number;
  readonly outcome: RegExp;
}

function importedNoteForm(noteId: number): string {
  return [
    "```note-form",
    "front: Q",
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

/** Status the import wizard never reaches: notes always come from Anki. */
export const unreachableInImportStatus: ImportStatusCase = {
  buildFixture: () => {
    throw new Error("Not reachable in the import wizard.");
  },
  noteMod: 0,
  outcome: /unreachable/,
};

export const importStatusMap: Record<NoteLifecycleStatus, ImportStatusCase> = {
  "ankiOnly.neverImported": {
    buildFixture: async () => ({}),
    expectFileCreated: true,
    noteMod: 100,
    outcome: /Created: 1/,
  },
  "synced.ankiNewer": {
    buildFixture: async (id: number) => ({
      files: { "Newer.md": importedNoteForm(id) },
      noteLifecycle: { [id]: await cleanRecordWithHash(100) },
    }),
    noteMod: 600,
    outcome: /overwritten: 1/,
  },
  "linked.unenrolled": {
    buildFixture: async (id: number) => ({
      files: { "Enrolled.md": importedNoteForm(id) },
    }),
    noteMod: 600,
    outcome: /overwritten: 1/,
  },
  "ankiOnly.fileDeleted": unreachableInImportStatus,
  "synced.clean": unreachableInImportStatus,
  "synced.vaultNewer": unreachableInImportStatus,
  "synced.diverged": unreachableInImportStatus,
  "vaultOnly.unexported": unreachableInImportStatus,
  "vaultOnly.unenrolled": unreachableInImportStatus,
  "vaultOnly.ankiDeleted": unreachableInImportStatus,
  orphaned: unreachableInImportStatus,
};
