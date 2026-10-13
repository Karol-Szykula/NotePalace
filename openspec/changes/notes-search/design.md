## Context

The notes step of the transfer wizard renders a shared `NotesTable` that owns
the notes toolbar (count text and expand/collapse-all), the row list and page
slicing. The import and export sides each own their notes data in a
`NotesPreview` container: import holds `ClassifiedNote[]` (Anki notes), export
holds `ExportableBlock[]` (vault blocks). Totals and pages are computed in the
container from `classified.length`, and selection is keyed by note id, so it
already survives any change to the visible list.

`NotesTable` currently takes `items`, `currentPage`, `pageSize` and slices
`items` for the page. There is no search input. `normalizeNoteText`
(`src/services/notes/text.ts`) strips markup and whitespace but does not fold
case or diacritics.

## Goals / Non-Goals

**Goals:**

- A toolbar search box that filters the visible notes, per side, case- and
  diacritic-insensitively.
- Filtering as a pure view filter: selection, counts and select-all stay
  coherent, hidden selections remain counted, pagination follows the filter.
- Reuse across import and export without forking `NotesTable`.

**Non-Goals:**

- Regex or field-targeted search, query persistence, or matching the vault file
  path on export.
- Any change to the write path, selection semantics, AnkiConnect reads, or the
  lifecycle decision table.

## Unknowns & Investigation

- **Does `ł` fold to `l` under Unicode NFD?** Investigated: no. `ł` (U+0142) is a
  base letter with no combining mark, so NFD + combining-mark removal does not
  map it to `l`. Concluded: a small explicit fold map is required, covering at
  least `ł→l` and common others (`ø→o`, `đ→d`, `ß→ss`, `æ→ae`).
- **Should counts be computed over the filtered or the full list?** The Slice
  requires hidden selections to stay counted, so the count text and the
  "nothing selected yet" banner must read the full list; only rows and pages
  read the filtered list.
- **Is `NotesTable` used by other callers that would break?** It is used only by
  the import and export notes previews. Concluded: extend it with optional props
  rather than fork it.

## Decisions

- **Pure search module** `shared/utils/notes-search.ts` exporting `foldForSearch`
  (lowercase + NFD mark stripping + explicit fold map) and `matchesSearch`
  (folded substring test). Keeps the folding rules in one unit-tested place,
  independent of React.
- **Per-side searchable text**: each `NotesPreview` supplies
  `getSearchableText(item)` — import joins the note's field values, tags and
  `modelName`; export joins the block's front, back, tags and model. Keeps the
  side-specific fields explicit and testable.
- **Debounced query in the container**: a `useDebouncedValue(query,
  searchDebounceMs)` hook (named constant) debounces filtering while `SearchBox`
  shows the raw value; the container filters `classified` with `useMemo` over
  the debounced query and the folded text.
- **`SearchBox` shared presentational component** with `aria-label`, a clear (×)
  control shown when non-empty, and Escape to clear; rendered by `NotesTable` in
  the existing toolbar via a `search` prop.
- **`NotesTable` stays presentational and backward compatible**: new optional
  props `search`, `allItems` (defaults to `items`) and `emptyMatchText`. Rows and
  pagination slice the filtered `items`; counts, select-all state and
  `notesLeftToDecide` read `allItems`. When `items` is empty and a query is
  active, the empty state names that nothing matches.
- **Selection untouched**: selection stays keyed by note id in the container, so
  filtering cannot drop it; `select-all` keeps operating on the filtered page.
- **Pagination**: the container resets `currentPage` to 0 when the query changes
  and computes total pages from the filtered length.
- **Localization**: add `preview.searchPlaceholder`, `preview.searchLabel`,
  `preview.clearSearch`, `preview.noSearchMatches` keys.

## Risks / Trade-offs

- Diacritic folding wrong for some script → keep folding in one module and cover
  `Łódź`/`lodz` plus the fold map with unit tests.
- Count/selection drift between filtered and full sets → counts and banners read
  the full list; only rows and pages read the filtered list.
- Debounce and keystroke timing flake in tests → test with fake timers and
  observable assertions.
- Filtering large lists per keystroke → memoize folded searchable text per item
  so each keystroke only does substring tests.

## Data Model

Not applicable — no data model changes in this change.

## API Contracts

Not applicable — no API surface changes in this change.

## Migration Plan

None. Renderer-only change; no settings or data migration.

## Open Questions

None.
