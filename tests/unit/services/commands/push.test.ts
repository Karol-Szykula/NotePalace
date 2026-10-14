import { mediaNameAllocator } from "src/services/commands/push";

describe("mediaNameAllocator", () => {
  test("given one source when allocated twice then it keeps a single name", () => {
    // given
    const allocator = mediaNameAllocator();

    // when
    const first = allocator.allocate("a/img.png", "img.png");
    const second = allocator.allocate("a/img.png", "img.png");

    // then
    expect(first).toBe("img.png");
    expect(second).toBe("img.png");
  });

  test("given two sources sharing a basename when allocated then the second is suffixed", () => {
    // given
    const allocator = mediaNameAllocator();

    // when
    const first = allocator.allocate("a/img.png", "img.png");
    const second = allocator.allocate("b/img.png", "img.png");
    const third = allocator.allocate("c/img.png", "img.png");

    // then
    expect(first).toBe("img.png");
    expect(second).toBe("img-1.png");
    expect(third).toBe("img-2.png");
  });

  test("given distinct basenames when allocated then each keeps its own", () => {
    // given
    const allocator = mediaNameAllocator();

    // when
    const image = allocator.allocate("a/x.png", "x.png");
    const sound = allocator.allocate("a/y.mp3", "y.mp3");

    // then
    expect(image).toBe("x.png");
    expect(sound).toBe("y.mp3");
  });
});
