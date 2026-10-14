import { TFile } from "obsidian";
import type { Vault } from "obsidian";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import type {
  ExecuteImportRequest,
  ImportExecutionReport,
} from "src/services/commands/import-contract";
import type { PlannedImport } from "src/services/commands/import-plan";
import { computeContentHash } from "src/services/notes/content-hash";
import {
  serializeYamlNote,
  yamlNoteFileName,
} from "src/services/notes/document";
import {
  buildYamlNoteFields,
  type YamlNoteFields,
} from "src/services/notes/fields";
import {
  rewriteMediaReferences,
  type MediaPathMap,
} from "src/services/vault/media";
import {
  renameIndexedNoteFile,
  resolveExistingNotePath,
  resolveNoteFilePath,
} from "src/services/vault/paths";
import { ensureFolderExists } from "src/services/vault/vault";
import type { YamlEngine } from "src/services/yaml-engine";

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

interface NoteTarget {
  existingFile: TFile | null;
  targetPath: string;
}

async function freshFilePath(
  context: ImportWriteContext,
  folder: string,
  item: PlannedImport,
  front: string,
): Promise<NoteTarget> {
  const { request, takenPaths, vault } = context;
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
    context,
    folder,
    item,
    fields.front,
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

export async function writePlannedFolders(
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
