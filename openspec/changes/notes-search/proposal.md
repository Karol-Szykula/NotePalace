## Why

The wizard's notes step lists every note in a deck with no way to narrow it, so
finding the one note a run targets means scrolling page by page. A search box in
the notes toolbar lets a single note be found and selected directly.

## What Changes

- Add a search input to the notes toolbar that filters the visible notes list.
- Filtering matches all searchable fields for the current side, case- and
  diacritic-insensitively: import searches the imported note's fields, tags and
  model; export searches the block's front, back, tags and model, never the file
  path.
- Clearing the query (clear control or Escape) restores the full list; changing
  the deck clears the query; an empty state names that nothing matches.
- Filtering is a view-only filter: hidden rows stay selected and counted,
  select-all applies to the filtered set, and pagination follows the filtered
  list.
- The search box carries an accessible label and a clear control.

## Capabilities

### New Capabilities

- `wizard-notes-search`: searching and filtering the notes list in the transfer
  wizard's notes step.

### Modified Capabilities

_None. `openspec/specs/` has no existing capabilities._

## Impact

- Renderer only, under `src/gui/note-transfer-wizard/`: the shared notes list
  toolbar (`shared/components/NotesTable.tsx`), a new shared search component and
  filtering helper under `shared/`, and the import and export `NotesPreview`
  containers that own the notes data.
- Localization: new `preview.*` message keys in `src/i18n/messages.ts`.
- No change to plugin API, settings, data formats, AnkiConnect reads or the
  lifecycle decision table.
- Tests: a unit suite for the filter helper and GUI suites for both sides
  covering filtering, clearing, selection/count preservation and pagination.

## GitLab Issue

<!-- This section will be filled automatically by the propose skill with the single Issue link. -->
