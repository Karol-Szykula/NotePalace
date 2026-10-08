import { resolveMessage, type MessageKey } from "src/i18n/messages";

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function messagePattern(key: MessageKey, paramPattern = "\\d+"): RegExp {
  const template = resolveMessage("en", key);
  const escaped = escapeRegex(template);
  return new RegExp(escaped.replace(/\\\{[a-zA-Z]+\\\}/g, paramPattern));
}

export const createdPattern = messagePattern("report.created");
export const overwrittenPattern = messagePattern("report.overwritten");
export const updatedPattern = messagePattern("report.updated");
export const forcedPattern = messagePattern("report.forced");
export const unchangedPattern = messagePattern("report.unchanged");
export const deletedPattern = messagePattern("report.skippedDeleted");
export const cardsToImportPattern = messagePattern("preview.cardsToImport");
export const mappedFieldsPattern = messagePattern(
  "fieldMapping.title",
  '[^"]+',
);
