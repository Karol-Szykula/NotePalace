import { moment } from "obsidian";
import {
  resolveMessage,
  resolvePlural,
  type LocaleId,
  type MessageKey,
  type MessageParams,
} from "./messages";

const localeAliases: Record<string, LocaleId> = { en: "en" };

function activeLocale(): LocaleId {
  return localeAliases[moment.locale()] ?? "en";
}

export function t(key: MessageKey, params?: MessageParams): string {
  return resolveMessage(activeLocale(), key, params);
}

export function plural(
  baseKey: string,
  count: number,
  params?: MessageParams,
): string {
  return resolvePlural(activeLocale(), baseKey, count, params);
}

export { resolveMessage, resolvePlural } from "./messages";
export type { MessageKey } from "./messages";
