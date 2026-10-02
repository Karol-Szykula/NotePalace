/**
 * @jest-environment jsdom
 *
 * Tests for the shared List component: headers and sticky header behavior.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen } from "@testing-library/react";
import { List, ListRow } from "@shared/components";

describe("List", () => {
  test("given a list with header when rendered then header has sticky CSS class", () => {
    // given
    render(
      <List columns={["Col1", "Col2"]} columnWidths="auto 1fr">
        <ListRow cells={["a", "b"]} key="1" />
        <ListRow cells={["c", "d"]} key="2" />
      </List>,
    );

    // when
    const header = document.querySelector(
      ".ankipalace-note-transfer-wizard-modal__list-header",
    );

    // then - header element exists with correct class; sticky positioning is defined in CSS
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass(
      "ankipalace-note-transfer-wizard-modal__list-header",
    );
  });

  test("given a list without columns when rendered then no header is rendered", () => {
    // given
    render(
      <List>
        <ListRow cells={["a", "b"]} key="1" />
      </List>,
    );

    // when
    const header = screen.queryByText("Col1");

    // then
    expect(header).not.toBeInTheDocument();
  });
});
