# RFC-0002-notes-search: notes-search

## Goal

A search box in the notes toolbar of the transfer wizard filters the note list
so a single note can be found and selected for the run.

## Non-goals

- Regex mode or field-targeted search.
- Changing what a run writes: search is a view filter only.
- Searching the vault file path on export.
- Persisting the query across deck or folder changes or across wizard sessions.

## Boundary

- View-only filter over the notes already loaded for the current step; no
  additional AnkiConnect reads and no change to the write path, the selection
  ledger or the lifecycle decision table.
- Each side supplies its own searchable text: import searches the imported
  note's fields, tags and model; export searches the block's front, back, tags
  and model, never the file path.
- Matching is case- and diacritic-insensitive.
- Filtering is independent of selection: hidden rows stay selected and counted,
  select-all applies to the filtered set, and pagination follows the filtered
  list.
- The query is cleared when the deck or folder changes.
- The search box sits in the toolbar slot delivered by #75 and carries an
  accessible label and a clear control; Escape clears the query.
- Compatibility: renderer-only change through the shared
  `note-transfer-wizard` components; no plugin API, settings or data-format
  impact.

## Slices

### S-01-notes-search: Search notes by all fields

- AC-001 [evidence: automated]: Typing a query filters the list to notes whose
  searchable fields contain it, case- and diacritic-insensitively; for import
  the imported note's fields, tags and model are searched, and for export the
  block's front, back, tags and model are searched, not the file path.
- AC-002 [evidence: automated]: Clearing the query through the clear control or
  Escape restores the full list, changing the deck clears the query, and an
  empty state names that nothing matches.
- AC-003 [evidence: automated]: Filtering keeps hidden selections and their
  counts, select-all applies to the filtered set, and pagination follows the
  filtered list.
- AC-004 [evidence: both]: The notes toolbar shows a search box with an
  accessible label and a clear control.

## Risks

- Diacritic folding may be wrong for some locales; mitigate by pinning one
  normalization step and covering it with a "Łódź" / "lodz" test.
- Counts or select-all may drift between the filtered and the full set;
  mitigate by deriving counts from the filtered set while keeping hidden
  selections in state.
- Debounce and keystroke timing are flaky to test; mitigate with fake timers
  and observable assertions.
- Filtering large lists on every keystroke may lag; mitigate by matching
  against precomputed normalized searchable text per row.
