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

describe("mappedFieldValue", () => {
  test("given a field with an image when mapped then returns markdown without an img tag", () => {
    // given
    const note = noteWithFront('<p>Heart <img src="a.png"></p>');

    // when
    const value = mappedFieldValue(note, { Front: "Front" }, "Front");

    // then
    expect(value).toBe("Heart ![](a.png)");
    expect(value).not.toContain("<img");
  });

  test("given an image with alt text when mapped then keeps the alt", () => {
    // given
    const note = noteWithFront('<p><img src="a.png" alt="A heart"></p>');

    // when
    const value = mappedFieldValue(note, { Front: "Front" }, "Front");

    // then
    expect(value).toBe("![A heart](a.png)");
  });

  test("given a remote image when mapped then keeps it as a markdown image", () => {
    // given
    const note = noteWithFront('<p><img src="https://example.com/a.png"></p>');

    // when
    const value = mappedFieldValue(note, { Front: "Front" }, "Front");

    // then
    expect(value).toBe("![](https://example.com/a.png)");
    expect(value).not.toContain("<img");
  });
});
