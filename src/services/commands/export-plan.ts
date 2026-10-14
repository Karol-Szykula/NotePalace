import type { Vault } from "obsidian";
import type { ISettings } from "src/conf/settings";
import type { AnkiNote, AnkiNoteInfo } from "src/entities/anki-note";
import type { Anki } from "src/services/anki/anki";
import { fetchNotesByIdMap } from "src/services/anki/read";
import {
  ankiContentHash,
  blockContentHash,
} from "src/services/notes/content-hash";
import {
  buildCreatedNote,
  buildPushedNote,
  mediaFileCount,
  mediaNameAllocator,
  type MediaNameAllocator,
  type PushedNote,
  type SyncedBaseline,
} from "src/services/commands/push";
import {
  syncedCleanRecord,
  transitionNoteLifecycle,
  type NoteLifecycleEvent,
  type NoteLifecycleStatus,
} from "src/services/notes/lifecycle";
import type { NotePack } from "src/services/notes/packs";
import { packForModel } from "src/services/notes/packs";
import {
  isInScope,
  resolveCommandDecision,
  type ResolvedCommandDecision,
} from "src/services/notes/decision-table";
import type {
  BlockLocation,
  BlockScan,
} from "src/services/commands/export-scan";
import {
  classifyVaultBlock,
  indexedBlockIds,
} from "src/services/commands/export-scan";
import type {
  ExportReport,
  ExecuteExportRequest,
} from "src/services/commands/export-contract";

export interface IdAssignment {
  location: BlockLocation;
  noteId: number;
}

interface CreateCandidate {
  hash: string;
  location: BlockLocation;
  note: AnkiNote;
}

export interface ExportPlan {
  creates: CreateCandidate[];
  idWrites: IdAssignment[];
  pushes: PushedNote[];
  report: ExportReport;
  synced: SyncedBaseline[];
}

type PackResolver = (modelName: string) => Promise<NotePack | undefined>;

interface BlockAction {
  act: NoteLifecycleEvent;
  anki: AnkiNoteInfo | undefined;
  pack: NotePack;
}

interface BlockPlanContext {
  ankiNotes: Map<number, AnkiNoteInfo>;
  mediaAllocator: MediaNameAllocator;
  packFor: PackResolver;
  settings: ISettings;
  vault: Vault;
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

function packResolverFor(vault: Vault): PackResolver {
  const cache = new Map<string, NotePack | undefined>();
  return async (modelName) => {
    if (!cache.has(modelName)) {
      cache.set(modelName, await packForModel(vault, modelName));
    }
    return cache.get(modelName);
  };
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
  const status = await classifyVaultBlock(location.block, anki, record);
  countPreviewChange(location, status, plan, request);
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
  countForced(decision, plan);
  const pack = await context.packFor(location.block.model);
  if (pack === undefined) {
    plan.report.skippedUnmapped += 1;
    return;
  }
  await applyBlockDecision(
    context,
    location,
    { act: decision.act, anki, pack },
    plan,
  );
}

function countPreviewChange(
  location: BlockLocation,
  status: NoteLifecycleStatus,
  plan: ExportPlan,
  request: ExecuteExportRequest,
): void {
  const previewStatus = previewStatusOf(location, request);
  if (previewStatus !== undefined && previewStatus !== status) {
    plan.report.changedSincePreview += 1;
  }
}

function countForced(
  decision: ResolvedCommandDecision,
  plan: ExportPlan,
): void {
  if (decision.forcedFromOutOfScope) {
    plan.report.forced += 1;
  }
}

async function applyBlockDecision(
  context: BlockPlanContext,
  location: BlockLocation,
  action: BlockAction,
  plan: ExportPlan,
): Promise<void> {
  const { act, anki, pack } = action;
  if (act === "ENROLL" && anki !== undefined) {
    await enrollLinkedBlock(
      context.settings,
      location,
      anki,
      pack,
      plan.report,
    );
    return;
  }
  if (act === "CHECK") {
    plan.report.unchanged += 1;
    return;
  }
  if (isPushAct(act) && anki !== undefined) {
    plan.pushes.push(
      await buildPushedNote(
        context.vault,
        location,
        pack,
        anki,
        context.mediaAllocator,
      ),
    );
    return;
  }
  if (act === "EXPORT") {
    const created = await buildCreatedNote(
      context.vault,
      location,
      pack,
      context.mediaAllocator,
    );
    plan.creates.push({ location, ...created });
  }
}

function isPushAct(act: NoteLifecycleEvent): boolean {
  return act === "PUSH" || act === "FORCE_PUSH";
}

export async function planExport(
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
    mediaAllocator: mediaNameAllocator(),
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

export function plannedNotes(plan: ExportPlan): AnkiNote[] {
  return [
    ...plan.creates.map((candidate) => candidate.note),
    ...plan.pushes.map((candidate) => candidate.note),
  ];
}
