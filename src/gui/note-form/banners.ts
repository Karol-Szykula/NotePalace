import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import type { MessageKey } from "src/i18n/messages";
import { t } from "src/i18n";

const bannerKeyByStatus: Partial<Record<NoteLifecycleStatus, MessageKey>> = {
  "synced.diverged": "banners.diverged",
  "vaultOnly.ankiDeleted": "banners.ankiDeleted",
};

export function bannerForStatus(
  status: NoteLifecycleStatus | undefined,
): string | undefined {
  if (status === undefined) {
    return undefined;
  }
  const key = bannerKeyByStatus[status];
  return key === undefined ? undefined : t(key);
}
