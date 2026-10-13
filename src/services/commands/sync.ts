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

function forgetRecord(settings: ISettings, noteId: number): void {
  settings.noteLifecycle = Object.fromEntries(
    Object.entries(settings.noteLifecycle).filter(
      ([id]) => Number(id) !== noteId,
    ),
  );
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
  index: VaultNoteIndex;
  pushes: PushedNote[];
  settings: ISettings;
  vault: Vault;
  yaml: YamlEngine;
}

type PresentStep = "import" | "push" | "upToDate";

async function stepForPresentNote(
  context: SyncContext,
  note: AnkiNoteInfo,
  block: YamlNote,
  file: TFile,
  pack: NotePack,
): Promise<PresentStep> {
  const currentHash = await blockContentHash(block);
  const record = context.settings.noteLifecycle[note.noteId];
  const blockInput =
    block.id === undefined
      ? { hash: currentHash, id: undefined as number | undefined }
      : { id: block.id, hash: currentHash };
  const status = classifyNoteLifecycle({
    anki: note,
    block: blockInput,
    record,
  });
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
        { block, deckName: deckForPath(file.path), file },
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

async function syncDeckNotes(
  anki: Anki,
  vault: Vault,
  settings: ISettings,
  snapshot: DeckImportSnapshot,
  notes: AnkiNoteInfo[],
  index: VaultNoteIndex,
  yaml: YamlEngine,
): Promise<SyncDeckResult> {
  const counts = emptyDeckReport(snapshot.deckName);
  const eligible: AnkiNoteInfo[] = [];
  const decisions: Record<number, boolean> = {};
  const context: SyncContext = {
    anki,
    index,
    pushes: [],
    settings,
    vault,
    yaml,
  };
  let enrolled = 0;
  let purged = 0;
  for (const note of notes) {
    if (!isNoteTracked(settings, note.noteId)) {
      const linked = await findVaultNoteBlock(vault, index, note.noteId, yaml);
      if (!linked) {
        continue;
      }
      await enrollLinkedNote(settings, snapshot, note, linked);
      enrolled += 1;
    }
    const pack = await packForModel(vault, note.modelName ?? "Unknown");
    if (!pack) {
      counts.skippedUnmapped += 1;
      continue;
    }
    const block = await findVaultNoteBlock(vault, index, note.noteId, yaml);
    const file = noteFileAt(vault, index, note.noteId);
    if (file === null) {
      if (
        decideMissingFile(
          settings,
          note,
          settings.noteLifecycle[note.noteId],
        ) === "RESURRECT"
      ) {
        eligible.push(note);
        decisions[note.noteId] = true;
      } else {
        purged += 1;
      }
      continue;
    }
    if (!block) {
      counts.missing += 1;
      continue;
    }
    const step = await stepForPresentNote(context, note, block, file, pack);
    collectStep(counts, eligible, decisions, note, step);
  }
  counts.pushed = context.pushes.length;
  await applyPushedNotes(anki, settings, snapshot, context.pushes);
  if (eligible.length === 0) {
    return { deck: counts, enrolled, purged };
  }
  const report = await executeImport(
    anki,
    vault,
    {
      ankiWinsNoteIds: eligible.map((note) => note.noteId),
      decisions,
      deckName: snapshot.deckName,
      fieldMappings: snapshot.fieldMappings,
      noteLifecycle: settings.noteLifecycle,
      notes: eligible,
      targetFolder: "",
      vaultNoteIndex: index,
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
  counts.refreshed = eligible.length;
  return { deck: counts, enrolled, purged };
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
  const pattern = createNoteFencePattern();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    let block;
    try {
      block = parseNoteForm(match[1] ?? "", yaml);
    } catch {
      continue;
    }
    if (block.id !== noteId) {
      continue;
    }
    const updated = (
      content.slice(0, match.index) +
      content.slice(match.index + match[0].length)
    ).replace(/\n{3,}/g, "\n\n");
    if (updated.trim() === "") {
      await vault.delete(file);
    } else {
      await vault.modify(file, updated);
    }
    return true;
  }
  return false;
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

async function purgeDeletedNotes(
  anki: Anki,
  vault: Vault,
  settings: ISettings,
  liveIds: Set<number>,
  index: VaultNoteIndex,
  yaml: YamlEngine,
): Promise<{ deleted: number; purgedRecords: number }> {
  let deleted = 0;
  const records = settings.noteLifecycle;
  const existingIds = await liveNoteIds(anki, liveIds, records);
  const purgedNoteIds: number[] = [];
  for (const key of Object.keys(records)) {
    const noteId = Number(key);
    if (existingIds.has(noteId)) {
      continue;
    }
    const path = index.get(noteId);
    if (path) {
      const removed = await removeNoteFromFile(vault, path, noteId, yaml);
      if (removed) {
        deleted += 1;
      }
    }
    purgedNoteIds.push(noteId);
  }
  settings.noteLifecycle = Object.fromEntries(
    Object.entries(records).filter(
      ([noteId]) => !purgedNoteIds.includes(Number(noteId)),
    ),
  );
  return { deleted, purgedRecords: purgedNoteIds.length };
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
    let note: YamlNote;
    try {
      note = parseNoteForm(match[1] ?? "", yaml);
    } catch {
      continue;
    }
    if (note.id !== undefined) {
      continue;
    }
    const hash = await blockContentHash(note);
    const queue = candidates.get(hash);
    if (queue === undefined || queue.length === 0) {
      continue;
    }
    const noteId = queue.shift() as number;
    segments.push(content.slice(cursor, match.index));
    segments.push(serializeYamlNote({ ...note, id: noteId }, yaml));
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

export async function executeSync(
  anki: Anki,
  vault: Vault,
  settings: ISettings,
  yaml: YamlEngine = obsidianYamlEngine,
): Promise<SyncReport> {
  const snapshots = settings.deckImportSnapshots;
  const deckNames = Object.keys(snapshots);
  if (deckNames.length === 0) {
    throw new Error(t("notice.noImportYet"));
  }
  await fillMissingBlockIds(vault, settings, yaml);
  const index = await collectVaultNoteIndex(vault);
  const liveIds = new Set<number>();
  const decks: SyncDeckReport[] = [];
  let enrolled = 0;
  let purgedFromDeletions = 0;
  for (const deckName of deckNames) {
    const snapshot = snapshots[deckName];
    if (snapshot === undefined) {
      continue;
    }
    const notes = await fetchDeckNotes(anki, deckName);
    for (const note of notes) {
      liveIds.add(note.noteId);
    }
    const refreshed = await syncDeckNotes(
      anki,
      vault,
      settings,
      snapshot,
      notes,
      index,
      yaml,
    );
    decks.push(refreshed.deck);
    enrolled += refreshed.enrolled;
    purgedFromDeletions += refreshed.purged;
  }
  const purged = await purgeDeletedNotes(
    anki,
    vault,
    settings,
    liveIds,
    index,
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
