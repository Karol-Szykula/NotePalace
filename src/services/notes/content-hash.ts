import type { AnkiNoteInfo } from "src/entities/anki-note";
import type { FieldMapping } from "src/entities/field-mapping";
import { buildYamlNoteFields } from "src/services/notes/fields";
import type { NoteFormData } from "src/entities/note-form-data";

/**
 * The one place that decides whether two versions of a note are the same
 * content. Both sides hash the same four values, so a vault block and an Anki
 * note are comparable with one function.
 */
export async function computeContentHash(
  front: string,
  back: string,
  tags: string,
  model: string,
): Promise<string> {
  const bytes = utf8Encode(`${front}\n${back}\n${tags}\n${model}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function blockContentHash(block: NoteFormData): Promise<string> {
  return computeContentHash(block.front, block.back, block.tags, block.model);
}

export async function ankiContentHash(
  note: AnkiNoteInfo,
  mapping: FieldMapping,
): Promise<string> {
  const fields = buildYamlNoteFields(note, mapping) ?? {
    back: "",
    front: "",
    tags: "",
  };
  return computeContentHash(
    fields.front,
    fields.back,
    fields.tags,
    note.modelName ?? "Unknown",
  );
}

function utf8Encode(input: string): Uint8Array<ArrayBuffer> {
  const bytes: number[] = [];
  for (let index = 0; index < input.length; index += 1) {
    let code = input.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < input.length) {
      const next = input.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      }
    }
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
}
