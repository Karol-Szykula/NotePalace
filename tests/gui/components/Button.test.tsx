/**
 * @jest-environment jsdom
 *
 * User-perspective tests for the shared button: the fixed-size class, the
 * label tooltip, the merged class and the disabled guard.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "src/gui/components/Button";

describe("Button", () => {
  test("given a label when rendered then it shows the label and its tooltip", () => {
    // given
    const label = "A long label";

    // when
    render(<Button onClick={jest.fn()}>{label}</Button>);

    // then
    const button = screen.getByRole("button", { name: label });
    expect(button).toHaveClass("notepalace-button");
    expect(button).toHaveAttribute("title", label);
  });

  test("given a class name when rendered then it merges over the base class", () => {
    // given
    const className = "extra";

    // when
    render(
      <Button className={className} onClick={jest.fn()}>
        Label
      </Button>,
    );

    // then
    expect(screen.getByRole("button", { name: "Label" })).toHaveClass(
      "notepalace-button",
      className,
    );
  });

  test("given a disabled button when clicked then it does not call back", async () => {
    // given
    const onClick = jest.fn();
    render(
      <Button disabled onClick={onClick}>
        Label
      </Button>,
    );

    // when
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Label" }));

    // then
    expect(onClick).not.toHaveBeenCalled();
  });
});
