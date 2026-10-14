import {
  AnkiNote,
  type AnkiNoteInit,
  type AnkiNotePayload,
} from "src/entities/anki-note";

export interface CustomMappedNoteInit extends AnkiNoteInit {
  modelName: string;
}

export class CustomMappedNote extends AnkiNote {
  constructor(init: CustomMappedNoteInit) {
    super(init);
    this.modelName = init.modelName;
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
}
