/**
 * @jest-environment jsdom
 *
 * A deck's folder path and the deck name derived back from it are two halves
 * of one mapping: import writes the folder, export and sync read it.
 */
import "obsidian-test-mocks/jest-setup";
import {
  deckFolder,
  resolveDeckName,
  sanitizeDeckName,
} from "src/services/vault/paths";
import { deckForPath } from "src/services/vault/vault";

describe("deckFolder", () => {
  test("given a plain deck without target when resolved then returns the deck folder", () => {
    // when
    const folder = deckFolder("Languages", "");

    // then
    expect(folder).toBe("Languages");
  });

  test("given a nested deck with target when resolved then nests both", () => {
    // when
    const folder = deckFolder("Medicine::Anatomy", "Import");

    // then
    expect(folder).toBe("Import/Medicine/Anatomy");
  });

  test("given a segment holding a slash when resolved then keeps the folder depth", () => {
    // given
    const deckName = "CCNA::Day 03 Flashcards - OSI Model, TCP/IP Suite";

    // when
    const folder = deckFolder(deckName, "");

    // then
    expect(folder).toBe("CCNA/Day 03 Flashcards - OSI Model, TCP-IP Suite");
  });
});

describe("sanitizeDeckName", () => {
  test("given a segment holding a slash when sanitized then replaces it", () => {
    // when
    const sanitized = sanitizeDeckName("CCNA::A/B");

    // then
    expect(sanitized).toBe("CCNA::A-B");
  });

  test("given a clean deck name when sanitized then leaves it alone", () => {
    // when
    const sanitized = sanitizeDeckName("Medicine::Anatomy");

    // then
    expect(sanitized).toBe("Medicine::Anatomy");
  });
});

describe("resolveDeckName", () => {
  test("given a known deck matching after sanitizing when resolved then returns the known name", () => {
    // given
    const known = ["CCNA::Day 03 Flashcards - OSI Model, TCP/IP Suite"];
    const derived = "CCNA::Day 03 Flashcards - OSI Model, TCP-IP Suite";

    // when
    const resolved = resolveDeckName(known, derived);

    // then
    expect(resolved).toBe("CCNA::Day 03 Flashcards - OSI Model, TCP/IP Suite");
  });

  test("given no known deck matching when resolved then returns the derived name", () => {
    // given
    const known = ["Other"];
    const derived = "A::B-C";

    // when
    const resolved = resolveDeckName(known, derived);

    // then
    expect(resolved).toBe("A::B-C");
  });
});

describe("deck path round trip", () => {
  test("given a deck whose segment holds a slash when mapped to a folder and back then the derived name matches the sanitized deck", () => {
    // given
    const deckName = "CCNA::Day 03 Flashcards - OSI Model, TCP/IP Suite";
    const folder = deckFolder(deckName, "");

    // when
    const derived = deckForPath(`${folder}/question-1.md`);

    // then
    expect(derived).toBe(sanitizeDeckName(deckName));
    expect(resolveDeckName([deckName], derived)).toBe(deckName);
  });
});
