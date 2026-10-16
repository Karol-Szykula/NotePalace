/**
 * @jest-environment jsdom
 *
 * Field values convert HTML through showdown, which needs window.
 */
import type { AnkiNoteInfo } from "src/entities/anki-note";
import { mappedFieldValue } from "src/services/notes/text";

function noteWithFront(html: string): AnkiNoteInfo {
  return {
    cards: [7],
    fields: { Front: { value: html } },
    mod: 100,
    modelName: "Basic",
    noteId: 101,
    tags: [],
  };
}

function frontValue(html: string): string {
  return mappedFieldValue(noteWithFront(html), { Front: "Front" }, "Front");
}

describe("mappedFieldValue", () => {
  test("given a field with an image when mapped then returns markdown without an img tag", () => {
    // given
    const html = '<p>Heart <img src="a.png"></p>';

    // when
    const value = frontValue(html);

    // then
    expect(value).toBe("Heart ![](<a.png>)");
    expect(value).not.toContain("<img");
  });

  test("given an image with alt text when mapped then keeps the alt", () => {
    // given
    const html = '<p><img src="a.png" alt="A heart"></p>';

    // when
    const value = frontValue(html);

    // then
    expect(value).toBe("![A heart](<a.png>)");
  });

  test("given a single-quoted image when mapped then keeps it", () => {
    // given
    const html = "<p><img src='a.png'></p>";

    // when
    const value = frontValue(html);

    // then
    expect(value).toBe("![](<a.png>)");
  });

  test("given a filename with a space when mapped then keeps it resolvable", () => {
    // given
    const html = '<p><img src="my image.png"></p>';

    // when
    const value = frontValue(html);

    // then
    expect(value).toBe("![](<my image.png>)");
  });

  test("given a filename with a dollar sign when mapped then keeps it literally", () => {
    // given
    const html = '<p><img src="a$&b.png"></p>';

    // when
    const value = frontValue(html);

    // then
    expect(value).toBe("![](<a$&b.png>)");
  });

  test("given an alt containing an angle bracket when mapped then keeps the tag intact", () => {
    // given
    const html = '<p><img src="a.png" alt="a > b"></p>';

    // when
    const value = frontValue(html);

    // then
    expect(value).toBe("![a > b](<a.png>)");
  });

  test("given a source containing an angle bracket when mapped then encodes it", () => {
    // given
    const html = '<p><img src="a>b.png"></p>';

    // when
    const value = frontValue(html);

    // then
    expect(value).toBe("![](<a%3Eb.png>)");
  });

  test("given a remote image when mapped then keeps it as a markdown image", () => {
    // given
    const html = '<p><img src="https://example.com/a.png"></p>';

    // when
    const value = frontValue(html);

    // then
    expect(value).toBe("![](<https://example.com/a.png>)");
    expect(value).not.toContain("<img");
  });
});
