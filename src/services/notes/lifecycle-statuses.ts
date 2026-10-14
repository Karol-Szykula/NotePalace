export const NOTE_LIFECYCLE_STATUSES = [
  "ankiOnly.neverImported",
  "ankiOnly.fileDeleted",
  "synced.clean",
  "synced.ankiNewer",
  "synced.vaultNewer",
  "synced.diverged",
  "linked.unenrolled",
  "vaultOnly.unexported",
  "vaultOnly.unenrolled",
  "vaultOnly.ankiDeleted",
  "orphaned",
] as const;

export type NoteLifecycleStatus = (typeof NOTE_LIFECYCLE_STATUSES)[number];

export const NOTE_LIFECYCLE_EVENTS = [
  "IMPORT",
  "EXPORT",
  "PULL",
  "PUSH",
  "FORCE_PULL",
  "FORCE_PUSH",
  "RESOLVE_NEWEST",
  "ENROLL",
  "RESURRECT",
  "DELETE_FILE",
  "PURGE",
  "SKIP",
  "CHECK",
] as const;

export type NoteLifecycleEvent = (typeof NOTE_LIFECYCLE_EVENTS)[number];
