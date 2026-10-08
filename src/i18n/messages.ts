const en = {
  wizard: {
    next: "Next: {title} \u2192",
    export: "Export",
    import: "Import",
    cancel: "Cancel",
    back: "\u2190 Back",
    ok: "OK",
    finish: "Finish",
    prevPage: "\u2190 Prev",
    nextPage: "Next \u2192",
  },
  report: {
    created: "Created: {count}",
    updated: "Updated: {count}",
    skipped: "Skipped: {count}",
    mediaFiles: "media files: {count}",
    skippedUnmapped: "skipped without pack: {count}",
    changedSincePreview: "{count} changed since the preview",
    leftToSync: "left to Sync: {count}",
    skippedDeleted: "skipped as deleted: {count}",
    forced: "forced: {count}",
    overwritten: "Overwritten: {count}",
  },
  notice: {
    noImportYet: "No wizard import yet. Run Import deck from Anki first.",
    ankiNotConnected: "Error: Anki must be open with AnkiConnect installed.",
    syncFailed: "Sync failed: {error}",
    permissionGranted: "Anki Connect permission granted",
    permissionNotGranted: "AnkiConnect permission not granted",
    ankiWorks: "Anki works",
    ankiNotConnectedShort: "Anki is not connected",
    ankiError: "Something went wrong, is Anki open?",
    resetFailed: "Reset failed: {error}",
    exportFailed: "Export failed: {error}",
  },
  settings: {
    givePermission: "Give Permission",
    permissionDesc:
      "This needs to be done only one time. Open Anki and click the button to grant permission.",
    permissionDescSecondLine: "Be aware that AnkiConnect must be installed.",
    grantPermission: "Grant Permission",
    testAnki: "Test Anki",
    testDesc: "Test that connection between Anki and Obsidian actually works.",
    testButton: "Test",
    ignoredDirectories: "Ignored directories",
    ignoredDesc:
      "Comma-separated list of directories to skip when generating cards (e.g. templates, daily-notes).",
    ignoredPlaceholder: "templates, daily-notes",
  },
  preview: {
    noteCount: {
      one: "1 note",
      other: "{count} notes",
    },
    recreatedWarning: {
      one: "This re-creates 1 note you deleted in {location}.",
      other: "This re-creates {count} notes you deleted in {location}.",
    },
    cardsToImport: "Cards to import: {selected}/{total}.",
    notesToExport: "Notes to export: {selected}/{total}.",
    selectionNotice: "Nothing is selected yet: {reasons}. {action}",
    actionAll:
      "The button above takes Obsidian's version of every remaining note.",
    actionAllAnki:
      "The button above takes Anki's version of every remaining note.",
    noNotes: "No notes to display.",
    noDecks: "No decks found.",
    loading: "Loading notes\u2026",
    loadingProgress: "Loading notes\u2026 {current}/{total}",
    error: "Error: could not load notes.",
    alreadyUpToDate: "Both sides match: nothing to write.",
    newerInAnki: "Newer in Anki: skipped, use Sync.",
    newerInVault: "Newer in Obsidian: skipped, use Sync.",
    editedInBoth: "edited in both places",
    notExportedYet: "not exported yet",
    alreadyUpToDateShort: "already up to date",
    newerInAnkiShort: "with a newer version in Anki",
    newerInVaultShort: "with newer Obsidian edits",
    noFileShort: "with no file in Obsidian",
  },
  deck: {
    title: "Deck",
    notesTitle: "Notes",
    saveTitle: "Save",
    fieldsTitle: "Fields",
    cardsTitle: "Cards",
    selectPrompt: "Select a deck:",
    connecting: "Connecting to Anki\u2026",
    readingVault: "Reading vault\u2026",
    noDecks: "No decks found.",
    noDecksInAnki: "No decks found in Anki.",
    noExportableNotes: "No exportable notes found in the vault.",
    alreadyInTarget: "Already in target",
    emptyDeck: "Empty deck",
    columns: {
      deck: "Deck",
      imported: "Imported",
    },
  },
  fieldMapping: {
    title: 'Map fields for deck "{deckName}":',
    loading: "Loading note types\u2026",
    noNotes: "No notes found in this deck.",
    error: "Error: Anki must be open with AnkiConnect installed.",
    recognized: "Recognized",
    columns: {
      field: "Field",
      sample: "Sample",
      target: "Target",
    },
    targets: {
      front: "Front",
      back: "Back",
      text: "Text",
      extra: "Extra",
      skip: "Skip",
    },
  },
  banners: {
    diverged:
      "Edited in both Anki and Obsidian \u2014 the newest version wins on sync.",
    ankiDeleted:
      "Deleted in Anki \u2014 sync will remove this note from the vault.",
  },
  decision: {
    ankiOnly: {
      neverImported: {
        rationale: "Anki only: the import wizard brings it in.",
      },
      fileDeleted: {
        rationale: "File gone: Sync decides, nothing to push.",
        forcedOutcome: "re-creates the file you deleted.",
      },
    },
    linked: {
      unenrolled: {
        rationale: "Has an id but no record: enrols it, writes nothing.",
      },
    },
    synced: {
      clean: {
        rationale: "Both sides match: nothing to write.",
        forcedOutcome: "rewrites the same content.",
      },
      ankiNewer: {
        rationale: "Newer in Anki: skipped, use Sync.",
        forcedOutcome: "overwrites Anki.",
      },
      vaultNewer: {
        rationale: "Newer in Obsidian: pushes to Anki.",
        forcedOutcome: "overwrites your newer edits.",
      },
      diverged: {
        rationale: "Edited in both: skipped, use Sync.",
        forcedOutcome: "overwrites Anki.",
      },
    },
    vaultOnly: {
      unexported: {
        rationale: "Vault only: creates the Anki note, writes the id back.",
      },
      unenrolled: {
        rationale: "Has an id but no record: enrols it, writes nothing.",
      },
      ankiDeleted: {
        rationale: "Gone from Anki: Sync applies the deletion.",
        forcedOutcome: "re-creates it in Anki.",
      },
    },
    orphaned: {
      rationale: "Only a stale record left: Purge ledger forgets it.",
    },
  },
  force: {
    ankiWins: "Anki wins",
    obsidianWins: "Obsidian wins",
    ankiWinsFallback:
      "Anki wins: overwrite what is in Obsidian with Anki's version",
    obsidianWinsFallback:
      "Obsidian wins: overwrite what is in Anki with Obsidian's version",
    outcome: "{force}: {outcome}",
  },
  noteForm: {
    front: "Front",
    back: "Back",
    text: "Text",
    backExtra: "Back Extra",
    tags: "Tags",
  },
  commands: {
    sync: "Sync",
    importDeck: "Import deck from Anki",
    exportDeck: "Export deck to Anki",
    purgeLedger: "Purge ledger",
    insertNoteForm: "Insert note form",
    newNoteFile: "New note file",
    newClozeNoteFile: "New cloze note file",
  },
  dev: {
    resetCommand: "Dev: reset plugin data",
    resetConfirm:
      "The plugin forgets every link to Anki: note records, deck snapshots, field mappings and saved note packs. Your notes in the vault and Anki itself stay untouched, but the next import will offer your existing notes as new and re-exporting will create duplicates in Anki.",
    cancel: "Cancel",
    resetButton: "Reset everything",
    resetReport:
      "Reset: forgot {forgotten} records (the import wizard will offer the ones Anki still has as new), kept {kept}{outOfScope}{unreadable}.",
    outOfScope: ", {count} in ignored folders",
    unreadable: ", {count} unreadable",
  },
} as const;

type LeafPaths<T> = T extends string
  ? ""
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : `${K}.${LeafPaths<T[K]>}`;
    }[keyof T & string];

export type MessageKey = LeafPaths<typeof en>;
export type LocaleId = "en";
export type MessageParams = Record<string, string | number>;

function interpolate(template: string, params?: MessageParams): string {
  if (params === undefined) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key];
    return value === undefined ? "" : String(value);
  });
}

function lookup(key: string): string | undefined {
  let value: unknown = en;
  for (const segment of key.split(".")) {
    if (value !== null && typeof value === "object" && segment in value) {
      value = (value as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return typeof value === "string" ? value : undefined;
}

export function resolveMessage(
  _locale: LocaleId,
  key: string,
  params?: MessageParams,
): string {
  const template = lookup(key);
  return template === undefined ? key : interpolate(template, params);
}

export function resolvePlural(
  locale: LocaleId,
  baseKey: string,
  count: number,
  params?: MessageParams,
): string {
  const category = new Intl.PluralRules(locale).select(count);
  const template =
    lookup(`${baseKey}.${category}`) ?? lookup(`${baseKey}.other`);
  return template === undefined
    ? ""
    : interpolate(template, { count, ...params });
}
