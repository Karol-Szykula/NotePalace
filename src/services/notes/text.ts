import * as showdown from "showdown";
import { mediaFilenamesIn } from "src/services/vault/media";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import type { FieldMapping, FieldTarget } from "src/entities/field-mapping";

/**
 * Anki fields are HTML, Obsidian files are markdown. Everything that has to
 * cross that line lives here, so a field is converted the same way whether it
 * is being written to the vault or shown in the notes preview.
 */
const markdownConverter = new showdown.Converter();

const ankiImageTag = /<img(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const imageSource = /src\s*=\s*(["'])(.*?)\1/i;
const imageAlt = /alt\s*=\s*(["'])(.*?)\1/i;
const imageTokenPrefix = "NOTEPALACEIMGBEGIN";
const imageTokenSuffix = "NOTEPALACEEND";

function imageTokenFor(index: number): string {
  return `${imageTokenPrefix}${index}${imageTokenSuffix}`;
}

function imageMarkdownFor(tag: string): string {
  const source = imageSource.exec(tag)?.[2] ?? "";
  const alt = imageAlt.exec(tag)?.[2] ?? "";
  return source === "" ? "" : `![${alt}](<${source}>)`;
}

function neutralizeImageTags(html: string): { html: string; images: string[] } {
  const images: string[] = [];
  const neutralized = html.replace(ankiImageTag, (tag) => {
    const markdown = imageMarkdownFor(tag);
    if (markdown === "") {
      return "";
    }
    const token = imageTokenFor(images.length);
    images.push(markdown);
    return token;
  });
  return { html: neutralized, images };
}

function restoreImageTokens(markdown: string, images: string[]): string {
  return images.reduce(
    (restored, image, index) =>
      restored.replace(imageTokenFor(index), () => image),
    markdown,
  );
}

export function mappedFieldValue(
  note: AnkiNoteInfo,
  mapping: FieldMapping,
  target: FieldTarget,
): string {
  const field = Object.keys(mapping).find((name) => mapping[name] === target);
  const html = field ? (note.fields[field]?.value ?? "") : "";
  const neutralized = neutralizeImageTags(html);
  const markdown = cleanConvertedMarkdown(
    markdownConverter.makeMarkdown(neutralized.html),
  );
  return restoreImageTokens(markdown, neutralized.images);
}

export function normalizeNoteText(input: string): string {
  return stripMarkdown(stripHtml(input)).replace(/\s+/g, " ").trim();
}

export function noteMediaFilenames(note: AnkiNoteInfo): string[] {
  return mediaFilenamesIn(
    Object.values(note.fields).map((field) => field.value),
  );
}

function stripHtml(input: string): string {
  return input
    .replace(/<\/?(p|div|li|ul|ol|br|h[1-6]|tr|table|blockquote)[^>]*>/gi, " ")
    .replace(/<[^>\n]{0,500}>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

function stripMarkdown(input: string): string {
  return input
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^[ \t]*(?:[-*]|>[ \t]*|\d+\.)[ \t]+/gm, "")
    .replace(/([*_`#])/g, "")
    .replace(/!\[([^\]\n]{0,500})\]\(([^)\n]{0,2000})\)/g, "$1")
    .replace(/\[([^\]\n]{0,500})\]\(([^)\n]{0,2000})\)/g, "$1");
}

function cleanConvertedMarkdown(markdown: string): string {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(div|p)[^>]*>/gi, "\n")
    .replace(/<\/?span[^>]*>/gi, "")
    .replace(/^( *)\\- /gm, listMarkerFor)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function listMarkerFor(indent: string): string {
  return indent.length <= 1 ? "- " : `${indent}- `;
}
