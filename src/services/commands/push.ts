import { TFile } from "obsidian";
import type { Vault } from "obsidian";
import { ankiFieldNames } from "src/conf/constants";
import type { ISettings } from "src/conf/settings";
import type { AnkiNote, AnkiNoteInfo } from "src/entities/anki-note";
import { CustomMappedNote } from "src/entities/custom-mapped-note";
import type { Anki } from "src/services/anki/anki";
import { parentFolderOf } from "src/services/vault/paths";
import { escapeRegExp } from "src/utils";
import { fetchNotesByIdMap } from "src/services/anki/read";
import type { FieldTarget } from "src/entities/field-mapping";
import { encodeBase64 } from "src/services/vault/media";
import { blockContentHash } from "src/services/notes/content-hash";
import { syncedCleanRecord } from "src/services/notes/lifecycle";
import type { NotePack } from "src/services/notes/packs";
import type { YamlNote } from "src/services/notes/document";

const audioExtensions = ["flac", "m4a", "mp3", "ogg", "opus", "wav"];

export interface PushTarget {
  block: YamlNote;
  deckName: string;
  file: TFile;
}

export interface PushedNote {
  hash: string;
  note: AnkiNote;
  source: AnkiNoteInfo;
}

function valueForTarget(target: FieldTarget, block: YamlNote): string {
  switch (target) {
    case ankiFieldNames.front:
    case ankiFieldNames.text:
      return block.front;
    case ankiFieldNames.back:
    case ankiFieldNames.extra:
      return block.back;
    default:
      return "";
  }
}

function ankiFieldsFor(
  block: YamlNote,
  pack: NotePack,
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [field, target] of Object.entries(pack.mapping)) {
    fields[field] = valueForTarget(target, block);
  }
  return fields;
}

function noteTags(tags: string): string[] {
  return tags.split(/\s+/).filter((tag) => tag.length > 0);
}

function fileNameOf(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

function isAudio(filename: string): boolean {
  const dot = filename.lastIndexOf(".");
  const extension = dot < 0 ? "" : filename.slice(dot + 1).toLowerCase();
  return audioExtensions.includes(extension);
}

export interface MediaNameAllocator {
  allocate(sourcePath: string, basename: string): string;
}

function uniqueMediaName(basename: string, taken: Set<string>): string {
  if (!taken.has(basename)) {
    return basename;
  }
  const dot = basename.lastIndexOf(".");
  const stem = dot <= 0 ? basename : basename.slice(0, dot);
  const extension = dot <= 0 ? "" : basename.slice(dot);
  let suffix = 1;
  let candidate = `${stem}-${suffix}${extension}`;
  while (taken.has(candidate)) {
    suffix += 1;
    candidate = `${stem}-${suffix}${extension}`;
  }
  return candidate;
}

export function mediaNameAllocator(): MediaNameAllocator {
  const bySource = new Map<string, string>();
  const taken = new Set<string>();
  return {
    allocate(sourcePath, basename) {
      const existing = bySource.get(sourcePath);
      if (existing !== undefined) {
        return existing;
      }
      const name = uniqueMediaName(basename, taken);
      bySource.set(sourcePath, name);
      taken.add(name);
      return name;
    },
  };
}

function resolveReferenceFile(
  vault: Vault,
  file: TFile,
  reference: string,
): TFile | null {
  const direct = vault.getAbstractFileByPath(reference);
  if (direct instanceof TFile) {
    return direct;
  }
  const folder = parentFolderOf(file.path);
  const relative = folder ? `${folder}/${reference}` : reference;
  const beside = vault.getAbstractFileByPath(relative);
  if (beside instanceof TFile) {
    return beside;
  }
  const name = fileNameOf(reference);
  return vault.getFiles().find((candidate) => candidate.name === name) ?? null;
}

interface MediaCollector {
  allocator: MediaNameAllocator;
  encoded: string[];
  file: TFile;
  mediaNames: string[];
  vault: Vault;
}

async function applyVaultMedia(
  collector: MediaCollector,
  text: string,
): Promise<string> {
  const pattern = /!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
  const referenced = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const reference = match[1];
    if (reference !== undefined) {
      referenced.add(reference);
    }
  }
  let rewritten = text;
  for (const reference of referenced) {
    const media = resolveReferenceFile(
      collector.vault,
      collector.file,
      reference,
    );
    if (media === null) {
      continue;
    }
    const name = collector.allocator.allocate(
      media.path,
      fileNameOf(reference),
    );
    if (!collector.mediaNames.includes(name)) {
      collector.mediaNames.push(name);
      collector.encoded.push(
        encodeBase64(await collector.vault.readBinary(media)),
      );
    }
    const tag = isAudio(name) ? `[sound:${name}]` : `<img src="${name}">`;
    rewritten = rewritten
      .split(`![[${reference}]]`)
      .join(tag)
      .replace(
        new RegExp(`!\\[\\[${escapeRegExp(reference)}\\|[^\\]]*\\]\\]`, "g"),
        tag,
      );
  }
  return rewritten;
}

async function mediaAwareBlock(
  vault: Vault,
  target: PushTarget,
  allocator: MediaNameAllocator,
): Promise<{ block: YamlNote; encoded: string[]; mediaNames: string[] }> {
  const collector: MediaCollector = {
    allocator,
    encoded: [],
    file: target.file,
    mediaNames: [],
    vault,
  };
  const front = await applyVaultMedia(collector, target.block.front);
  const back = await applyVaultMedia(collector, target.block.back);
  return {
    block: { ...target.block, back, front },
    encoded: collector.encoded,
    mediaNames: collector.mediaNames,
  };
}

export async function buildPushedNote(
  vault: Vault,
  target: PushTarget,
  pack: NotePack,
  source: AnkiNoteInfo,
  allocator: MediaNameAllocator,
): Promise<PushedNote> {
  const media = await mediaAwareBlock(vault, target, allocator);
  const note = new CustomMappedNote({
    deckName: target.deckName,
    fields: ankiFieldsFor(media.block, pack),
    mediaNames: media.mediaNames,
    modelName: pack.modelName,
    noteId: source.noteId,
    reversed: false,
    tags: noteTags(target.block.tags),
  });
  note.mediaBase64Encoded = media.encoded;
  note.oldTags = source.tags;
  return { hash: await blockContentHash(target.block), note, source };
}

export async function buildCreatedNote(
  vault: Vault,
  target: PushTarget,
  pack: NotePack,
  allocator: MediaNameAllocator,
): Promise<{ hash: string; note: AnkiNote }> {
  const media = await mediaAwareBlock(vault, target, allocator);
  const note = new CustomMappedNote({
    deckName: target.deckName,
    fields: ankiFieldsFor(media.block, pack),
    mediaNames: media.mediaNames,
    modelName: pack.modelName,
    reversed: false,
    tags: noteTags(target.block.tags),
  });
  note.mediaBase64Encoded = media.encoded;
  return { hash: await blockContentHash(target.block), note };
}

function notesByDeck(pushed: PushedNote[]): Map<string, PushedNote[]> {
  const byDeck = new Map<string, PushedNote[]>();
  for (const item of pushed) {
    const deckName = item.note.deckName;
    byDeck.set(deckName, [...(byDeck.get(deckName) ?? []), item]);
  }
  return byDeck;
}

export async function uploadNoteMedia(
  anki: Anki,
  notes: AnkiNote[],
): Promise<void> {
  const withMedia = notes.filter((note) => note.getMedias().length > 0);
  if (withMedia.length === 0) {
    return;
  }
  await anki.storeMediaFiles(withMedia);
}

export async function pushNotesToAnki(
  anki: Anki,
  pushed: PushedNote[],
): Promise<void> {
  if (pushed.length === 0) {
    return;
  }
  await uploadNoteMedia(
    anki,
    pushed.map((item) => item.note),
  );
  for (const group of notesByDeck(pushed).values()) {
    await anki.updateNotes(group.map((item) => item.note));
  }
}

export interface SyncedBaseline {
  hash: string;
  noteId: number;
}

export async function recordSyncedBaselines(
  anki: Anki,
  settings: ISettings,
  baselines: SyncedBaseline[],
): Promise<void> {
  if (baselines.length === 0) {
    return;
  }
  const fresh = await fetchNotesByIdMap(
    anki,
    baselines.map((baseline) => baseline.noteId),
  );
  for (const baseline of baselines) {
    settings.noteLifecycle[baseline.noteId] = syncedCleanRecord(
      fresh.get(baseline.noteId)?.mod ?? 0,
      baseline.hash,
      Date.now(),
    );
  }
}

export function mediaFileCount(notes: AnkiNote[]): number {
  return notes.reduce(
    (total, note) => total + note.mediaBase64Encoded.length,
    0,
  );
}

export function isAnkiNewer(source: AnkiNoteInfo, file: TFile): boolean {
  return (source.mod ?? 0) * 1000 > file.stat.mtime;
}
