import {
  createdPattern,
  overwrittenPattern,
} from "src/gui/note-transfer-wizard/shared/utils/summary-patterns";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import type { ImportStatusFixtureSpec } from "./status-fixtures";
import { importStatusFixtures } from "./status-fixtures";

export interface ImportStatusCase extends ImportStatusFixtureSpec {
  readonly expectFileCreated?: boolean;
  readonly outcome: RegExp;
}

/** Status the import wizard never reaches: notes always come from Anki. */
export const unreachableInImportStatus: ImportStatusCase = {
  ankiMod: 0,
  buildFixture: () => {
    throw new Error("Not reachable in the import wizard.");
  },
  outcome: /unreachable/,
};

export const importStatusMap: Record<NoteLifecycleStatus, ImportStatusCase> = {
  "ankiOnly.neverImported": {
    ...importStatusFixtures["ankiOnly.neverImported"],
    expectFileCreated: true,
    outcome: createdPattern,
  },
  "synced.ankiNewer": {
    ...importStatusFixtures["synced.ankiNewer"],
    outcome: overwrittenPattern,
  },
  "linked.unenrolled": {
    ...importStatusFixtures["linked.unenrolled"],
    outcome: overwrittenPattern,
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
