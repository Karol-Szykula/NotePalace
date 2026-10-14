import { TFile } from "obsidian";
import type { Vault } from "obsidian";
import type { Anki } from "src/services/anki/anki";
import type { ISettings } from "src/conf/settings";
import {
  classifyNoteLifecycle,
  transitionNoteLifecycle,
  type NoteLifecycleRecord,
} from "src/services/notes/lifecycle";
import { decisionActFor, isInScope } from "src/services/notes/decision-table";
import { blockContentHash } from "src/services/notes/content-hash";
import type { VaultNoteIndex } from "src/services/vault/vault";
import {
  createNoteFencePattern,
  parseNoteForm,
  serializeYamlNote,
  type YamlNote,
} from "src/services/notes/document";
import { obsidianYamlEngine, type YamlEngine } from "src/services/yaml-engine";
import type { SyncScope } from "src/services/commands/sync-scope";

const notesInfoChunkSize = 50;

function forgetRecords(settings: ISettings, noteIds: readonly number[]): void {
  settings.noteLifecycle = Object.fromEntries(
    Object.entries(settings.noteLifecycle).filter(
      ([id]) => !noteIds.includes(Number(id)),
    ),
  );
}

export function forgetRecord(settings: ISettings, noteId: number): void {
  forgetRecords(settings, [noteId]);
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

export async function applyAnkiDeletions(
  scope: SyncScope,
  liveIds: Set<number>,
): Promise<{ deleted: number; purgedRecords: number }> {
  const { anki, index, settings, vault, yaml } = scope;
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
