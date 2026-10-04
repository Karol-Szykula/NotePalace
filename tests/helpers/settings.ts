import { ISettings } from "src/conf/settings";

export function createSettings(overrides: Partial<ISettings> = {}): ISettings {
  return {
    ankiConnectPermission: false,
    ignoredDirectories: "",
    fieldMappings: {},
    deckImportSnapshots: {},
    noteLifecycle: {},
    ...overrides,
  };
}
