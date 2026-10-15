/**
 * @jest-environment jsdom
 *
 * The wizard shell frames the pages: the notice belongs to the page the
 * wizard opened on, and OK on the last page waits until the page declares
 * itself finished.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardShell, type WizardPage } from "@shared/components";

const noticeText = "Opened without a note to scope to.";

function threePages(): WizardPage[] {
  return [
    { render: () => <p>First page</p>, title: "One" },
    { render: () => <p>Second page</p>, title: "Two" },
    { render: () => <p>Third page</p>, title: "Three" },
  ];
}

function renderShell(initialPage: number): void {
  render(
    <WizardShell
      getContext={() => ({})}
      initialPage={initialPage}
      notice={noticeText}
      onCancel={jest.fn()}
      pages={threePages()}
    />,
  );
}

test("given a notice when the wizard opens then it shows on the opening page", () => {
  // given
  const initialPage = 1;

  // when
  renderShell(initialPage);

  // then
  expect(screen.getByText(noticeText)).toBeInTheDocument();
  expect(screen.getByText("First page")).toBeInTheDocument();
});

test("given a notice on the opening page when advancing then the notice leaves with that page", async () => {
  // given
  renderShell(1);

  // when
  await userEvent.click(screen.getByRole("button", { name: "Next →" }));

  // then
  expect(screen.queryByText(noticeText)).not.toBeInTheDocument();
  expect(screen.getByText("Second page")).toBeInTheDocument();
});

test("given a notice when the wizard opens past the first page then it shows on that page", () => {
  // given
  const initialPage = 2;

  // when
  renderShell(initialPage);

  // then
  expect(screen.getByText(noticeText)).toBeInTheDocument();
  expect(screen.getByText("Second page")).toBeInTheDocument();
});

test("given a notice and an advance when going back then the notice returns with the opening page", async () => {
  // given
  renderShell(1);
  await userEvent.click(screen.getByRole("button", { name: "Next →" }));

  // when
  await userEvent.click(screen.getByRole("button", { name: "← Back" }));

  // then
  expect(screen.getByText(noticeText)).toBeInTheDocument();
  expect(screen.getByText("First page")).toBeInTheDocument();
});

interface FinishGate {
  readonly isFinished: boolean;
}

function renderFinishGate(gate: FinishGate): void {
  const pages: WizardPage<FinishGate>[] = [
    { render: () => <p>First page</p>, title: "One" },
    {
      canFinish: (context) => context.isFinished,
      render: () => <p>Second page</p>,
      title: "Two",
    },
  ];
  render(
    <WizardShell
      getContext={() => gate}
      initialPage={2}
      onCancel={jest.fn()}
      pages={pages}
    />,
  );
}

function renderPlainLastPage(): void {
  const pages: WizardPage[] = [
    { render: () => <p>First page</p>, title: "One" },
    { render: () => <p>Second page</p>, title: "Two" },
  ];
  render(
    <WizardShell
      getContext={() => ({})}
      initialPage={2}
      onCancel={jest.fn()}
      pages={pages}
    />,
  );
}

test("given a last page that is not finished when rendered then OK stays disabled", () => {
  // given
  const gate: FinishGate = { isFinished: false };

  // when
  renderFinishGate(gate);

  // then
  expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
});

test("given a last page that is finished when rendered then OK is enabled", () => {
  // given
  const gate: FinishGate = { isFinished: true };

  // when
  renderFinishGate(gate);

  // then
  expect(screen.getByRole("button", { name: "OK" })).toBeEnabled();
});

test("given a last page without a finish gate when rendered then OK is enabled", () => {
  // given, when
  renderPlainLastPage();

  // then
  expect(screen.getByRole("button", { name: "OK" })).toBeEnabled();
});
