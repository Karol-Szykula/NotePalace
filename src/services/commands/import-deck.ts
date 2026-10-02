import { TFile } from "obsidian";
import type { Vault } from "obsidian";
import type { Anki } from "src/services/anki/anki";
import { withDeckNames } from "src/services/anki/read";
import {
  deckFolder,
  renameIndexedNoteFile,
  resolveExistingNotePath,
  resolveNoteFilePath,
} from "src/services/vault/paths";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import type { FieldMapping } from "src/entities/field-mapping";
import type { VaultNoteIndex } from "src/services/vault/vault";
import {
  ensureFolderExists,
  findVaultNoteBlock,
} from "src/services/vault/vault";
import {
  importDeckMedia,
  rewriteMediaReferences,
} from "src/services/vault/media";
import type { MediaPathMap } from "src/services/vault/media";
import { packForModel, type NotePack } from "src/services/notes/packs";
import {
  isInScope,
  resolveCommandDecision,
} from "src/services/notes/decision-table";
import {
  classifyNoteLifecycle,
  transitionNoteLifecycle,
  type NoteLifecycleRecord,
  type NoteLifecycleStatus,
  type NotePreviewStatus,
} from "src/services/notes/lifecycle";
import {
  serializeYamlNote,
  yamlNoteFileName,
} from "src/services/notes/document";
import { computeContentHash } from "src/services/notes/content-hash";
import {
  buildYamlNoteFields,
  type YamlNoteFields,
} from "src/services/notes/fields";
import { noteMediaFilenames } from "src/services/notes/text";
import { obsidianYamlEngine, type YamlEngine } from "src/services/yaml-engine";

export interface ClassifiedNote {
  isInVaultIndex: boolean;
  note: AnkiNoteInfo;
  previewStatus: NotePreviewStatus;
  status: NoteLifecycleStatus;
  vaultPath?: string;
}

export interface NoteSyncState {
  fallbackRev: number;
  syncedMods: Record<number, number>;
}

function noteSyncRev(sync: NoteSyncState, noteId: number): number {
  return sync.syncedMods[noteId] ?? sync.fallbackRev;
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
  previewStatuses?: Record<number, NoteLifecycleStatus>;
  targetFolder: string;
  vaultNoteIndex?: VaultNoteIndex;
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

function rebuildYamlNoteFields(
  item: { note: AnkiNoteInfo },
  request: ExecuteImportRequest,
  importedPaths: MediaPathMap,
): YamlNoteFields {
  const mapping = request.fieldMappings[item.note.modelName ?? "Unknown"] ?? {};
  const rewrittenFields = Object.fromEntries(
    Object.entries(item.note.fields).map(([name, field]) => [
      name,
      { value: rewriteMediaReferences(field.value, importedPaths) },
    ]),
  );
  const rebuilt = buildYamlNoteFields(
    { ...item.note, fields: rewrittenFields },
    mapping,
  );
  if (rebuilt) {
    return rebuilt;
  }
  return { back: "", front: "", tags: item.note.tags.join(" ") };
}

interface PlannedImport {
  mapping: FieldMapping;
  media: string[];
  note: AnkiNoteInfo;
}

interface ImportDecision {
  changedSincePreview: number;
  forced: number;
  importable: AnkiNoteInfo[];
  skippedLeftToSync: number;
  skippedNewerInVault: number;
}

interface WorkingNotes {
  notes: AnkiNoteInfo[];
  vanished: number;
}

function workingNotesFor(
  request: ExecuteImportRequest,
  selected: AnkiNoteInfo[],
): WorkingNotes {
  if (request.freshNotes === undefined) {
    return { notes: selected, vanished: 0 };
  }
  const freshById = new Map(
    request.freshNotes.map((note) => [note.noteId, note]),
  );
  const notes: AnkiNoteInfo[] = [];
  let vanished = 0;
  for (const note of selected) {
    const fresh = freshById.get(note.noteId);
    if (fresh === undefined) {
      vanished += 1;
    } else {
      notes.push(fresh);
    }
  }
  return { notes, vanished };
}

interface NoteTarget {
  existingFile: TFile | null;
  targetPath: string;
}

type PackResolver = (note: AnkiNoteInfo) => Promise<NotePack | undefined>;

function packResolver(vault: Vault): PackResolver {
  const cache = new Map<string, NotePack | undefined>();
  return async (note) => {
    const modelName = note.modelName ?? "Unknown";
    if (!cache.has(modelName)) {
      cache.set(modelName, await packForModel(vault, modelName));
    }
    return cache.get(modelName);
  };
}

async function packableNotes(
  selected: AnkiNoteInfo[],
  packFor: PackResolver,
): Promise<{ packable: AnkiNoteInfo[]; skippedUnmapped: number }> {
  const packable: AnkiNoteInfo[] = [];
  let skippedUnmapped = 0;
  for (const note of selected) {
    if (await packFor(note)) {
      packable.push(note);
    } else {
      skippedUnmapped += 1;
    }
  }
  return { packable, skippedUnmapped };
}

async function statusForImport(
  vault: Vault,
  request: ExecuteImportRequest,
  note: AnkiNoteInfo,
  yaml: YamlEngine,
): Promise<NoteLifecycleStatus> {
  const block = request.vaultNoteIndex
    ? await findVaultNoteBlock(vault, request.vaultNoteIndex, note.noteId, yaml)
    : null;
  return classifyNoteLifecycle({
    anki: note,
    block:
      block === null
        ? undefined
        : {
            id: block.id,
            hash: await computeContentHash(
              block.front,
              block.back,
              block.tags,
              block.model,
            ),
          },
    record: request.noteLifecycle[note.noteId],
  });
}

function countAsLeftToSync(
  status: NoteLifecycleStatus,
  decision: ImportDecision,
): void {
  if (status === "ankiOnly.fileDeleted") {
    decision.skippedLeftToSync += 1;
    return;
  }
  if (status === "synced.vaultNewer" || status === "synced.diverged") {
    decision.skippedNewerInVault += 1;
  }
}

async function importDecision(
  packable: AnkiNoteInfo[],
  request: ExecuteImportRequest,
  vault: Vault,
  yaml: YamlEngine,
): Promise<ImportDecision> {
  const forcedNoteIds = request.ankiWinsNoteIds ?? [];
  const decision: ImportDecision = {
    changedSincePreview: 0,
    forced: 0,
    importable: [],
    skippedLeftToSync: 0,
    skippedNewerInVault: 0,
  };
  for (const note of packable) {
    const status = await statusForImport(vault, request, note, yaml);
    const previewStatus = request.previewStatuses?.[note.noteId];
    if (previewStatus !== undefined && previewStatus !== status) {
      decision.changedSincePreview += 1;
    }
    const resolved = resolveCommandDecision(
      "import",
      status,
      forcedNoteIds,
      note.noteId,
    );
    if (!isInScope(resolved.act)) {
      countAsLeftToSync(status, decision);
      continue;
    }
    transitionNoteLifecycle(status, resolved.act);
    if (resolved.forcedFromOutOfScope) {
      decision.forced += 1;
    }
    decision.importable.push(note);
  }
  return decision;
}

function plannedImports(
  importable: AnkiNoteInfo[],
  request: ExecuteImportRequest,
): PlannedImport[] {
  return importable.map((note) => ({
    mapping: request.fieldMappings[note.modelName ?? "Unknown"] ?? {},
    media: noteMediaFilenames(note),
    note,
  }));
}

function folderFor(request: ExecuteImportRequest, item: PlannedImport): string {
  return deckFolder(
    item.note.deckName ?? request.deckName,
    request.targetFolder,
  );
}

function plannedByFolder(
  request: ExecuteImportRequest,
  planned: PlannedImport[],
): Map<string, PlannedImport[]> {
  const byFolder = new Map<string, PlannedImport[]>();
  for (const item of planned) {
    const folder = folderFor(request, item);
    byFolder.set(folder, [...(byFolder.get(folder) ?? []), item]);
  }
  return byFolder;
}

function mediaNames(planned: PlannedImport[]): string[] {
  return [...new Set(planned.flatMap((item) => item.media))];
}

async function freshFilePath(
  vault: Vault,
  request: ExecuteImportRequest,
  folder: string,
  item: PlannedImport,
  front: string,
  takenPaths: Set<string>,
): Promise<NoteTarget> {
  const freshFileName = yamlNoteFileName(
    request.deckName,
    front,
    item.note.noteId,
  );
  const indexedPath = await resolveExistingNotePath(
    vault,
    request.vaultNoteIndex,
    item.note.noteId,
    takenPaths,
  );
  if (indexedPath !== null) {
    const renamed = await renameIndexedNoteFile(
      vault,
      indexedPath,
      freshFileName,
      takenPaths,
    );
    if (renamed !== null) {
      return { existingFile: renamed.file, targetPath: renamed.path };
    }
  }
  const targetPath = await resolveNoteFilePath(
    vault,
    folder,
    freshFileName,
    item.note.noteId,
    takenPaths,
  );
  const existing = await vault.getAbstractFileByPath(targetPath);
  return {
    existingFile: existing instanceof TFile ? existing : null,
    targetPath,
  };
}

async function serializedNote(
  item: PlannedImport,
  fields: YamlNoteFields,
  yaml: YamlEngine,
): Promise<{ content: string; hash: string }> {
  const model = item.note.modelName ?? "Unknown";
  return {
    content: serializeYamlNote(
      {
        back: fields.back,
        extra: {},
        front: fields.front,
        id: item.note.noteId,
        model,
        tags: fields.tags,
      },
      yaml,
    ),
    hash: await computeContentHash(
      fields.front,
      fields.back,
      fields.tags,
      model,
    ),
  };
}

interface ImportWriteContext {
  importedPaths: Record<string, string>;
  report: ImportExecutionReport;
  request: ExecuteImportRequest;
  takenPaths: Set<string>;
  vault: Vault;
  yaml: YamlEngine;
}

interface WriteProgress {
  processed: number;
  total: number;
}

async function writeImportedNote(
  context: ImportWriteContext,
  folder: string,
  item: PlannedImport,
): Promise<{ hash: string; isNewFile: boolean }> {
  const { request, vault, yaml } = context;
  const fields = rebuildYamlNoteFields(item, request, context.importedPaths);
  const { content, hash } = await serializedNote(item, fields, yaml);
  const { existingFile, targetPath } = await freshFilePath(
    vault,
    request,
    folder,
    item,
    fields.front,
    context.takenPaths,
  );
  if (existingFile !== null) {
    await vault.modify(existingFile, content);
    return { hash, isNewFile: false };
  }
  await vault.create(targetPath, content);
  return { hash, isNewFile: true };
}

async function writeImportedNotes(
  context: ImportWriteContext,
  folder: string,
  planned: PlannedImport[],
  progress: WriteProgress,
): Promise<void> {
  for (const item of planned) {
    if (context.request.isCancelled?.()) {
      context.report.cancelled = true;
      return;
    }
    const { hash, isNewFile } = await writeImportedNote(context, folder, item);
    if (isNewFile) {
      context.report.created += 1;
    } else {
      context.report.overwritten += 1;
    }
    context.report.syncedNotes[item.note.noteId] = item.note.mod ?? 0;
    context.report.syncedHashes[item.note.noteId] = hash;
    progress.processed += 1;
    context.request.onProgress?.(progress.processed, progress.total);
  }
}

async function writePlannedFolders(
  context: ImportWriteContext,
  byFolder: Map<string, PlannedImport[]>,
  total: number,
): Promise<void> {
  const progress: WriteProgress = { processed: 0, total };
  for (const [folder, items] of byFolder) {
    await ensureFolderExists(context.vault, folder);
    await writeImportedNotes(context, folder, items, progress);
  }
}

export async function executeImport(
  anki: Anki,
  vault: Vault,
  request: ExecuteImportRequest,
  yaml: YamlEngine = obsidianYamlEngine,
): Promise<ImportExecutionReport> {
  const selected = request.notes.filter(
    (note) => request.decisions[note.noteId] ?? false,
  );
  const selectedForRun = workingNotesFor(request, selected);
  const working = {
    ...selectedForRun,
    notes: await withDeckNames(anki, selectedForRun.notes),
  };
  const { packable, skippedUnmapped } = await packableNotes(
    working.notes,
    packResolver(vault),
  );
  const decision = await importDecision(packable, request, vault, yaml);
  const planned = plannedImports(decision.importable, request);
  const media = await importDeckMedia(
    anki,
    vault,
    request.deckName,
    mediaNames(planned),
  );
  const byFolder = plannedByFolder(request, planned);
  const report: ImportExecutionReport = {
    cancelled: false,
    changedSincePreview: decision.changedSincePreview,
    created: 0,
    folders: byFolder.size,
    forced: decision.forced,
    mediaFiles: Object.keys(media.written).length,
    mediaNotImported: media.notImported.length,
    overwritten: 0,
    skipped: request.notes.length - selected.length,
    skippedLeftToSync: decision.skippedLeftToSync,
    skippedNewerInVault: decision.skippedNewerInVault,
    skippedUnmapped,
    syncedHashes: {},
    syncedNotes: {},
    vanishedFromDeck: working.vanished,
  };
  await writePlannedFolders(
    {
      importedPaths: media.written,
      report,
      request,
      takenPaths: new Set(),
      vault,
      yaml,
    },
    byFolder,
    planned.length,
  );
  return report;
}
