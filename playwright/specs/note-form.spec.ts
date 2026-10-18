import { expect, test } from "@playwright/test";

test("given the basic read story when mounted then renders the front and the back", async ({
  mount,
}) => {
  // given
  const storyId = "note-form/BasicNoteForm/Read";

  // when
  const form = await mount(storyId);

  // then
  await expect(form.getByText("What is 2 + 2?")).toBeVisible();
  await expect(form.getByText("4", { exact: true })).toBeVisible();
  await expect(form.getByText("math", { exact: true })).toBeVisible();
});

test("given a field with an image when mounted then renders the image", async ({
  mount,
}) => {
  // given
  const storyId = "note-form/BasicNoteForm/ReadWithImage";

  // when
  const form = await mount(storyId);

  // then
  await expect(form.locator(".markdown-rendered img")).toBeVisible();
});

test("given a field with a list when mounted then renders the list items", async ({
  mount,
}) => {
  // given
  const storyId = "note-form/BasicNoteForm/ReadWithList";

  // when
  const form = await mount(storyId);

  // then
  await expect(form.getByRole("listitem")).toHaveCount(3);
});

test("given the read view when editing then shows the editable fields", async ({
  mount,
}) => {
  // given
  const storyId = "note-form/BasicNoteForm/Read";
  const form = await mount(storyId);

  // when
  await form.getByRole("button", { name: "Edit" }).click();

  // then
  await expect(form.getByLabel("Front")).toHaveValue("What is 2 + 2?");
  await expect(form.getByLabel("Back")).toHaveValue("4");
  await expect(form.getByLabel("Tags")).toHaveValue("math");
});

test("given a failing renderer when mounted then shows the render error", async ({
  mount,
}) => {
  // given
  const storyId = "note-form/BasicNoteForm/ReadWithError";

  // when
  const form = await mount(storyId);

  // then
  await expect(
    form.getByText("Error: could not render the field."),
  ).toHaveCount(2);
});

test("given the cloze story when mounted then renders its text", async ({
  mount,
}) => {
  // given
  const storyId = "note-form/ClozeNoteForm/Read";

  // when
  const form = await mount(storyId);

  // then
  await expect(
    form.getByText("The capital of France is {{c1::Paris}}."),
  ).toBeVisible();
});

test("given a failing cloze renderer when mounted then shows the render error", async ({
  mount,
}) => {
  // given
  const storyId = "note-form/ClozeNoteForm/ReadWithError";

  // when
  const form = await mount(storyId);

  // then
  await expect(
    form.getByText("Error: could not render the field."),
  ).toHaveCount(2);
});
