import type { Anki } from "src/services/anki/anki";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import type { DeckImportSnapshot, ISettings } from "src/conf/settings";
import { syncedCleanRecord } from "src/services/notes/lifecycle";
import {
  pushNotesToAnki,
  recordSyncedBaselines,
  type PushedNote,
} from "src/services/commands/push";
import {
  findVaultNoteBlock,
  noteFileAt,
  type VaultNoteIndex,
} from "src/services/vault/vault";
import { executeImport } from "src/services/commands/import-deck";
import { fetchDeckNotes } from "src/services/anki/read";
import { packForModel } from "src/services/notes/packs";
import {
  collectStep,
  decideMissingFile,
  enrollLinkedNote,
  isNoteTracked,
  stepForPresentNote,
  type SyncContext,
  type SyncScope,
} from "src/services/commands/sync-scan";
import {
  emptyDeckReport,
  type SyncDeckReport,
} from "src/services/commands/sync-report";

interface DeckScan {
  context: SyncContext;
  counts: SyncDeckReport;
  decisions: Record<number, boolean>;
  eligible: AnkiNoteInfo[];
  enrolled: number;
  purged: number;
}

interface DeckScanInput extends SyncScope {
  snapshot: DeckImportSnapshot;
}

interface SyncDeckResult {
  deck: SyncDeckReport;
  enrolled: number;
  purged: number;
}

export interface SyncedDeck {
  liveIds: number[];
  result: SyncDeckResult;
}

function createDeckScan(input: DeckScanInput): DeckScan {
  return {
    context: {
      anki: input.anki,
      deckIndex: input.deckIndex,
      index: input.index,
      mediaAllocator: input.mediaAllocator,
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
  scope: SyncScope,
  snapshot: DeckImportSnapshot,
  scan: DeckScan,
): Promise<number> {
  const { anki, settings, vault, yaml } = scope;
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
    scan.counts.refreshed = await importEligibleNotes(scope, snapshot, scan);
  }
  return { deck: scan.counts, enrolled: scan.enrolled, purged: scan.purged };
}

export async function syncOneDeck(
  scope: SyncScope,
  snapshot: DeckImportSnapshot,
): Promise<SyncedDeck> {
  const notes = await fetchDeckNotes(scope.anki, snapshot.deckName);
  const result = await syncDeckNotes(scope, snapshot, notes);
  return { liveIds: notes.map((note) => note.noteId), result };
}
