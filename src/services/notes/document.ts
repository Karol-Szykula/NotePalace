import type { TFile, Vault } from "obsidian";
import { noteFormLanguage } from "src/conf/constants";
import type { NoteFormData } from "src/entities/note-form-data";
import { obsidianYamlEngine, type YamlEngine } from "src/services/yaml-engine";
import { trimDashes } from "src/utils";

export type YamlNote = NoteFormData;

export function createNoteFencePattern(): RegExp {
  return /```note-form[^\n]*\n([\s\S]*?)\n```/g;
}

const maxFileNamePartBytes = 200;

function sanitizeFileNamePart(part: string): string {
  return trimDashes(part.replace(/[^\p{L}\p{N}]+/gu, "-"));
}

function stripMediaReferences(text: string): string {
  return text
    .replace(/!\[\[[^\]]*\]\]/g, "")
    .replace(/!\[([^\]\n]{0,500})\]\(([^)\n]{0,2000})\)/g, "$1")
    .replace(/\[([^\]\n]{0,500})\]\(([^)\n]{0,2000})\)/g, "$1");
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>\n]{0,500}>/g, "");
}

function stripClozeMarkers(text: string): string {
  return text.replace(/\{\{c\d+::((?:(?!\}\})[\s\S])*)\}\}/g, "$1");
}

function utf8CharLength(code: number): number {
  if (code < 0x80) {
    return 1;
  }
  if (code < 0x800) {
    return 2;
  }
  if (code < 0x10000) {
    return 3;
  }
  return 4;
}

function truncateToBytes(input: string, maxBytes: number): string {
  let bytes = 0;
  let end = 0;
  while (end < input.length) {
    const code = input.codePointAt(end) ?? 0;
    const length = utf8CharLength(code);
    if (bytes + length > maxBytes) {
      break;
    }
    bytes += length;
    end += code > 0xffff ? 2 : 1;
  }
  return input.slice(0, end);
}

function extractYamlNoteBlocks(content: string): string[] {
  const blocks: string[] = [];
  const fencePattern = createNoteFencePattern();
  let match: RegExpExecArray | null;
  while ((match = fencePattern.exec(content)) !== null) {
    blocks.push(match[1] ?? "");
  }
  return blocks;
}

export function parseYamlNotes(
  content: string,
  yaml: YamlEngine = obsidianYamlEngine,
): YamlNote[] {
  const notes: YamlNote[] = [];
  for (const block of extractYamlNoteBlocks(content)) {
    try {
      notes.push(parseNoteForm(block, yaml));
    } catch {
      continue;
    }
  }
  return notes;
}

export function serializeYamlNote(
  note: YamlNote,
  yaml: YamlEngine = obsidianYamlEngine,
): string {
  const body = serializeNoteForm(note, yaml);
  return `\`\`\`${noteFormLanguage}\n${body}\n\`\`\``;
}

export function yamlNoteFileName(
  deckName: string,
  front: string,
  noteId: number,
): string {
  const cleaned = truncateToBytes(
    sanitizeFileNamePart(
      stripHtmlTags(stripClozeMarkers(stripMediaReferences(front))),
    ),
    maxFileNamePartBytes,
  );
  const stem = trimDashes(cleaned) || sanitizeFileNamePart(deckName) || "note";
  return `${stem}-${noteId}.md`;
}

export async function readYamlNotes(
  vault: Vault,
  file: TFile,
  yaml: YamlEngine = obsidianYamlEngine,
): Promise<YamlNote[]> {
  const content = await vault.read(file);
  return parseYamlNotes(content, yaml);
}

import { basicModelName } from "src/conf/constants";
import { noteShapeFor } from "src/entities/note-shapes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loweredEntries(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const lowered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    lowered[key.toLowerCase()] = value;
  }
  return lowered;
}

function toText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function toNoteId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function extractExtra(
  record: Record<string, unknown>,
  knownKeys: string[],
): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!knownKeys.includes(key.toLowerCase())) {
      extra[key] = value;
    }
  }
  return extra;
}

export function parseNoteForm(
  source: string,
  yaml: YamlEngine = obsidianYamlEngine,
): NoteFormData {
  const parsed = yaml.parse(source);
  const record = isRecord(parsed) ? parsed : {};
  const lowered = loweredEntries(record);
  const model = toText(lowered["model"]) || basicModelName;
  const shape = noteShapeFor(model);
  const knownKeys = [
    shape.primaryKey,
    shape.secondaryKey,
    "tags",
    "id",
    "model",
  ];
  return {
    back: toText(lowered[shape.secondaryKey]),
    extra: extractExtra(record, knownKeys),
    front: toText(lowered[shape.primaryKey]),
    id: toNoteId(lowered["id"]),
    model,
    tags: toText(lowered["tags"]),
  };
}

export function serializeNoteForm(
  data: NoteFormData,
  yaml: YamlEngine = obsidianYamlEngine,
): string {
  const shape = noteShapeFor(data.model);
  const record: Record<string, unknown> = {
    [shape.primaryKey]: data.front,
    [shape.secondaryKey]: data.back,
    model: data.model,
    tags: data.tags,
  };
  if (data.id !== undefined) {
    record["id"] = data.id;
  }
  return yaml.stringify({ ...record, ...data.extra });
}
