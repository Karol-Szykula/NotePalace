import type { TFile } from "obsidian";
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
  newestSide,
  type PushedNote,
} from "src/services/commands/push";
import { deckForPath } from "src/services/vault/vault";
import { resolveDeckName } from "src/services/vault/paths";
import {
  ankiContentHash,
  blockContentHash,
} from "src/services/notes/content-hash";
import type { NotePack } from "src/services/notes/packs";
import type { YamlNote } from "src/services/notes/document";
import { forgetRecord } from "src/services/commands/sync-apply";
import type { SyncDeckReport } from "src/services/commands/sync-report";
import type { SyncScope } from "src/services/commands/sync-scope";

export type { SyncScope };

export interface SyncContext extends SyncScope {
  pushes: PushedNote[];
}

export type PresentStep = "import" | "push" | "upToDate";

export function isNoteTracked(settings: ISettings, noteId: number): boolean {
  return settings.noteLifecycle[noteId] !== undefined;
}

function isVaultNewer(
  note: AnkiNoteInfo,
  file: TFile,
  act: NoteLifecycleEvent,
): boolean {
  return act === "RESOLVE_NEWEST" && newestSide(note, file) === "vault";
}

async function ankiSideHash(
  snapshot: DeckImportSnapshot,
  note: AnkiNoteInfo,
): Promise<string> {
  const mapping = snapshot.fieldMappings[note.modelName ?? "Unknown"] ?? {};
  return ankiContentHash(note, mapping);
}

export async function enrollLinkedNote(
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

export function decideMissingFile(
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

export async function stepForPresentNote(
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
          deckName: resolveDeckName(context.deckIndex, deckForPath(file.path)),
          file,
        },
        pack,
        note,
        context.mediaAllocator,
      ),
    );
    return "push";
  }
  return "import";
}

export function collectStep(
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
