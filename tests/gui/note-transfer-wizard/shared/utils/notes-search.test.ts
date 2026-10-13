/**
 * Contract: search folding is case-insensitive, strips NFD combining marks,
 * and maps letters that do not decompose (ł, ø, ß, ...) so a plain ASCII query
 * finds accented text. An empty query matches everything.
 */
import {
  foldForSearch,
  matchesSearch,
} from "src/gui/note-transfer-wizard/shared/utils/notes-search";

describe("foldForSearch", () => {
  test.each([
    { input: "café", expected: "cafe" },
    { input: "Łódź", expected: "lodz" },
    { input: "STRASSE", expected: "strasse" },
    { input: "straße", expected: "strasse" },
    { input: "Ærø", expected: "aero" },
  ])(
    "given $input when folded then it reads $expected",
    ({ input, expected }) => {
      // given
      const text = input;

      // when
      const folded = foldForSearch(text);

      // then
      expect(folded).toBe(expected);
    },
  );
});

describe("matchesSearch", () => {
  test("given a query in another case when matched then it is case-insensitive", () => {
    // given
    const text = "Notes About Anki";
    const query = "anki";

    // when
    const matched = matchesSearch(text, query);

    // then
    expect(matched).toBe(true);
  });

  test("given an ASCII query when matched against a diacritic word then it matches", () => {
    // given
    const text = "Café Łódź";
    const query = "lodz";

    // when
    const matched = matchesSearch(text, query);

    // then
    expect(matched).toBe(true);
  });

  test("given a diacritic query when matched against an ASCII word then it matches", () => {
    // given
    const text = "lodz";
    const query = "Łódź";

    // when
    const matched = matchesSearch(text, query);

    // then
    expect(matched).toBe(true);
  });

  test("given an empty query when matched then it matches every text", () => {
    // given
    const text = "anything";
    const query = "";

    // when
    const matched = matchesSearch(text, query);

    // then
    expect(matched).toBe(true);
  });

  test("given an unrelated query when matched then it does not match", () => {
    // given
    const text = "Café Łódź";
    const query = "zzz";

    // when
    const matched = matchesSearch(text, query);

    // then
    expect(matched).toBe(false);
  });
});
