import type { AnkiNoteInfo } from "src/entities/anki-note";
import type { FieldMapping } from "src/entities/field-mapping";
import type {
  NoteLifecycleRecord,
  NoteLifecycleStatus,
  NotePreviewStatus,
} from "src/services/notes/lifecycle";
import type { VaultNoteIndex } from "src/services/vault/vault";

export interface ClassifiedNote {
  isInVaultIndex: boolean;
  note: AnkiNoteInfo;
  previewStatus: NotePreviewStatus;
  status: NoteLifecycleStatus;
  vaultPath?: string | undefined;
}

export interface NoteSyncState {
  syncedMods: Record<number, number>;
}

function noteSyncRev(sync: NoteSyncState, noteId: number): number {
  return sync.syncedMods[noteId] ?? 0;
}

export function isNoteUpdatedSince(
  note: AnkiNoteInfo,
  sync: NoteSyncState,
): boolean {
  return (note.mod ?? 0) > noteSyncRev(sync, note.noteId);
}

export interface ExecuteImportRequest {
  ankiWinsNoteIds?: number[];
  decisions: Record<number, boolean>;
  deckName: string;
  fieldMappings: Record<string, FieldMapping>;
  freshNotes?: AnkiNoteInfo[];
  isCancelled?: () => boolean;
  noteLifecycle: Record<number, NoteLifecycleRecord>;
  notes: AnkiNoteInfo[];
  onProgress?: (processed: number, total: number) => void;
  previewStatuses: Record<number, NoteLifecycleStatus> | undefined;
  targetFolder: string;
  vaultNoteIndex?: VaultNoteIndex | undefined;
}

export interface ImportExecutionReport {
  cancelled: boolean;
  changedSincePreview: number;
  created: number;
  folders: number;
  forced: number;
  mediaFiles: number;
  mediaNotImported: number;
  overwritten: number;
  skipped: number;
  skippedLeftToSync: number;
  skippedNewerInVault: number;
  skippedUnmapped: number;
  syncedHashes: Record<number, string>;
  syncedNotes: Record<number, number>;
  vanishedFromDeck: number;
}
