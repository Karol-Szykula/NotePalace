import { noteShapeFor, type NoteShape } from "src/entities/note-shapes";

export type AnkiNotePayload = {
  deckName: string;
  modelName: string;
  fields: Record<string, string>;
  tags: string[];
  id?: number;
};

export type AnkiNoteInfo = {
  noteId: number;
  deckName?: string;
  modelName?: string;
  mod?: number;
  fields: Record<string, { value: string }>;
  tags: string[];
  cards?: number[];
};

export interface AnkiNoteInit {
  deckName: string;
  fields: Record<string, string>;
  mediaNames?: string[] | undefined;
  noteId?: number | undefined;
  reversed: boolean;
  tags?: string[] | undefined;
}

export abstract class AnkiNote {
  noteId: number;
  deckName: string;
  fields: Record<string, string>;
  reversed: boolean;
  tags: string[];
  mediaNames: string[];
  mediaBase64Encoded: string[];
  oldTags: string[];
  modelName: string;

  constructor(init: AnkiNoteInit) {
    this.noteId = init.noteId ?? -1;
    this.deckName = init.deckName;
    this.fields = init.fields;
    this.reversed = init.reversed;
    this.tags = init.tags ?? [];
    this.mediaNames = init.mediaNames ?? [];
    this.mediaBase64Encoded = [];
    this.oldTags = [];
    this.modelName = "";
  }

  public toPayload(update = false): AnkiNotePayload {
    const payload: AnkiNotePayload = {
      deckName: this.deckName,
      modelName: this.modelName,
      fields: this.fields,
      tags: this.tags,
    };

    if (update) {
      payload["id"] = this.noteId;
    }

    return payload;
  }

  public getFormTemplate(): NoteShape {
    return noteShapeFor(this.modelName);
  }

  public getMedias(): object[] {
    const medias: object[] = [];
    this.mediaBase64Encoded.forEach((data, index) => {
      medias.push({
        filename: this.mediaNames[index],
        data,
      });
    });

    return medias;
  }
}

export function noteFieldsMatch(
  local: AnkiNote,
  remote: AnkiNoteInfo,
): boolean {
  const fields: Array<[string, { value: string }]> = Object.entries(
    remote.fields,
  );
  // This is the case of a switch from a model to another one. It cannot be handeled
  if (fields.length !== Object.entries(local.fields).length) {
    return true;
  }

  for (const field of fields) {
    const fieldName = field[0];
    if (field[1].value !== local.fields[fieldName]) {
      return false;
    }
  }

  return arraysEqual(remote.tags, local.tags);
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  const sortedFirst = [...a].sort((first, second) =>
    first.localeCompare(second),
  );
  const sortedSecond = [...b].sort((first, second) =>
    first.localeCompare(second),
  );

  return sortedFirst.every((value, index) => value === sortedSecond[index]);
}
