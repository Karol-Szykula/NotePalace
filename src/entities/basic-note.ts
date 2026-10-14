import { basicModelName, basicReversedModelName } from "src/conf/constants";
import { AnkiNote, type AnkiNoteInit } from "src/entities/anki-note";

export class BasicNote extends AnkiNote {
  constructor(init: AnkiNoteInit) {
    super(init);
    this.modelName = this.reversed ? basicReversedModelName : basicModelName;
  }
}
