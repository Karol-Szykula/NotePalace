/**
 * @jest-environment jsdom
 *
 * User-perspective tests for the shared notes table: it lists only the
 * current page and leaves pagination to the wizard footer.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen } from "@testing-library/react";
import { NotesTable } from "src/gui/note-transfer-wizard/shared/components/NotesTable";
import type { ForceStrategy } from "src/gui/note-transfer-wizard/shared/types/forceStrategy";
import { syncDecisionFor } from "src/services/notes/decision-table";

const forceStrategy: ForceStrategy = {
  appliesToStatus: () => false,
  getAriaLabel: () => "force",
  getForcedOutcome: () => undefined,
  labelKey: "force.ankiWins",
};

function renderTable(items: number[], pageSize: number): void {
  render(
    <NotesTable<number>
      bulkActionHandler={jest.fn()}
      bulkActionLabel="Bulk (X)"
      columns={[
        { header: "Select", render: () => <></>, width: "auto" },
        {
          header: "Note",
          render: (item) => <span>{`Note ${item}`}</span>,
          width: "1fr",
        },
      ]}
      currentPage={0}
      forcedNoteIds={{}}
      forceStrategy={forceStrategy}
      getDefaultSelected={() => true}
      getNoteId={(item) => item}
      getRow={() => syncDecisionFor("import", "synced.clean")}
      getStatus={() => "synced.clean"}
      isResurrectable={() => false}
      items={items}
      notesSelectedToImport={{}}
      onForcedChange={jest.fn()}
      onSelectedChange={jest.fn()}
      pageSize={pageSize}
    />,
  );
}

describe("NotesTable", () => {
  test("given more items than one page when rendered then it shows no pagination of its own", () => {
    // given
    const items = [1, 2, 3];
    const pageSize = 1;

    // when
    renderTable(items, pageSize);

    // then
    expect(
      screen.queryByRole("button", { name: /Prev|Next/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
  });

  test("given more items than one page when rendered then only the current page is listed", () => {
    // given
    const items = [1, 2, 3];
    const pageSize = 1;

    // when
    renderTable(items, pageSize);

    // then
    expect(screen.getByText("Note 1")).toBeInTheDocument();
    expect(screen.queryByText("Note 2")).not.toBeInTheDocument();
  });
});
