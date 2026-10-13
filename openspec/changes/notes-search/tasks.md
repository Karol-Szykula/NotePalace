<!-- Task Groups (## headings) are checkpoint units mirrored in one GitLab Issue dashboard. Apply executes one group at a time. -->

## 1. Search foundation

- [ ] 1.1 Add `foldForSearch` and `matchesSearch` to
  `src/gui/note-transfer-wizard/shared/utils/notes-search.ts` with a unit suite
  covering case folding, NFD diacritics and `ł→l`.
- [ ] 1.2 Add a `useDebouncedValue` hook with a named `searchDebounceMs`
  constant under `shared/hooks/`.
- [ ] 1.3 Add a `SearchBox` shared component with an accessible label, a clear
  (×) control and Escape-to-clear, and export it from
  `shared/components/index.ts`.
- [ ] 1.4 Add the `preview.*` message keys for the search label, clear control
  and no-match empty state.

## 2. Notes toolbar integration

- [ ] 2.1 Extend `NotesTable` with optional `search`, `allItems` and
  `emptyMatchText` props: rows and pages from `items`, counts and banners from
  `allItems`.
- [ ] 2.2 Render `SearchBox` in the toolbar and show the no-match empty state
  when a query is active and no row matches.
- [ ] 2.3 Add BEM classes for the toolbar search in `shared/classes/common.ts`
  and `styles.css`, then copy styles to the test vault and diff.

## 3. Import side

- [ ] 3.1 Wire `getSearchableText` (note fields, tags, model), debounced query
  state and page reset into the import `NotesPreview`.
- [ ] 3.2 Add import GUI tests: filtering by fields/tags/model, case and
  diacritics, clear via control and Escape, deck change clears, hidden
  selections counted, select-all on the filtered set, pagination follows the
  filter.

## 4. Export side

- [ ] 4.1 Wire `getSearchableText` (block front, back, tags, model; never the
  file path), debounced query state and page reset into the export
  `NotesPreview`.
- [ ] 4.2 Add export GUI tests: filtering by block fields/tags/model, file path
  not matched, clear, hidden selections counted, pagination follows the filter.

## 5. Gate

- [ ] 5.1 Run `pnpm run check` and confirm the search suites and the full gate
  pass.
