import type { EasingFn } from "./easing.js";

const NEWTON_ITERATIONS = 8;
const NEWTON_MIN_SLOPE = 1e-6;
const PRECISION = 1e-7;
const SUBDIVISION_MAX_ITERATIONS = 32;

/**
 * Easing from cubic bezier control points; equivalent to CSS
 * `cubic-bezier(p1x, p1y, p2x, p2y)`. `p1x` and `p2x` lie in 0–1; input
 * outside 0–1 extends along the tangent at the nearest endpoint.
 *
 * @example
 * const ease = cubicBezier(0.25, 0.1, 0.25, 1);
 */
export function cubicBezier(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
): EasingFn {
  const ax = 3 * p1x - 3 * p2x + 1;
  const bx = 3 * p2x - 6 * p1x;
  const cx = 3 * p1x;

  const ay = 3 * p1y - 3 * p2y + 1;
  const by = 3 * p2y - 6 * p1y;
  const cy = 3 * p1y;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDerivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  // Curve parameter `t` whose x is `x`: Newton-Raphson, then bisection.
  const solveX = (x: number): number => {
    let t = x;
    for (let i = 0; i < NEWTON_ITERATIONS; i++) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < PRECISION) return t;
      const slope = sampleDerivativeX(t);
      if (Math.abs(slope) < NEWTON_MIN_SLOPE) break;
      t -= error / slope;
    }

    let t0 = 0;
    let t1 = 1;
    t = x;
    for (let i = 0; i < SUBDIVISION_MAX_ITERATIONS; i++) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < PRECISION) return t;
      if (error < 0) t0 = t;
      else t1 = t;
      t = (t0 + t1) / 2;
    }
    return t;
  };

  // Tangent slopes at the endpoints, per the CSS easing spec: through the
  // nearest control point with a usable x, else flat.
  const startSlope = p1x > 0 ? p1y / p1x : p2x > 0 ? p2y / p2x : 0;
  const endSlope =
    p2x < 1 ? (p2y - 1) / (p2x - 1) : p1x < 1 ? (p1y - 1) / (p1x - 1) : 0;

  return (x) => {
    if (x < 0) return startSlope === 0 ? 0 : startSlope * x;
    if (x > 1) return 1 + endSlope * (x - 1);
    if (x === 0 || x === 1) return x;
    return sampleY(solveX(x));
  };
}

/** CSS named timing functions. */
export const bezierPresets = {
  ease: /*#__PURE__*/ cubicBezier(0.25, 0.1, 0.25, 1),
  easeIn: /*#__PURE__*/ cubicBezier(0.42, 0, 1, 1),
  easeOut: /*#__PURE__*/ cubicBezier(0, 0, 0.58, 1),
  easeInOut: /*#__PURE__*/ cubicBezier(0.42, 0, 0.58, 1),
} as const;
