/**
 * @jest-environment jsdom
 *
 * The active note's scope: the deck its file folder implies, the note-form
 * block's id and front, and the fallback when none of those can be read.
 */
import "obsidian-test-mocks/jest-setup";
import type { App } from "obsidian";
import { App as ObsidianApp, TFile } from "obsidian-test-mocks/obsidian";
import {
  activeNoteScope,
  scopedScope,
  unavailableScope,
} from "@shared/utils/active-note-scope";

function noteBlock(front: string, id?: number): string {
  const lines = ["```note-form", `front: ${front}`, "back: B", "model: Basic"];
  if (id !== undefined) {
    lines.push(`id: ${id}`);
  }
  lines.push("```");
  return lines.join("\n");
}

async function activateFile(app: App, path: string): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    throw new Error(`missing file ${path}`);
  }
  const leaf = app.workspace.getLeaf();
  await leaf.openFile(file);
  app.workspace.setActiveLeaf(leaf);
}

async function scopeActiveFile(app: ObsidianApp): Promise<unknown> {
  return await activeNoteScope(app as unknown as App);
}

test("given an active note with a block when scoped then its folder, id and front describe it", async () => {
  // given
  const app = ObsidianApp.createConfigured__({
    files: { "Languages/Note.md": `${noteBlock("Fresh note", 42)}\n` },
  });
  await activateFile(app as unknown as App, "Languages/Note.md");

  // when
  const scope = await scopeActiveFile(app);

  // then
  expect(scope).toEqual({
    deckName: "Languages",
    noteId: 42,
    query: "Fresh note",
  });
});

test("given an active note without a block when scoped then there is no scope", async () => {
  // given
  const app = ObsidianApp.createConfigured__({
    files: { "Languages/Empty.md": "Just prose, no note-form block.\n" },
  });
  await activateFile(app as unknown as App, "Languages/Empty.md");

  // when
  const scope = await scopeActiveFile(app);

  // then
  expect(scope).toBeNull();
});

test("given no active file when scoped then there is no scope", async () => {
  // given
  const app = ObsidianApp.createConfigured__({ files: {} });

  // when
  const scope = await scopeActiveFile(app);

  // then
  expect(scope).toBeNull();
});

test("given an active note in an ignored directory when scoped then there is no scope", async () => {
  // given
  const app = ObsidianApp.createConfigured__({
    files: { "Templates/Note.md": `${noteBlock("Template note", 7)}\n` },
  });
  await activateFile(app as unknown as App, "Templates/Note.md");

  // when
  const scope = await activeNoteScope(app as unknown as App, "Templates");

  // then
  expect(scope).toBeNull();
});

test("given an ignored directory when the import side scopes without it then the note still scopes", async () => {
  // given
  const app = ObsidianApp.createConfigured__({
    files: { "Templates/Note.md": `${noteBlock("Template note", 7)}\n` },
  });
  await activateFile(app as unknown as App, "Templates/Note.md");

  // when
  const scope = await activeNoteScope(app as unknown as App);

  // then
  expect(scope).toEqual({
    deckName: "Templates",
    noteId: 7,
    query: "Template note",
  });
});

test("given a blob without an id when scoped then the highlight key is empty", () => {
  // given
  const scope = { deckName: "Languages", noteId: undefined, query: "Fresh" };

  // when
  const wizardScope = scopedScope("Languages", scope);

  // then
  expect(wizardScope).toEqual({
    deckName: "Languages",
    highlightKey: null,
    kind: "scoped",
    query: "Fresh",
  });
});

test("given a resolved scope when scoped then the resolved deck name wins", () => {
  // given
  const scope = { deckName: "languages", noteId: 7, query: "Fresh" };

  // when
  const wizardScope = scopedScope("Languages", scope);

  // then
  expect(wizardScope).toEqual({
    deckName: "Languages",
    highlightKey: 7,
    kind: "scoped",
    query: "Fresh",
  });
});

test("given an unusable note when scoped then the scope is unavailable", () => {
  // given, when
  const scope = unavailableScope();

  // then
  expect(scope).toEqual({ kind: "unavailable" });
});
