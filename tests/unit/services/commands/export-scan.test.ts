/**
 * @jest-environment jsdom
 *
 * The export wizard offers only folders the vault scan finds note-form
 * blocks in: ignored directories and block-less folders never appear, and
 * the scoped open must fall back the same way.
 */
import "obsidian-test-mocks/jest-setup";
import type { Vault as ObsidianVault } from "obsidian";
import { App } from "obsidian-test-mocks/obsidian";
import { selectableDeckNames } from "src/services/commands/export-scan";
import { obsidianYamlEngine } from "src/services/yaml-engine";

function noteBlock(front: string): string {
  return [
    "```note-form",
    `front: ${front}`,
    "back: B",
    "model: Basic",
    "```",
  ].join("\n");
}

function vaultWith(files: Record<string, string>): ObsidianVault {
  const app = App.createConfigured__({ files });
  return app.vault as unknown as ObsidianVault;
}

test("given blocks across folders when scanned then every folder with a block is selectable", async () => {
  // given
  const vault = vaultWith({
    "Languages/Fresh.md": `${noteBlock("Fresh note")}\n`,
    "Medicine/Anatomy/Bone.md": `${noteBlock("Bone")}\n`,
  });

  // when
  const deckNames = await selectableDeckNames(vault, "", obsidianYamlEngine);

  // then
  expect(deckNames).toEqual(new Set(["Languages", "Medicine::Anatomy"]));
});

test("given a block in an ignored directory when scanned then its folder is not selectable", async () => {
  // given
  const vault = vaultWith({
    "Languages/Fresh.md": `${noteBlock("Fresh note")}\n`,
    "Templates/Note.md": `${noteBlock("Template note")}\n`,
  });

  // when
  const deckNames = await selectableDeckNames(
    vault,
    "Templates",
    obsidianYamlEngine,
  );

  // then
  expect(deckNames).toEqual(new Set(["Languages"]));
});

test("given a folder without a note block when scanned then it is not selectable", async () => {
  // given
  const vault = vaultWith({
    "Languages/Fresh.md": `${noteBlock("Fresh note")}\n`,
    "Drafts/Prose.md": "Just prose, no note-form block.\n",
  });

  // when
  const deckNames = await selectableDeckNames(vault, "", obsidianYamlEngine);

  // then
  expect(deckNames).toEqual(new Set(["Languages"]));
});
