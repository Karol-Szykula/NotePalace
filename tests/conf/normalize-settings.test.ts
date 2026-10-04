import { normalizeSettings } from "src/conf/normalize-settings";

describe("normalizeSettings", () => {
  test("given no stored data when normalized then every default is present", () => {
    // given
    const stored: unknown = null;

    // when
    const settings = normalizeSettings(stored);

    // then
    expect(settings).toEqual({
      ankiConnectPermission: false,
      deckImportSnapshots: {},
      fieldMappings: {},
      ignoredDirectories: "",
      noteLifecycle: {},
    });
  });

  test("given stored records replaced by null when normalized then they become empty records", () => {
    // given
    const stored: unknown = { noteLifecycle: null, deckImportSnapshots: null };

    // when
    const settings = normalizeSettings(stored);

    // then
    expect(settings.noteLifecycle).toEqual({});
    expect(settings.deckImportSnapshots).toEqual({});
  });

  test("given stored values of the wrong type when normalized then the defaults win", () => {
    // given
    const stored: unknown = {
      ignoredDirectories: 7,
      ankiConnectPermission: "yes",
    };

    // when
    const settings = normalizeSettings(stored);

    // then
    expect(settings.ignoredDirectories).toBe("");
    expect(settings.ankiConnectPermission).toBe(false);
  });

  test("given stored values of the right type when normalized then they survive", () => {
    // given
    const stored = {
      ankiConnectPermission: true,
      ignoredDirectories: "templates",
    };

    // when
    const settings = normalizeSettings(stored);

    // then
    expect(settings.ankiConnectPermission).toBe(true);
    expect(settings.ignoredDirectories).toBe("templates");
  });
});
