import {
  createdPattern,
  updatedPattern,
} from "src/gui/note-transfer-wizard/shared/utils/summary-patterns";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import type { ImportStatusFixtureSpec } from "./status-fixtures";
import { importStatusFixtures } from "./status-fixtures";

export interface ExportStatusCase extends ImportStatusFixtureSpec {
  readonly expectFileCreated?: boolean;
  readonly expectFileUpdated?: boolean;
  readonly outcome: RegExp;
}

/** Status the export wizard never reaches: notes always come from the vault. */
export const unreachableInExportStatus: ExportStatusCase = {
  ankiMod: 0,
  buildFixture: () => {
    throw new Error("Not reachable in the export wizard.");
  },
  outcome: /unreachable/,
};

export const exportStatusMap: Record<NoteLifecycleStatus, ExportStatusCase> = {
  "vaultOnly.unexported": {
    ...importStatusFixtures["vaultOnly.unexported"],
    expectFileCreated: true,
    outcome: createdPattern,
  },
  "vaultOnly.unenrolled": {
    ...importStatusFixtures["vaultOnly.unenrolled"],
    outcome: createdPattern, // report shows "Created: 0" for enrollment-only
  },
  "linked.unenrolled": {
    ...importStatusFixtures["linked.unenrolled"],
    outcome: createdPattern, // report shows "Created: 0" for enrollment-only
  },
  "synced.vaultNewer": {
    ...importStatusFixtures["synced.vaultNewer"],
    outcome: updatedPattern,
  },
  "ankiOnly.neverImported": unreachableInExportStatus,
  "ankiOnly.fileDeleted": unreachableInExportStatus,
  "synced.clean": unreachableInExportStatus,
  "synced.ankiNewer": unreachableInExportStatus,
  "synced.diverged": unreachableInExportStatus,
  "vaultOnly.ankiDeleted": unreachableInExportStatus,
  orphaned: unreachableInExportStatus,
};
