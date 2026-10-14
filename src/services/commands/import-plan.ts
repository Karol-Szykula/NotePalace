import type { Vault } from "obsidian";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import type { FieldMapping } from "src/entities/field-mapping";
import type { ExecuteImportRequest } from "src/services/commands/import-contract";
import { computeContentHash } from "src/services/notes/content-hash";
import {
  isInScope,
  resolveCommandDecision,
} from "src/services/notes/decision-table";
import { buildYamlNoteFields } from "src/services/notes/fields";
import {
  classifyNoteLifecycle,
  transitionNoteLifecycle,
  type NoteLifecycleStatus,
} from "src/services/notes/lifecycle";
import { packForModel, type NotePack } from "src/services/notes/packs";
import { noteMediaFilenames } from "src/services/notes/text";
import { deckFolder } from "src/services/vault/paths";
import { findVaultNoteBlock } from "src/services/vault/vault";
import type { YamlEngine } from "src/services/yaml-engine";

export interface PlannedImport {
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

export function workingNotesFor(
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

type PackResolver = (note: AnkiNoteInfo) => Promise<NotePack | undefined>;

type MappingAvailability = (note: AnkiNoteInfo) => Promise<boolean>;

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

export function mappingAvailability(
  vault: Vault,
  request: ExecuteImportRequest,
): MappingAvailability {
  const packFor = packResolver(vault);
  return async (note) => {
    const modelName = note.modelName ?? "Unknown";
    const mapping = request.fieldMappings[modelName];
    if (mapping === undefined) {
      return (await packFor(note)) !== undefined;
    }
    return buildYamlNoteFields(note, mapping) !== null;
  };
}

export async function packableNotes(
  selected: AnkiNoteInfo[],
  hasMapping: MappingAvailability,
): Promise<{ packable: AnkiNoteInfo[]; skippedUnmapped: number }> {
  const packable: AnkiNoteInfo[] = [];
  let skippedUnmapped = 0;
  for (const note of selected) {
    if (await hasMapping(note)) {
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
  const hash = block
    ? await computeContentHash(block.front, block.back, block.tags, block.model)
    : undefined;
  let blockInput: { id: number | undefined; hash?: string } | undefined;
  if (block !== null && hash !== undefined) {
    blockInput = { id: block.id, hash };
  } else if (block !== null) {
    blockInput = { id: block.id };
  } else {
    blockInput = undefined;
  }
  return classifyNoteLifecycle({
    anki: note,
    block: blockInput,
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

export async function importDecision(
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

export function plannedImports(
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

export function plannedByFolder(
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

export function mediaNames(planned: PlannedImport[]): string[] {
  return [...new Set(planned.flatMap((item) => item.media))];
}
