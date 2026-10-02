import type { TFile } from "obsidian";
import type { Vault } from "obsidian";
import type { AnkiNote, AnkiNoteInfo } from "src/entities/anki-note";
import type { ISettings } from "src/conf/settings";
import type { Anki } from "src/services/anki/anki";
import { assureModels } from "src/services/anki/anki-models";
import { fetchNotesByIdMap } from "src/services/anki/read";
import {
  ankiContentHash,
  blockContentHash,
} from "src/services/notes/content-hash";
import {
  buildCreatedNote,
  buildPushedNote,
  mediaFileCount,
  pushNotesToAnki,
  recordSyncedBaselines,
  uploadNoteMedia,
  type PushedNote,
  type SyncedBaseline,
} from "src/services/commands/push";
import {
  classifyNoteLifecycle,
  syncedCleanRecord,
  transitionNoteLifecycle,
  type NoteLifecycleRecord,
  type NoteLifecycleStatus,
} from "src/services/notes/lifecycle";
import type { NotePack } from "src/services/notes/packs";
import { packForModel } from "src/services/notes/packs";
import {
  isInScope,
  resolveCommandDecision,
} from "src/services/notes/decision-table";
import { deckForPath, isIgnoredPath } from "src/services/vault/vault";
import { parseNoteForm } from "src/services/notes/document";
import { obsidianYamlEngine, type YamlEngine } from "src/services/yaml-engine";
import {
  createNoteFencePattern,
  serializeYamlNote,
  type YamlNote,
} from "src/services/notes/document";

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
  previewStatuses?: Record<number, NoteLifecycleStatus>;
}

interface BlockScan {
  locations: BlockLocation[];
  unreadable: number;
}

interface BlockLocation {
  block: YamlNote;
  deckName: string;
  end: number;
  file: TFile;
  start: number;
}

export async function scanVaultBlocks(
  vault: Vault,
  ignoredDirectories: string,
  yaml: YamlEngine,
): Promise<BlockScan> {
  const locations: BlockLocation[] = [];
  let unreadable = 0;
  for (const file of vault.getMarkdownFiles()) {
    if (isIgnoredPath(file.path, ignoredDirectories)) {
      continue;
    }
    const content = await vault.read(file);
    const deckName = deckForPath(file.path);
    const pattern = createNoteFencePattern();
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      try {
        locations.push({
          block: parseNoteForm(match[1] ?? "", yaml),
          deckName,
          end: pattern.lastIndex,
          file,
          start: match.index,
        });
      } catch {
        unreadable += 1;
        continue;
      }
    }
  }
  return { locations, unreadable };
}

async function ensureDecks(anki: Anki, deckNames: string[]): Promise<void> {
  const known = new Set(await anki.getDeckNames());
  for (const deckName of deckNames) {
    if (known.has(deckName)) {
      continue;
    }
    await anki.createDeck(deckName);
    known.add(deckName);
  }
}

async function writeBackIds(
  vault: Vault,
  assignments: { location: BlockLocation; noteId: number }[],
  yaml: YamlEngine,
): Promise<void> {
  const byFile = new Map<
    TFile,
    { location: BlockLocation; noteId: number }[]
  >();
  for (const assignment of assignments) {
    const group = byFile.get(assignment.location.file) ?? [];
    group.push(assignment);
    byFile.set(assignment.location.file, group);
  }
  for (const [file, group] of byFile) {
    const content = await vault.read(file);
    let rewritten = content;
    for (const { location, noteId } of [...group].sort(
      (first, second) => second.location.start - first.location.start,
    )) {
      const block = serializeYamlNote({ ...location.block, id: noteId }, yaml);
      rewritten =
        rewritten.slice(0, location.start) +
        block +
        rewritten.slice(location.end);
    }
    await vault.modify(file, rewritten);
  }
}

function emptyExportReport(): ExportReport {
  return {
    changedSincePreview: 0,
    created: 0,
    enrolled: 0,
    forced: 0,
    mediaFiles: 0,
    skipped: 0,
    skippedConflicts: 0,
    skippedDeleted: 0,
    skippedForSync: 0,
    skippedModelMismatch: 0,
    skippedUnmapped: 0,
    skippedUnreadable: 0,
    unchanged: 0,
    updated: 0,
  };
}

interface IdAssignment {
  location: BlockLocation;
  noteId: number;
}

interface CreateCandidate {
  hash: string;
  location: BlockLocation;
  note: AnkiNote;
}

interface ExportPlan {
  creates: CreateCandidate[];
  idWrites: IdAssignment[];
  pushes: PushedNote[];
  report: ExportReport;
  synced: SyncedBaseline[];
}

type PackResolver = (modelName: string) => Promise<NotePack | undefined>;

function indexedBlockIds(locations: BlockLocation[]): number[] {
  return [
    ...new Set(
      locations
        .map((location) => location.block.id)
        .filter((id): id is number => id !== undefined),
    ),
  ];
}

function packResolverFor(vault: Vault): PackResolver {
  const cache = new Map<string, NotePack | undefined>();
  return async (modelName) => {
    if (!cache.has(modelName)) {
      cache.set(modelName, await packForModel(vault, modelName));
    }
    return cache.get(modelName);
  };
}

export async function classifyVaultBlock(
  block: YamlNote,
  anki: AnkiNoteInfo | undefined,
  record: NoteLifecycleRecord | undefined,
): Promise<NoteLifecycleStatus> {
  return classifyNoteLifecycle({
    anki,
    block: {
      id: block.id,
      hash: await blockContentHash(block),
    },
    record,
  });
}

async function lifecycleStatusForBlock(
  location: BlockLocation,
  anki: AnkiNoteInfo | undefined,
  record: NoteLifecycleRecord | undefined,
): Promise<NoteLifecycleStatus> {
  return classifyVaultBlock(location.block, anki, record);
}

function countSkip(report: ExportReport, status: NoteLifecycleStatus): void {
  if (status === "vaultOnly.ankiDeleted" || status === "orphaned") {
    report.skippedDeleted += 1;
    return;
  }
  if (status === "synced.ankiNewer" || status === "synced.diverged") {
    report.skippedForSync += 1;
  }
}

async function enrollLinkedBlock(
  settings: ISettings,
  location: BlockLocation,
  anki: AnkiNoteInfo,
  pack: NotePack,
  report: ExportReport,
): Promise<void> {
  const fromAnki = await ankiContentHash(anki, pack.mapping);
  const fromVault = await blockContentHash(location.block);
  settings.noteLifecycle[anki.noteId] = syncedCleanRecord(
    anki.mod ?? 0,
    fromAnki === fromVault ? fromVault : fromAnki,
    Date.now(),
  );
  report.enrolled += 1;
}

interface BlockPlanContext {
  ankiNotes: Map<number, AnkiNoteInfo>;
  packFor: PackResolver;
  settings: ISettings;
  vault: Vault;
}

function isBlockDeselected(
  location: BlockLocation,
  request: ExecuteExportRequest,
): boolean {
  const id = location.block.id;
  return id !== undefined && request.decisions?.[id] === false;
}

function previewStatusOf(
  location: BlockLocation,
  request: ExecuteExportRequest,
): NoteLifecycleStatus | undefined {
  const id = location.block.id;
  return id === undefined ? undefined : request.previewStatuses?.[id];
}

async function planBlock(
  context: BlockPlanContext,
  location: BlockLocation,
  plan: ExportPlan,
  request: ExecuteExportRequest,
): Promise<void> {
  if (isBlockDeselected(location, request)) {
    plan.report.skipped += 1;
    return;
  }
  const id = location.block.id;
  const anki = context.ankiNotes.get(id ?? -1);
  const record =
    id === undefined ? undefined : context.settings.noteLifecycle[id];
  const status = await lifecycleStatusForBlock(location, anki, record);
  const previewStatus = previewStatusOf(location, request);
  if (previewStatus !== undefined && previewStatus !== status) {
    plan.report.changedSincePreview += 1;
  }
  const decision = resolveCommandDecision(
    "export",
    status,
    request.forcedNoteIds,
    id,
  );
  if (!isInScope(decision.act)) {
    countSkip(plan.report, status);
    return;
  }
  transitionNoteLifecycle(status, decision.act);
  if (decision.forcedFromOutOfScope) {
    plan.report.forced += 1;
  }
  const pack = await context.packFor(location.block.model);
  if (pack === undefined) {
    plan.report.skippedUnmapped += 1;
    return;
  }
  if (decision.act === "ENROLL" && anki !== undefined) {
    await enrollLinkedBlock(
      context.settings,
      location,
      anki,
      pack,
      plan.report,
    );
  }
  if (decision.act === "CHECK") {
    plan.report.unchanged += 1;
    return;
  }
  if (
    (decision.act === "PUSH" || decision.act === "FORCE_PUSH") &&
    anki !== undefined
  ) {
    plan.pushes.push(
      await buildPushedNote(context.vault, location, pack, anki),
    );
    return;
  }
  if (decision.act === "EXPORT") {
    const created = await buildCreatedNote(context.vault, location, pack);
    plan.creates.push({ location, ...created });
  }
}

async function planExport(
  anki: Anki,
  vault: Vault,
  settings: ISettings,
  scan: BlockScan,
  request: ExecuteExportRequest,
): Promise<ExportPlan> {
  const plan: ExportPlan = {
    creates: [],
    idWrites: [],
    pushes: [],
    report: emptyExportReport(),
    synced: [],
  };
  const context: BlockPlanContext = {
    ankiNotes: await fetchNotesByIdMap(anki, indexedBlockIds(scan.locations)),
    packFor: packResolverFor(vault),
    settings,
    vault,
  };
  for (const [index, location] of scan.locations.entries()) {
    await planBlock(context, location, plan, request);
    request.onProgress?.(index + 1, scan.locations.length);
  }
  plan.report.mediaFiles = mediaFileCount(plannedNotes(plan));
  plan.report.skippedUnreadable = scan.unreadable;
  return plan;
}

function plannedNotes(plan: ExportPlan): AnkiNote[] {
  return [
    ...plan.creates.map((candidate) => candidate.note),
    ...plan.pushes.map((candidate) => candidate.note),
  ];
}

async function uploadPlannedMedia(anki: Anki, plan: ExportPlan): Promise<void> {
  await uploadNoteMedia(anki, plannedNotes(plan));
}

function decksForCreates(plan: ExportPlan): string[] {
  return [...new Set(plan.creates.map((candidate) => candidate.note.deckName))];
}

function modelsForCreates(plan: ExportPlan): string[] {
  return [
    ...new Set(plan.creates.map((candidate) => candidate.note.modelName)),
  ];
}

async function assurePlannedModels(
  anki: Anki,
  plan: ExportPlan,
): Promise<void> {
  const assurance = await assureModels(anki, modelsForCreates(plan));
  if (assurance.mismatched.length === 0) {
    return;
  }
  const mismatched = new Set(
    assurance.mismatched.map((mismatch) => mismatch.modelName),
  );
  const kept = plan.creates.filter(
    (candidate) => !mismatched.has(candidate.note.modelName),
  );
  plan.report.skippedModelMismatch += plan.creates.length - kept.length;
  plan.creates = kept;
}

async function createPlannedNotes(anki: Anki, plan: ExportPlan): Promise<void> {
  if (plan.creates.length === 0) {
    return;
  }
  await ensureDecks(anki, decksForCreates(plan));
  const noteIds = await anki.addNotes(
    plan.creates.map((candidate) => candidate.note),
  );
  plan.creates.forEach((candidate, index) => {
    const noteId = noteIds[index];
    if (noteId === undefined || noteId < 0) {
      plan.report.skippedConflicts += 1;
      return;
    }
    plan.report.created += 1;
    plan.idWrites.push({ location: candidate.location, noteId });
    plan.synced.push({ hash: candidate.hash, noteId });
  });
}

async function pushPlannedNotes(anki: Anki, plan: ExportPlan): Promise<void> {
  await pushNotesToAnki(anki, plan.pushes);
  for (const { hash, source } of plan.pushes) {
    plan.report.updated += 1;
    plan.synced.push({ hash, noteId: source.noteId });
  }
}

export async function executeExport(
  anki: Anki,
  vault: Vault,
  settings: ISettings,
  request: ExecuteExportRequest,
  yaml: YamlEngine = obsidianYamlEngine,
): Promise<ExportReport> {
  const scan = await scanVaultBlocks(vault, request.ignoredDirectories, yaml);
  const plan = await planExport(anki, vault, settings, scan, request);
  await assurePlannedModels(anki, plan);
  await uploadPlannedMedia(anki, plan);
  await createPlannedNotes(anki, plan);
  await pushPlannedNotes(anki, plan);
  await recordSyncedBaselines(anki, settings, plan.synced);
  await writeBackIds(vault, plan.idWrites, yaml);
  return plan.report;
}

export function formatExportReport(report: ExportReport): string {
  return (
    `Export: ${report.created} created, ${report.updated} updated, ` +
    `${report.enrolled} enrolled, ${report.unchanged} unchanged, ` +
    `${report.forced} forced, ${report.skipped} skipped, ` +
    `${report.mediaFiles} media files, ${report.skippedConflicts} skipped as conflicts, ` +
    `${report.skippedDeleted} skipped as deleted, ` +
    `${report.skippedForSync} left to Sync, ` +
    `${report.skippedModelMismatch} skipped on model mismatch, ` +
    `${report.skippedUnmapped} skipped without pack, ` +
    `${report.skippedUnreadable} skipped unreadable`
  );
}
