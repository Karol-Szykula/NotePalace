/**
 * Contract: selection and force are separate records; forcing selects, and
 * clearing the force restores the row's default selection. Header controls
 * act only on rows they apply to (selectable / forceable).
 */
import type { ForceStrategy } from "src/gui/note-transfer-wizard/shared/types/forceStrategy";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import {
  clearForceAllOnPage,
  forceAllOnPage,
  isRowSelectable,
  leftToDecide,
  pageSelection,
  selectedCount,
  selectionCheckState,
  setNoteForced,
  setNoteSelected,
  setSelectableOnPage,
  type PageRowSelection,
} from "src/gui/note-transfer-wizard/shared/utils/note-selection";

interface FixtureRow {
  readonly forceable?: boolean | undefined;
  readonly id: number;
  readonly locked?: boolean | undefined;
  readonly preset?: boolean | undefined;
  readonly status?: NoteLifecycleStatus | undefined;
}

function fixtureRows(
  specs: readonly FixtureRow[],
  selected: Record<number, boolean> = {},
  forced: Record<number, boolean> = {},
): PageRowSelection[] {
  const strategy: ForceStrategy = {
    appliesToStatus: () => true,
    getForcedOutcome: () => undefined,
  };
  return pageSelection(specs as unknown as object[], selected, forced, {
    forceStrategy: strategy,
    getDefaultSelected: (item) => (item as FixtureRow).preset ?? true,
    getNoteId: (item) => (item as FixtureRow).id,
    getStatus: (item) => (item as FixtureRow).status ?? "synced.clean",
    isSelectionLocked: (item) => (item as FixtureRow).locked,
  }).map((row, index) => ({
    ...row,
    isForceable: specs[index]?.forceable ?? true,
  }));
}

describe("pageSelection", () => {
  test("given a locked row when projected then it reads selected", () => {
    // given
    const specs = [{ id: 1, locked: true }];

    // when
    const projected = fixtureRows(specs);

    // then
    expect(projected[0]).toMatchObject({ isLocked: true, isSelected: true });
  });
});

describe("isRowSelectable", () => {
  test("given a locked row when asked then it is not selectable", () => {
    // given
    const specs = [{ id: 1, locked: true }];

    // when
    const projected = fixtureRows(specs)[0]!;

    // then
    expect(isRowSelectable(projected)).toBe(false);
  });

  test("given a non-preselected row when asked then it is not selectable", () => {
    // given
    const specs = [{ id: 1, preset: false }];

    // when
    const projected = fixtureRows(specs)[0]!;

    // then
    expect(isRowSelectable(projected)).toBe(false);
  });
});

describe("selectionCheckState", () => {
  test("given no selectable rows when computed then it is disabled", () => {
    // given
    const selectableCount = 0;
    const activeCount = 0;

    // when
    const state = selectionCheckState(activeCount, selectableCount);

    // then
    expect(state).toEqual({
      checked: false,
      disabled: true,
      indeterminate: false,
    });
  });

  test("given all active rows when computed then it is checked", () => {
    // given
    const selectableCount = 2;
    const activeCount = 2;

    // when
    const state = selectionCheckState(activeCount, selectableCount);

    // then
    expect(state).toEqual({
      checked: true,
      disabled: false,
      indeterminate: false,
    });
  });

  test("given some active rows when computed then it is indeterminate", () => {
    // given
    const selectableCount = 2;
    const activeCount = 1;

    // when
    const state = selectionCheckState(activeCount, selectableCount);

    // then
    expect(state).toEqual({
      checked: false,
      disabled: false,
      indeterminate: true,
    });
  });
});

describe("setSelectableOnPage", () => {
  test("given mixed rows when selected then it checks only the selectable ones", () => {
    // given
    const specs = [
      { id: 1 },
      { id: 2, locked: true },
      { id: 3, preset: false },
    ];
    const rows = fixtureRows(specs);
    const selected = {};

    // when
    const next = setSelectableOnPage(rows, selected, true);

    // then
    expect(next).toEqual({ 1: true });
  });
});

describe("forceAllOnPage", () => {
  test("given mixed rows when forced then it forces and selects the forceable ones", () => {
    // given
    const specs = [{ id: 1 }, { id: 2, forceable: false }];
    const rows = fixtureRows(specs);
    const forced = {};
    const selected = { 2: true };

    // when
    const next = forceAllOnPage(rows, forced, selected);

    // then
    expect(next).toEqual({
      forced: { 1: true },
      selected: { 2: true, 1: true },
    });
  });
});

describe("clearForceAllOnPage", () => {
  test("given forced rows when cleared then it clears the force and restores the default selection", () => {
    // given
    const specs = [{ id: 1 }, { id: 2, forceable: false }];
    const rows = fixtureRows(specs);
    const forced = { 1: true, 2: true };
    const selected = { 1: true };

    // when
    const next = clearForceAllOnPage(rows, forced, selected);

    // then
    expect(next).toEqual({
      forced: { 1: false, 2: true },
      selected: { 1: true },
    });
  });
});

describe("setNoteForced", () => {
  test("given a row when forced then it selects it", () => {
    // given
    const forced = {};
    const selected = {};

    // when
    const next = setNoteForced(forced, selected, 5, true, false);

    // then
    expect(next).toEqual({
      forced: { 5: true },
      selected: { 5: true },
    });
  });

  test("given a forced row when cleared then it restores the default selection", () => {
    // given
    const forced = { 5: true };
    const selected = { 5: true };

    // when
    const next = setNoteForced(forced, selected, 5, false, true);

    // then
    expect(next).toEqual({
      forced: { 5: false },
      selected: { 5: true },
    });
  });
});

describe("setNoteSelected", () => {
  test("given a note id when toggled then it writes only that cell", () => {
    // given
    const selected = { 1: true };

    // when
    const next = setNoteSelected(selected, 2, true);

    // then
    expect(next).toEqual({ 1: true, 2: true });
  });
});

describe("selectedCount", () => {
  test("given locked and selected rows when counted then it counts the locked ones", () => {
    // given
    const specs = [{ id: 1, locked: true }, { id: 2 }];
    const rows = fixtureRows(specs);

    // when
    const count = selectedCount(rows);

    // then
    expect(count).toBe(2);
  });
});

describe("leftToDecide", () => {
  test("given rows when filtered then it drops preselected and forced rows", () => {
    // given
    const specs = [
      { id: 1 },
      { id: 2, preset: false },
      { id: 3, preset: false },
    ];
    const rows = fixtureRows(specs, {}, { 3: true });

    // when
    const undecided = leftToDecide(rows);

    // then
    expect(undecided.map((row) => row.id)).toEqual([2]);
  });
});
