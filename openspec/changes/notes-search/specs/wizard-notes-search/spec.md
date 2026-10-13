## ADDED Requirements

### Requirement: Search notes by all fields

The notes step SHALL provide a search box in the notes toolbar that filters the
visible notes list to the notes whose searchable text contains the query. The
searchable text MUST include all fields for the current side: for import the
imported note's fields, tags and model; for export the block's front, back, tags
and model. The vault file path MUST NOT be searched.

#### Scenario: Filter by import note fields

- **WHEN** the user types a query in the import notes search box
- **THEN** the list keeps only notes whose fields, tags or model contain the
  query

#### Scenario: Filter by export block fields

- **WHEN** the user types a query in the export notes search box
- **THEN** the list keeps only blocks whose front, back, tags or model contain
  the query, and never filters by file path

#### Scenario: Match ignores case and diacritics

- **WHEN** the user types `lodz` and a note contains `Łódź`
- **THEN** the note is shown

### Requirement: Clearing the search

The search SHALL be cleared by the clear control or the Escape key, and SHALL be
cleared automatically when the deck or folder changes. When the query is not
empty and no note matches, the list SHALL show an empty state naming that nothing
matches.

#### Scenario: Clear with the clear control

- **WHEN** the user activates the clear control
- **THEN** the full list is restored

#### Scenario: Clear with Escape

- **WHEN** the search box has focus and the user presses Escape
- **THEN** the query is cleared and the full list is restored

#### Scenario: Deck change clears the search

- **WHEN** the user changes the deck or folder
- **THEN** the search box is emptied

#### Scenario: Empty state for no matches

- **WHEN** the query matches no note
- **THEN** the list shows an empty state naming that nothing matches

### Requirement: Filtering preserves selection and pagination

Filtering SHALL be a view filter that does not change the selection. Rows hidden
by the filter MUST stay selected and counted, select-all MUST apply to the
filtered set, and pagination MUST follow the filtered list.

#### Scenario: Hidden selections remain selected and counted

- **WHEN** a note is selected and a query hides it
- **THEN** the note stays selected and is still counted in the toolbar total

#### Scenario: Select-all applies to the filtered set

- **WHEN** the user selects all with a query active
- **THEN** only the notes matching the query are selected

#### Scenario: Pagination follows the filtered list

- **WHEN** a query reduces the list below one page
- **THEN** the page indicator reflects the filtered list

### Requirement: Accessible search control

The search box SHALL carry an accessible label and a clear control.

#### Scenario: Search box exposes an accessible label

- **WHEN** the notes toolbar renders
- **THEN** the search box is reachable by its accessible label and its clear
  control
