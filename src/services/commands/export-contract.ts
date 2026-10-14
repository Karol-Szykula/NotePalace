import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";

export interface ExportReport {
  changedSincePreview: number;
  created: number;
  enrolled: number;
  forced: number;
  mediaFiles: number;
  skipped: number;
  skippedConflicts: number;
  skippedDeleted: number;
  skippedForSync: number;
  skippedModelMismatch: number;
  skippedUnmapped: number;
  skippedUnreadable: number;
  unchanged: number;
  updated: number;
}

export interface ExecuteExportRequest {
  decisions?: Record<number, boolean>;
  forcedNoteIds?: number[];
  ignoredDirectories: string;
  onProgress?: (processed: number, total: number) => void;
  previewStatuses: Record<number, NoteLifecycleStatus> | undefined;
}
