import { basicModelName, basicReversedModelName } from "src/conf/constants";
import {
  AnkiNote,
  type AnkiNoteInit,
  type AnkiNotePayload,
} from "src/entities/anki-note";

export class BasicNote extends AnkiNote {
  constructor(init: AnkiNoteInit) {
    super(init);
    this.modelName = this.reversed ? basicReversedModelName : basicModelName;
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
