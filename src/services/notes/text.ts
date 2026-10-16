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

const ankiImageTagPattern = /<img(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const imageSourcePattern = /src\s*=\s*(["'])(.*?)\1/i;
const imageAltPattern = /alt\s*=\s*(["'])(.*?)\1/i;
const angleBracketPattern = /[<>]/g;
const imageTokenPrefix = "NOTEPALACEIMGBEGIN";
const imageTokenSuffix = "NOTEPALACEEND";

function imageTokenFor(index: number): string {
  return `${imageTokenPrefix}${index}${imageTokenSuffix}`;
}

function encodeAngleBrackets(source: string): string {
  return source.replace(angleBracketPattern, (char) =>
    char === "<" ? "%3C" : "%3E",
  );
}

function imageMarkdownFor(tag: string): string {
  const source = imageSourcePattern.exec(tag)?.[2] ?? "";
  const alt = imageAltPattern.exec(tag)?.[2] ?? "";
  return source === "" ? "" : `![${alt}](<${encodeAngleBrackets(source)}>)`;
}

function neutralizeImageTags(html: string): { html: string; images: string[] } {
  const images: string[] = [];
  const neutralized = html.replace(ankiImageTagPattern, (tag) => {
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

const whitespaceRunPattern = /\s+/g;

export function normalizeNoteText(input: string): string {
  return stripMarkdown(stripHtml(input))
    .replace(whitespaceRunPattern, " ")
    .trim();
}

export function noteMediaFilenames(note: AnkiNoteInfo): string[] {
  return mediaFilenamesIn(
    Object.values(note.fields).map((field) => field.value),
  );
}

const blockTagPattern =
  /<\/?(p|div|li|ul|ol|br|h[1-6]|tr|table|blockquote)[^>]*>/gi;
const htmlTagPattern = /<[^>\n]{0,500}>/g;
const nonBreakingSpacePattern = /&nbsp;/g;
const greaterThanEntityPattern = /&gt;/g;
const lessThanEntityPattern = /&lt;/g;
const ampersandEntityPattern = /&amp;/g;
const quoteEntityPattern = /&quot;/g;

function stripHtml(input: string): string {
  return input
    .replace(blockTagPattern, " ")
    .replace(htmlTagPattern, "")
    .replace(nonBreakingSpacePattern, " ")
    .replace(greaterThanEntityPattern, ">")
    .replace(lessThanEntityPattern, "<")
    .replace(ampersandEntityPattern, "&")
    .replace(quoteEntityPattern, '"');
}

const boldAsteriskPattern = /\*\*(.*?)\*\*/g;
const boldUnderscorePattern = /__(.*?)__/g;
const blockMarkerPattern = /^[ \t]*(?:[-*]|>[ \t]*|\d+\.)[ \t]+/gm;
const emphasisMarkerPattern = /([*_`#])/g;
const markdownImagePattern = /!\[([^\]\n]{0,500})\]\(([^)\n]{0,2000})\)/g;
const markdownLinkPattern = /\[([^\]\n]{0,500})\]\(([^)\n]{0,2000})\)/g;

function stripMarkdown(input: string): string {
  return input
    .replace(boldAsteriskPattern, "$1")
    .replace(boldUnderscorePattern, "$1")
    .replace(blockMarkerPattern, "")
    .replace(emphasisMarkerPattern, "")
    .replace(markdownImagePattern, "$1")
    .replace(markdownLinkPattern, "$1");
}

const htmlCommentPattern = /<!--[\s\S]*?-->/g;
const htmlBreakPattern = /<br\s*\/?>/gi;
const blockWrapperPattern = /<\/?(div|p)[^>]*>/gi;
const spanTagPattern = /<\/?span[^>]*>/gi;
const escapedListMarkerPattern = /^( *)\\- /gm;
const blankLineRunPattern = /\n{3,}/g;

function cleanConvertedMarkdown(markdown: string): string {
  return markdown
    .replace(htmlCommentPattern, "")
    .replace(htmlBreakPattern, "\n")
    .replace(blockWrapperPattern, "\n")
    .replace(spanTagPattern, "")
    .replace(escapedListMarkerPattern, listMarkerFor)
    .replace(blankLineRunPattern, "\n\n")
    .trim();
}

function listMarkerFor(indent: string): string {
  return indent.length <= 1 ? "- " : `${indent}- `;
}
