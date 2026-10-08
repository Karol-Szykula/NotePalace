import type { MessageKey } from "src/i18n/messages";
import {
  basicModelName,
  basicOptionalReversedModelName,
  basicReversedModelName,
  basicTypingModelName,
  clozeModelName,
} from "src/conf/constants";

export type NoteFormLayout = "basic" | "cloze";

export interface NoteShape {
  layout: NoteFormLayout;
  model: string;
  primaryKey: string;
  primaryLabelKey: MessageKey;
  secondaryKey: string;
  secondaryLabelKey: MessageKey;
}

const basicShape: NoteShape = {
  layout: "basic",
  model: basicModelName,
  primaryKey: "front",
  primaryLabelKey: "noteForm.front",
  secondaryKey: "back",
  secondaryLabelKey: "noteForm.back",
};

const clozeShape: NoteShape = {
  layout: "cloze",
  model: clozeModelName,
  primaryKey: "text",
  primaryLabelKey: "noteForm.text",
  secondaryKey: "back_extra",
  secondaryLabelKey: "noteForm.backExtra",
};

const basicShapedModels = [
  basicModelName,
  basicReversedModelName,
  basicOptionalReversedModelName,
  basicTypingModelName,
];

export function noteShapeFor(model: string | undefined): NoteShape {
  if (
    typeof model === "string" &&
    model.toLowerCase() === clozeModelName.toLowerCase()
  ) {
    return clozeShape;
  }
  if (
    typeof model === "string" &&
    basicShapedModels.some(
      (known) => known.toLowerCase() === model.toLowerCase(),
    )
  ) {
    return { ...basicShape, model };
  }
  return { ...basicShape, model: model ?? basicModelName };
}
