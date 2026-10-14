import { TFile } from "obsidian";
import type { Vault } from "obsidian";
import { t } from "src/i18n";
import type { Anki } from "src/services/anki/anki";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import type { DeckImportSnapshot, ISettings } from "src/conf/settings";
import {
  classifyNoteLifecycle,
  resolveDeletedFile,
  syncedCleanRecord,
  transitionNoteLifecycle,
  type NoteLifecycleEvent,
  type NoteLifecycleRecord,
  type NoteLifecycleStatus,
} from "src/services/notes/lifecycle";
import { decisionActFor, isInScope } from "src/services/notes/decision-table";
import {
  buildPushedNote,
  isAnkiNewer,
  pushNotesToAnki,
  recordSyncedBaselines,
  type PushedNote,
} from "src/services/commands/push";
import {
  collectVaultNoteIndex,
  deckForPath,
  findVaultNoteBlock,
  noteFileAt,
  type VaultNoteIndex,
} from "src/services/vault/vault";
import { executeImport } from "src/services/commands/import-deck";
import { resolveDeckName } from "src/services/vault/paths";
import { fetchDeckNotes } from "src/services/anki/read";
import {
  ankiContentHash,
  blockContentHash,
} from "src/services/notes/content-hash";
import { packForModel, type NotePack } from "src/services/notes/packs";
import {
  createNoteFencePattern,
  serializeYamlNote,
  type YamlNote,
} from "src/services/notes/document";
import { parseNoteForm } from "src/services/notes/document";
import { obsidianYamlEngine, type YamlEngine } from "src/services/yaml-engine";

const notesInfoChunkSize = 50;

interface SyncDeckReport {
  deckName: string;
  missing: number;
  pushed: number;
  refreshed: number;
  skippedUnmapped: number;
  upToDate: number;
}

export interface SyncReport {
  decks: SyncDeckReport[];
  deleted: number;
  enrolled: number;
  purgedRecords: number;
}

function emptyDeckReport(deckName: string): SyncDeckReport {
  return {
    deckName,
    missing: 0,
    pushed: 0,
    refreshed: 0,
    skippedUnmapped: 0,
    upToDate: 0,
  };
}

function isNoteTracked(settings: ISettings, noteId: number): boolean {
  return settings.noteLifecycle[noteId] !== undefined;
}

function isVaultNewer(
  note: AnkiNoteInfo,
  file: TFile,
  act: NoteLifecycleEvent,
): boolean {
  return act === "RESOLVE_NEWEST" && !isAnkiNewer(note, file);
}

async function ankiSideHash(
  snapshot: DeckImportSnapshot,
  note: AnkiNoteInfo,
): Promise<string> {
  const mapping = snapshot.fieldMappings[note.modelName ?? "Unknown"] ?? {};
  return ankiContentHash(note, mapping);
}

async function enrollLinkedNote(
  settings: ISettings,
  snapshot: DeckImportSnapshot,
  note: AnkiNoteInfo,
  block: YamlNote,
): Promise<void> {
  const fromAnki = await ankiSideHash(snapshot, note);
  const fromVault = await blockContentHash(block);
  settings.noteLifecycle[note.noteId] = syncedCleanRecord(
    note.mod ?? 0,
    fromAnki === fromVault ? fromVault : fromAnki,
    Date.now(),
  );
}

interface SyncDeckResult {
  deck: SyncDeckReport;
  enrolled: number;
  purged: number;
}

interface DeckScan {
  context: SyncContext;
  counts: SyncDeckReport;
  decisions: Record<number, boolean>;
  eligible: AnkiNoteInfo[];
  enrolled: number;
  purged: number;
}

interface SyncedDeck {
  liveIds: number[];
  result: SyncDeckResult;
}

function forgetRecords(settings: ISettings, noteIds: readonly number[]): void {
  settings.noteLifecycle = Object.fromEntries(
    Object.entries(settings.noteLifecycle).filter(
      ([id]) => !noteIds.includes(Number(id)),
    ),
  );
}

function forgetRecord(settings: ISettings, noteId: number): void {
  forgetRecords(settings, [noteId]);
}

function decideMissingFile(
  settings: ISettings,
  note: AnkiNoteInfo,
  record: NoteLifecycleRecord | undefined,
): "RESURRECT" | "PURGE" {
  const outcome = resolveDeletedFile(note.mod, record?.deletedAt);
  if (outcome === "PURGE") {
    forgetRecord(settings, note.noteId);
  }
  return outcome;
}

interface SyncContext {
  anki: Anki;
  deckNames: string[];
  index: VaultNoteIndex;
  pushes: PushedNote[];
  settings: ISettings;
  vault: Vault;
  yaml: YamlEngine;
}

type PresentStep = "import" | "push" | "upToDate";

async function presentStatus(
  note: AnkiNoteInfo,
  block: YamlNote,
  record: NoteLifecycleRecord | undefined,
): Promise<NoteLifecycleStatus> {
  const hash = await blockContentHash(block);
  const blockInput =
    block.id === undefined
      ? { hash, id: undefined as number | undefined }
      : { id: block.id, hash };
  return classifyNoteLifecycle({ anki: note, block: blockInput, record });
}

async function stepForPresentNote(
  context: SyncContext,
  note: AnkiNoteInfo,
  block: YamlNote,
  file: TFile,
  pack: NotePack,
): Promise<PresentStep> {
  const record = context.settings.noteLifecycle[note.noteId];
  const status = await presentStatus(note, block, record);
  if (status === "synced.clean") {
    return "upToDate";
  }
  const act = decisionActFor("sync", status);
  if (!isInScope(act)) {
    throw new Error(`Sync cannot handle ${status}`);
  }
  transitionNoteLifecycle(status, act);
  if (act === "PUSH" || isVaultNewer(note, file, act)) {
    context.pushes.push(
      await buildPushedNote(
        context.vault,
        {
          block,
          deckName: resolveDeckName(context.deckNames, deckForPath(file.path)),
          file,
        },
        pack,
        note,
      ),
    );
    return "push";
  }
  return "import";
}

function collectStep(
  counts: SyncDeckReport,
  eligible: AnkiNoteInfo[],
  decisions: Record<number, boolean>,
  note: AnkiNoteInfo,
  step: PresentStep,
): void {
  if (step === "upToDate") {
    counts.upToDate += 1;
  } else if (step === "import") {
    eligible.push(note);
    decisions[note.noteId] = true;
  }
}

async function applyPushedNotes(
  anki: Anki,
  settings: ISettings,
  snapshot: DeckImportSnapshot,
  pushes: PushedNote[],
): Promise<void> {
  settings.deckImportSnapshots[snapshot.deckName] = {
    ...snapshot,
    importedAt: Date.now(),
  };
  await pushNotesToAnki(anki, pushes);
  await recordSyncedBaselines(
    anki,
    settings,
    pushes.map((pushed) => ({
      hash: pushed.hash,
      noteId: pushed.source.noteId,
    })),
  );
}

interface SyncScope {
  anki: Anki;
  deckNames: string[];
  index: VaultNoteIndex;
  settings: ISettings;
  vault: Vault;
  yaml: YamlEngine;
}

interface DeckScanInput extends SyncScope {
  snapshot: DeckImportSnapshot;
}

function createDeckScan(input: DeckScanInput): DeckScan {
  return {
    context: {
      anki: input.anki,
      deckNames: input.deckNames,
      index: input.index,
      pushes: [],
      settings: input.settings,
      vault: input.vault,
      yaml: input.yaml,
    },
    counts: emptyDeckReport(input.snapshot.deckName),
    decisions: {},
    eligible: [],
    enrolled: 0,
    purged: 0,
  };
}

async function syncDeckNotes(
  scope: SyncScope,
  snapshot: DeckImportSnapshot,
  notes: AnkiNoteInfo[],
): Promise<SyncDeckResult> {
  const scan = createDeckScan({ ...scope, snapshot });
  for (const note of notes) {
    await scanDeckNote(scan, snapshot, note, scope.index);
  }
  scan.counts.pushed = scan.context.pushes.length;
  await applyPushedNotes(
    scope.anki,
    scope.settings,
    snapshot,
    scan.context.pushes,
  );
  if (scan.eligible.length > 0) {
    scan.counts.refreshed = await importEligibleNotes(
      scope.anki,
      scope.vault,
      scope.settings,
      snapshot,
      scan,
      scope.yaml,
    );
  }
  return { deck: scan.counts, enrolled: scan.enrolled, purged: scan.purged };
}

async function scanDeckNote(
  scan: DeckScan,
  snapshot: DeckImportSnapshot,
  note: AnkiNoteInfo,
  index: VaultNoteIndex,
): Promise<void> {
  const { settings, vault, yaml } = scan.context;
  if (!isNoteTracked(settings, note.noteId)) {
    const linked = await findVaultNoteBlock(vault, index, note.noteId, yaml);
    if (linked === null) {
      return;
    }
    await enrollLinkedNote(settings, snapshot, note, linked);
    scan.enrolled += 1;
  }
  const pack = await packForModel(vault, note.modelName ?? "Unknown");
  if (pack === undefined) {
    scan.counts.skippedUnmapped += 1;
    return;
  }
  const block = await findVaultNoteBlock(vault, index, note.noteId, yaml);
  const file = noteFileAt(vault, index, note.noteId);
  if (file === null) {
    scanMissingFile(scan, note);
    return;
  }
  if (block === null) {
    scan.counts.missing += 1;
    return;
  }
  const step = await stepForPresentNote(scan.context, note, block, file, pack);
  collectStep(scan.counts, scan.eligible, scan.decisions, note, step);
}

function scanMissingFile(scan: DeckScan, note: AnkiNoteInfo): void {
  const record = scan.context.settings.noteLifecycle[note.noteId];
  if (decideMissingFile(scan.context.settings, note, record) === "RESURRECT") {
    scan.eligible.push(note);
    scan.decisions[note.noteId] = true;
    return;
  }
  scan.purged += 1;
}

async function importEligibleNotes(
  anki: Anki,
  vault: Vault,
  settings: ISettings,
  snapshot: DeckImportSnapshot,
  scan: DeckScan,
  yaml: YamlEngine,
): Promise<number> {
  const report = await executeImport(
    anki,
    vault,
    {
      ankiWinsNoteIds: scan.eligible.map((note) => note.noteId),
      decisions: scan.decisions,
      deckName: snapshot.deckName,
      fieldMappings: snapshot.fieldMappings,
      noteLifecycle: settings.noteLifecycle,
      notes: scan.eligible,
      targetFolder: "",
      vaultNoteIndex: scan.context.index,
      previewStatuses: undefined,
    },
    yaml,
  );
  for (const [id, mod] of Object.entries(report.syncedNotes)) {
    const noteId = Number(id);
    settings.noteLifecycle[noteId] = syncedCleanRecord(
      mod,
      report.syncedHashes[noteId] ?? "",
      Date.now(),
    );
  }
  settings.deckImportSnapshots[snapshot.deckName] = {
    ...snapshot,
    importedAt: Date.now(),
  };
  return scan.eligible.length;
}

function parseNoteSafely(content: string, yaml: YamlEngine): YamlNote | null {
  try {
    return parseNoteForm(content, yaml);
  } catch {
    return null;
  }
}

interface NoteFence {
  end: number;
  start: number;
}

function findNoteFence(
  content: string,
  noteId: number,
  yaml: YamlEngine,
): NoteFence | null {
  const pattern = createNoteFencePattern();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    const note = parseNoteSafely(match[1] ?? "", yaml);
    if (note?.id === noteId) {
      return { end: match.index + match[0].length, start: match.index };
    }
  }
  return null;
}

function withoutFence(content: string, fence: NoteFence): string {
  return (content.slice(0, fence.start) + content.slice(fence.end)).replace(
    /\n{3,}/g,
    "\n\n",
  );
}

async function removeNoteFromFile(
  vault: Vault,
  path: string,
  noteId: number,
  yaml: YamlEngine,
): Promise<boolean> {
  const file = vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    return false;
  }
  const content = await vault.read(file);
  const fence = findNoteFence(content, noteId, yaml);
  if (fence === null) {
    return false;
  }
  const updated = withoutFence(content, fence);
  if (updated.trim() === "") {
    await vault.delete(file);
  } else {
    await vault.modify(file, updated);
  }
  return true;
}

async function liveNoteIds(
  anki: Anki,
  liveIds: Set<number>,
  records: ISettings["noteLifecycle"],
): Promise<Set<number>> {
  const candidates = [
    ...Object.keys(records)
      .map(Number)
      .filter((noteId) => !liveIds.has(noteId)),
  ];
  if (candidates.length === 0) {
    return liveIds;
  }
  const stillLive = new Set(liveIds);
  for (let index = 0; index < candidates.length; index += notesInfoChunkSize) {
    const chunk = await anki.getNotes(
      candidates.slice(index, index + notesInfoChunkSize),
    );
    for (const note of chunk) {
      stillLive.add(note.noteId);
    }
  }
  return stillLive;
}

async function deleteVaultBlockFor(
  record: NoteLifecycleRecord,
  noteId: number,
  index: VaultNoteIndex,
  vault: Vault,
  yaml: YamlEngine,
): Promise<boolean> {
  const path = index.get(noteId);
  if (path === undefined) {
    return false;
  }
  const status = classifyNoteLifecycle({
    anki: undefined,
    block: { id: noteId },
    record,
  });
  const act = decisionActFor("sync", status);
  if (!isInScope(act)) {
    throw new Error(`Sync cannot handle ${status}`);
  }
  transitionNoteLifecycle(status, act);
  return removeNoteFromFile(vault, path, noteId, yaml);
}

async function applyAnkiDeletions(
  anki: Anki,
  vault: Vault,
  settings: ISettings,
  liveIds: Set<number>,
  index: VaultNoteIndex,
  yaml: YamlEngine,
): Promise<{ deleted: number; purgedRecords: number }> {
  const records = settings.noteLifecycle;
  const existingIds = await liveNoteIds(anki, liveIds, records);
  const forgotten: number[] = [];
  let deleted = 0;
  for (const key of Object.keys(records)) {
    const noteId = Number(key);
    const record = records[noteId];
    if (record === undefined || existingIds.has(noteId)) {
      continue;
    }
    forgotten.push(noteId);
    const removed = await deleteVaultBlockFor(
      record,
      noteId,
      index,
      vault,
      yaml,
    );
    if (removed) {
      deleted += 1;
    }
  }
  forgetRecords(settings, forgotten);
  return { deleted, purgedRecords: forgotten.length };
}

function hashCandidates(settings: ISettings): Map<string, number[]> {
  const candidates = new Map<string, number[]>();
  for (const [id, record] of Object.entries(settings.noteLifecycle)) {
    const queue = candidates.get(record.lastHash) ?? [];
    queue.push(Number(id));
    candidates.set(record.lastHash, queue);
  }
  return candidates;
}

async function claimBlockId(
  note: YamlNote,
  candidates: Map<string, number[]>,
): Promise<YamlNote | null> {
  const hash = await blockContentHash(note);
  const queue = candidates.get(hash);
  if (queue === undefined || queue.length === 0) {
    return null;
  }
  return { ...note, id: queue.shift() as number };
}

async function fillBlockIdsInContent(
  content: string,
  yaml: YamlEngine,
  candidates: Map<string, number[]>,
): Promise<{ content: string; filled: number }> {
  const pattern = createNoteFencePattern();
  const segments: string[] = [];
  let cursor = 0;
  let filled = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    const end = pattern.lastIndex;
    const note = parseNoteSafely(match[1] ?? "", yaml);
    if (note === null || note.id !== undefined) {
      continue;
    }
    const claimed = await claimBlockId(note, candidates);
    if (claimed === null) {
      continue;
    }
    segments.push(content.slice(cursor, match.index));
    segments.push(serializeYamlNote(claimed, yaml));
    cursor = end;
    filled += 1;
  }
  if (filled === 0) {
    return { content, filled };
  }
  segments.push(content.slice(cursor));
  return { content: segments.join(""), filled };
}

export async function fillMissingBlockIds(
  vault: Vault,
  settings: ISettings,
  yaml: YamlEngine = obsidianYamlEngine,
): Promise<number> {
  const candidates = hashCandidates(settings);
  if (candidates.size === 0) {
    return 0;
  }
  let filled = 0;
  for (const file of vault.getMarkdownFiles()) {
    const content = await vault.read(file);
    const result = await fillBlockIdsInContent(content, yaml, candidates);
    if (result.filled > 0) {
      await vault.modify(file, result.content);
      filled += result.filled;
    }
  }
  return filled;
}

async function syncOneDeck(
  scope: SyncScope,
  snapshot: DeckImportSnapshot,
): Promise<SyncedDeck> {
  const notes = await fetchDeckNotes(scope.anki, snapshot.deckName);
  const result = await syncDeckNotes(scope, snapshot, notes);
  return { liveIds: notes.map((note) => note.noteId), result };
}

export async function executeSync(
  anki: Anki,
  vault: Vault,
  settings: ISettings,
  yaml: YamlEngine = obsidianYamlEngine,
): Promise<SyncReport> {
  const snapshots = Object.values(settings.deckImportSnapshots);
  if (snapshots.length === 0) {
    throw new Error(t("notice.noImportYet"));
  }
  await fillMissingBlockIds(vault, settings, yaml);
  const scope: SyncScope = {
    anki,
    deckNames: await anki.getDeckNames(),
    index: await collectVaultNoteIndex(vault),
    settings,
    vault,
    yaml,
  };
  const liveIds = new Set<number>();
  const decks: SyncDeckReport[] = [];
  let enrolled = 0;
  let purgedFromDeletions = 0;
  for (const snapshot of snapshots) {
    const synced = await syncOneDeck(scope, snapshot);
    for (const noteId of synced.liveIds) {
      liveIds.add(noteId);
    }
    decks.push(synced.result.deck);
    enrolled += synced.result.enrolled;
    purgedFromDeletions += synced.result.purged;
  }
  const purged = await applyAnkiDeletions(
    anki,
    vault,
    settings,
    liveIds,
    scope.index,
    yaml,
  );
  return {
    decks,
    deleted: purged.deleted,
    enrolled,
    purgedRecords: purged.purgedRecords + purgedFromDeletions,
  };
}

interface SyncTotals {
  missing: number;
  pushed: number;
  refreshed: number;
  skippedUnmapped: number;
  upToDate: number;
}

function syncTotals(report: SyncReport): SyncTotals {
  const totals: SyncTotals = {
    missing: 0,
    pushed: 0,
    refreshed: 0,
    skippedUnmapped: 0,
    upToDate: 0,
  };
  for (const deck of report.decks) {
    totals.refreshed += deck.refreshed;
    totals.pushed += deck.pushed;
    totals.upToDate += deck.upToDate;
    totals.missing += deck.missing;
    totals.skippedUnmapped += deck.skippedUnmapped;
  }
  return totals;
}

function deckLine(deck: SyncDeckReport): string {
  return t("sync.deckLine", {
    deck: deck.deckName,
    missing: deck.missing,
    pushed: deck.pushed,
    refreshed: deck.refreshed,
    skippedUnmapped: deck.skippedUnmapped,
    upToDate: deck.upToDate,
  });
}

export function formatSyncReport(report: SyncReport): string {
  const summary = t("sync.summary", {
    ...syncTotals(report),
    deleted: report.deleted,
    enrolled: report.enrolled,
    purgedRecords: report.purgedRecords,
  });
  return [summary, ...report.decks.map(deckLine)].join("\n");
}
