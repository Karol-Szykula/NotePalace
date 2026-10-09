import { noteShapeFor } from "src/entities/note-shapes";

describe("noteShapeFor", () => {
  test("given the basic model when resolved then uses front and back keys", async () => {
    // when
    const shape = noteShapeFor("Basic");

    // then
    expect(shape).toEqual({
      layout: "basic",
      model: "Basic",
      primaryKey: "front",
      primaryLabelKey: "noteForm.front",
      secondaryKey: "back",
      secondaryLabelKey: "noteForm.back",
    });
  });

  test("given the cloze model when resolved then uses text and back extra keys", async () => {
    // when
    const shape = noteShapeFor("Cloze");

    // then
    expect(shape).toEqual({
      layout: "cloze",
      model: "Cloze",
      primaryKey: "text",
      primaryLabelKey: "noteForm.text",
      secondaryKey: "back_extra",
      secondaryLabelKey: "noteForm.backExtra",
    });
  });

  test("given a missing model when resolved then falls back to the basic shape", async () => {
    // when
    const shape = noteShapeFor(undefined);

    // then
    expect(shape.primaryKey).toBe("front");
    expect(shape.model).toBe("Basic");
  });

  test("given an unknown model when resolved then keeps its name with basic keys", async () => {
    // when
    const shape = noteShapeFor("Custom Model");

    // then
    expect(shape.primaryKey).toBe("front");
    expect(shape.model).toBe("Custom Model");
  });

  test("given a lowercase cloze model when resolved then matches the cloze shape", async () => {
    // when
    const shape = noteShapeFor("cloze");

    // then
    expect(shape.primaryKey).toBe("text");
    expect(shape.model).toBe("Cloze");
  });

  test("given the optional reversed model when resolved then uses basic keys with its model", async () => {
    // when
    const shape = noteShapeFor("Basic (optional reversed card)");

    // then
    expect(shape.layout).toBe("basic");
    expect(shape.primaryKey).toBe("front");
    expect(shape.model).toBe("Basic (optional reversed card)");
  });

  test("given the type-answer model when resolved then uses basic keys with its model", async () => {
    // when
    const shape = noteShapeFor("Basic (type in the answer)");

    // then
    expect(shape.layout).toBe("basic");
    expect(shape.primaryKey).toBe("front");
    expect(shape.model).toBe("Basic (type in the answer)");
  });
});
