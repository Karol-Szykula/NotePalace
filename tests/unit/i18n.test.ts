import { plural, resolveMessage, resolvePlural, t } from "src/i18n";

describe("i18n core", () => {
  describe("resolveMessage", () => {
    test("given a key with a param when resolved then the param is interpolated", () => {
      // given
      const key = "notice.syncFailed";
      const params = { error: "boom" };

      // when
      const message = resolveMessage("en", key, params);

      // then
      expect(message).toBe("Sync failed: boom");
    });

    test("given an unknown key when resolved then the key is returned", () => {
      // given
      const key = "nonexistent.key";

      // when
      const message = resolveMessage("en", key);

      // then
      expect(message).toBe("nonexistent.key");
    });

    test("given a missing param when resolved then it renders empty", () => {
      // given
      const key = "notice.syncFailed";

      // when
      const message = resolveMessage("en", key, {});

      // then
      expect(message).toBe("Sync failed: ");
    });
  });

  describe("resolvePlural", () => {
    test("given count 1 when resolved then the singular form is used", () => {
      // given
      const baseKey = "preview.noteCount";
      const count = 1;

      // when
      const message = resolvePlural("en", baseKey, count);

      // then
      expect(message).toBe("1 note");
    });

    test("given count above 1 when resolved then the plural form is used", () => {
      // given
      const baseKey = "preview.noteCount";
      const count = 5;

      // when
      const message = resolvePlural("en", baseKey, count);

      // then
      expect(message).toBe("5 notes");
    });
  });

  describe("t and plural", () => {
    test("given a key when translated then the english catalog value is used", () => {
      // given
      const key = "report.created";
      const params = { count: 3 };

      // when
      const message = t(key, params);

      // then
      expect(message).toBe("Created: 3");
    });

    test("given a plural base when translated then the count form is used", () => {
      // given
      const baseKey = "preview.noteCount";
      const count = 2;

      // when
      const message = plural(baseKey, count);

      // then
      expect(message).toBe("2 notes");
    });
  });
});
