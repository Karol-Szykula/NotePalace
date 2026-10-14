import { clozeModelName } from "src/conf/constants";
import { AnkiNote, type AnkiNoteInit } from "src/entities/anki-note";

export class ClozeNote extends AnkiNote {
  constructor(init: AnkiNoteInit) {
    super(init);
    this.modelName = clozeModelName;
  }
}
