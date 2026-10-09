import { describe, expect, test } from "vitest";

import { lerp } from "./lerp.js";

describe("lerp", () => {
  test("returns start value when t=0", () => {
    expect(lerp(0, 10, 0)).toBe(0);
  });

  test("returns end value when t=1", () => {
    expect(lerp(0, 10, 1)).toBe(10);
  });

  test("returns midpoint when t=0.5", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});
