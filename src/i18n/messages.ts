const en = {
  wizard: {
    next: "Next \u2192",
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
    updated: "updated: {count}",
    skipped: "skipped: {count}",
    mediaFiles: "media files: {count}",
    skippedUnmapped: "skipped without pack: {count}",
    changedSincePreview: "{count} changed since the preview",
    leftToSync: "left to Sync: {count}",
    skippedDeleted: "skipped as deleted: {count}",
    forced: "forced: {count}",
    overwritten: "overwritten: {count}",
    unchanged: "unchanged: {count}",
    mediaNotImported: "media not imported: {count}",
    vanishedFromDeck: "{count} no longer in the deck",
    folders: "folders: {count}",
    skippedNewerInVault: "skipped (newer in Obsidian): {count}",
    skippedLeftToSync: "left to Sync (no file): {count}",
    cancelled: " (cancelled)",
    exporting: "Exporting\u2026",
    exportingProgress: "Exporting\u2026 {processed}/{total}",
    importing: "Importing\u2026",
    importingProgress: "Importing\u2026 {processed}/{total}",
    purgeLedger:
      "Ledger: forgot {forgotten} records (the import wizard will offer the ones Anki still has as new), kept {kept}{outOfScope}{unreadable}.",
    purgeOutOfScope: ", {count} in ignored folders",
    purgeUnreadable: ", {count} unreadable",
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
    importFailed: "Import failed: {error}",
    purgeFailed: "Purge ledger failed: {error}",
  },
  errors: {
    ankiNotConnected: "Error: Anki must be open with AnkiConnect installed.",
    couldNotReadVault: "Error: could not read vault notes.",
    couldNotLoadNotes: "Error: could not load notes.",
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
    noReadableBlock:
      "No file: no readable note-form block for this id, Sync decides.",
    idNowhereInVault: "No file: this id is nowhere in the vault, Sync decides.",
    notImportedYet: "not imported yet",
    selectColumn: "Select",
    cardColumn: "Card",
    noteColumn: "Note",
    bulkAnki: "Use Anki's version for all (X)",
    bulkObsidian: "Use Obsidian's version for all (X)",
  },
  deck: {
    title: "Deck",
    notesTitle: "Notes",
    saveTitle: "Save",
    fieldsTitle: "Fields",
    selectPrompt: "Select a deck:",
    connecting: "Connecting to Anki\u2026",
    readingVault: "Reading vault\u2026",
    noDecks: "No decks found.",
    noDecksInAnki: "No decks found in Anki.",
    noExportableNotes: "No exportable notes found in the vault.",
    alreadyInObsidian: "Already in Obsidian",
    alreadyInAnki: "Already in Anki",
    selectImportPrompt: "Select a deck to import:",
    selectExportPrompt: "Select a folder to export:",
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
        export: { rationale: "Anki only: the import wizard brings it in." },
        import: { rationale: "Anki only: creates the file." },
        sync: { rationale: "Untracked Anki note: counted as needing import." },
      },
      fileDeleted: {
        export: { rationale: "File gone: Sync decides, nothing to push." },
        import: {
          rationale: "File gone: Sync decides, Anki wins re-creates it.",
          forcedOutcome: "re-creates the file you deleted.",
        },
        sync: {
          rationale: "No file: the purge path handles it outside this table.",
        },
      },
    },
    linked: {
      unenrolled: {
        export: {
          rationale: "Has an id but no record: enrols it, writes nothing.",
        },
        import: {
          rationale:
            "Has an id but no record: enrols it, rewrites the same file.",
        },
        sync: { rationale: "Enrolling is the wizards' job." },
      },
    },
    synced: {
      clean: {
        export: { rationale: "Both sides match: nothing to write." },
        import: {
          rationale: "Both sides match: rewrites nothing.",
          forcedOutcome: "rewrites the same content.",
        },
        sync: { rationale: "Both sides match: nothing to do." },
      },
      ankiNewer: {
        export: {
          rationale: "Newer in Anki: skipped, use Sync.",
          forcedOutcome: "overwrites Anki.",
        },
        import: { rationale: "Newer in Anki: overwrites your file." },
        sync: { rationale: "Newer in Anki: refreshes the vault file." },
      },
      vaultNewer: {
        export: { rationale: "Newer in Obsidian: pushes to Anki." },
        import: {
          rationale: "Newer in Obsidian: skipped, use Sync.",
          forcedOutcome: "overwrites your newer edits.",
        },
        sync: { rationale: "Newer in Obsidian: pushes to Anki." },
      },
      diverged: {
        export: {
          rationale: "Edited in both: skipped, use Sync.",
          forcedOutcome: "overwrites Anki.",
        },
        import: {
          rationale: "Edited in both: newest wins on Sync.",
          forcedOutcome: "overwrites your newer edits.",
        },
        sync: { rationale: "Edited in both: the newer side wins." },
      },
    },
    vaultOnly: {
      unexported: {
        export: {
          rationale: "Vault only: creates the Anki note, writes the id back.",
        },
        import: { rationale: "Vault only: the export wizard creates it." },
        sync: { rationale: "Vault only: the export wizard creates it." },
      },
      unenrolled: {
        export: {
          rationale: "Has an id but no record: enrols it, writes nothing.",
        },
        import: {
          rationale:
            "Has an id but no record: enrols it, rewrites the same file.",
        },
        sync: { rationale: "Enrolling is the wizards' job." },
      },
      ankiDeleted: {
        export: {
          rationale: "Gone from Anki: Sync applies the deletion.",
          forcedOutcome: "re-creates it in Anki.",
        },
        import: { rationale: "Gone from Anki: Sync deletes the file." },
        sync: { rationale: "Gone from Anki: the purge path handles it." },
      },
    },
    orphaned: {
      export: {
        rationale: "Only a stale record left: Purge ledger forgets it.",
      },
      import: {
        rationale: "Only a stale record left: Purge ledger forgets it.",
      },
      sync: {
        rationale: "Only a stale record left: Purge ledger forgets it.",
      },
    },
  },
  force: {
    ankiWins: "Anki wins",
    obsidianWins: "Obsidian wins",
    none: "no force",
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
    invalidBlock: "Invalid note-form block",
  },
  status: {
    anki: "Anki",
  },
  sync: {
    deckLine:
      "{deck}: {refreshed} refreshed, {pushed} pushed, {upToDate} up to date, {missing} missing, {skippedUnmapped} skipped without pack",
    summary:
      "Sync: {refreshed} refreshed, {pushed} pushed, {upToDate} up to date, {missing} missing, {deleted} deleted, {purgedRecords} records forgotten, {enrolled} enrolled, {skippedUnmapped} skipped without pack",
  },
  commandNames: {
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
      "Plugin data reset: {records} note records, {snapshots} deck snapshots, {mappings} field mappings, {packs} note packs. Anki and your notes in the vault are untouched.",
  },
} as const;

type LeafKeyPaths<RecordType> = {
  [Key in keyof RecordType & string]: RecordType[Key] extends string
    ? Key
    : `${Key}.${LeafKeyPaths<RecordType[Key]>}`;
}[keyof RecordType & string];

export type MessageKey = LeafKeyPaths<typeof en>;
export type LocaleId = "en";
export type MessageParams = Record<string, string | number>;

function interpolateMessageParams(
  template: string,
  params?: MessageParams,
): string {
  if (params === undefined) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key];
    return value === undefined ? "" : String(value);
  });
}

function lookupMessageTemplate(key: string): string | undefined {
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
  const template = lookupMessageTemplate(key);
  return template === undefined
    ? key
    : interpolateMessageParams(template, params);
}

export function resolvePlural(
  locale: LocaleId,
  baseKey: string,
  count: number,
  params?: MessageParams,
): string {
  const category = new Intl.PluralRules(locale).select(count);
  const template =
    lookupMessageTemplate(`${baseKey}.${category}`) ??
    lookupMessageTemplate(`${baseKey}.other`);
  return template === undefined
    ? ""
    : interpolateMessageParams(template, { count, ...params });
}
