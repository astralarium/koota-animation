import { describe, expect, it } from "vitest";

import { bezierPresets, cubicBezier } from "./cubicBezier.js";

describe("cubicBezier", () => {
  it("matches linear time for linear control points", () => {
    const ease = cubicBezier(0, 0, 1, 1);
    for (const t of [0.1, 0.3, 0.7, 0.9]) {
      expect(ease(t)).toBeCloseTo(t, 6);
    }
  });

  it("pins the endpoints", () => {
    const ease = bezierPresets.ease;
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it("extends along the endpoint tangents outside 0–1", () => {
    const ease = cubicBezier(0.3, -0.5, 0.7, 1.5);
    expect(ease(-0.2)).toBeCloseTo(1 / 3, 9);
    expect(ease(1.2)).toBeCloseTo(2 / 3, 9);
  });

  it("joins the tangent lines without a kink", () => {
    const ease = cubicBezier(0.3, -0.5, 0.7, 1.5);
    const h = 1e-4;
    const slope = (a: number, b: number) => (ease(b) - ease(a)) / (b - a);
    expect(slope(0, h)).toBeCloseTo(slope(-h, 0), 2);
    expect(slope(1 - h, 1)).toBeCloseTo(slope(1, 1 + h), 2);
  });

  it("stays linear outside 0–1 for linear control points", () => {
    const ease = cubicBezier(0, 0, 1, 1);
    expect(ease(-0.5)).toBeCloseTo(-0.5, 9);
    expect(ease(1.5)).toBeCloseTo(1.5, 9);
  });

  it("holds flat outside 0–1 when no control point gives a tangent", () => {
    const ease = cubicBezier(0, 0.5, 0, 1);
    expect(ease(-1)).toBe(0);
  });

  it("is point-symmetric for symmetric control points", () => {
    const ease = bezierPresets.easeInOut;
    expect(ease(0.5)).toBeCloseTo(0.5, 6);
    expect(ease(0.2) + ease(0.8)).toBeCloseTo(1, 6);
  });

  it("matches the CSS ease curve", () => {
    // Reference values from the WebKit UnitBezier solver.
    expect(bezierPresets.ease(0.25)).toBeCloseTo(0.4085, 3);
    expect(bezierPresets.ease(0.5)).toBeCloseTo(0.8024, 3);
  });
});
