import type { NoteLifecycleStatus } from "./lifecycle-statuses";

export type NotePreviewStatus =
  "new" | "newerInAnki" | "newerInVault" | "diverged" | "noFile" | "upToDate";

export function notePreviewStatusFor(
  status: NoteLifecycleStatus,
): NotePreviewStatus {
  switch (status) {
    case "synced.clean":
      return "upToDate";
    case "synced.ankiNewer":
      return "newerInAnki";
    case "synced.vaultNewer":
      return "newerInVault";
    case "synced.diverged":
      return "diverged";
    case "ankiOnly.fileDeleted":
      return "noFile";
    default:
      return "new";
  }
}
