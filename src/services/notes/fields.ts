import { ankiFieldNames } from "src/conf/constants";
import { deckSearchQuery } from "src/services/anki/read";
import { mappedFieldValue } from "src/services/notes/text";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import type { FieldMapping } from "src/entities/field-mapping";
import type { Anki } from "src/services/anki/anki";

/**
 * A note's fields, two ways: what we can compare and hash (front, back, tags,
 * model) and what a live deck says about a notetype's field names, so the
 * wizard can map a model the plugin has never seen.
 */
export interface YamlNoteFields {
  back: string;
  front: string;
  tags: string;
}

export function buildYamlNoteFields(
  note: AnkiNoteInfo,
  mapping: FieldMapping,
): YamlNoteFields | null {
  const front = mappedFieldValue(note, mapping, ankiFieldNames.front);
  const back = mappedFieldValue(note, mapping, ankiFieldNames.back);
  const text = mappedFieldValue(note, mapping, ankiFieldNames.text);
  const extra = mappedFieldValue(note, mapping, ankiFieldNames.extra);
  const tags = note.tags.join(" ");
  if (front && back) {
    return { back, front, tags };
  }
  if (text) {
    return { back: extra, front: text, tags };
  }
  if (front) {
    return { back: "", front, tags };
  }
  return null;
}

export interface DeckModel {
  fields: string[];
  modelName: string;
  sampleValues: Record<string, string>;
}

const discoverySampleSize = 100;

async function fetchDiscoverySample(
  anki: Anki,
  deckName: string,
): Promise<AnkiNoteInfo[]> {
  const noteIds = await anki.findNotes(deckSearchQuery(deckName));
  return anki.getNotes(noteIds.slice(0, discoverySampleSize));
}

function mergeNoteFields(model: DeckModel, note: AnkiNoteInfo) {
  for (const [field, content] of Object.entries(note.fields)) {
    if (!model.fields.includes(field)) {
      model.fields.push(field);
    }
    if (!(field in model.sampleValues)) {
      model.sampleValues[field] = content.value;
    }
  }
}

function groupNotesByModel(notes: AnkiNoteInfo[]): DeckModel[] {
  const models = new Map<string, DeckModel>();
  for (const note of notes) {
    const modelName = note.modelName ?? "Unknown";
    if (!models.has(modelName)) {
      models.set(modelName, { modelName, fields: [], sampleValues: {} });
    }
    const model = models.get(modelName);
    if (model !== undefined) {
      mergeNoteFields(model, note);
    }
  }
  return [...models.values()];
}

export async function discoverDeckModels(
  anki: Anki,
  deckName: string,
): Promise<DeckModel[]> {
  const notes = await fetchDiscoverySample(anki, deckName);
  return groupNotesByModel(notes);
}
