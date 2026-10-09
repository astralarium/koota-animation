/** Maps normalized time 0–1 to eased progress. Back easings overshoot 0–1. */
export type EasingFn = (t: number) => number;

/** Easing prop: single function for all keys, or per-key functions */
export type EasingProp<K extends string> =
  EasingFn | Partial<Record<K, EasingFn>>;

/** Get easing function for a specific key from an EasingProp */
export function getEasing<K extends string>(
  easing: EasingProp<K> | undefined,
  key: K,
): EasingFn {
  if (!easing) return linear;
  if (typeof easing === "function") return easing;
  return easing[key] ?? linear;
}

// Linear (no easing)
export const linear: EasingFn = (t) => t;

// Power-based easing factories
// Uses direct multiplication for n=2-8, Math.pow for other values
export const easeInPow = (n: number): EasingFn => {
  switch (n) {
    case 2:
      return (t) => t * t;
    case 3:
      return (t) => t * t * t;
    case 4:
      return (t) => t * t * t * t;
    case 5:
      return (t) => t * t * t * t * t;
    case 6:
      return (t) => t * t * t * t * t * t;
    case 7:
      return (t) => t * t * t * t * t * t * t;
    case 8:
      return (t) => t * t * t * t * t * t * t * t;
    default:
      return (t) => Math.pow(t, n);
  }
};

export const easeOutPow = (n: number): EasingFn => {
  switch (n) {
    case 2:
      return (t) => {
        const m = 1 - t;
        return 1 - m * m;
      };
    case 3:
      return (t) => {
        const m = 1 - t;
        return 1 - m * m * m;
      };
    case 4:
      return (t) => {
        const m = 1 - t;
        return 1 - m * m * m * m;
      };
    case 5:
      return (t) => {
        const m = 1 - t;
        return 1 - m * m * m * m * m;
      };
    case 6:
      return (t) => {
        const m = 1 - t;
        return 1 - m * m * m * m * m * m;
      };
    case 7:
      return (t) => {
        const m = 1 - t;
        return 1 - m * m * m * m * m * m * m;
      };
    case 8:
      return (t) => {
        const m = 1 - t;
        return 1 - m * m * m * m * m * m * m * m;
      };
    default:
      return (t) => 1 - Math.pow(1 - t, n);
  }
};

export const easeInOutPow = (n: number): EasingFn => {
  switch (n) {
    case 2:
      return (t) => {
        if (t < 0.5) return 2 * t * t;
        const m = 1 - t;
        return 1 - 2 * m * m;
      };
    case 3:
      return (t) => {
        if (t < 0.5) return 4 * t * t * t;
        const m = 1 - t;
        return 1 - 4 * m * m * m;
      };
    case 4:
      return (t) => {
        if (t < 0.5) return 8 * t * t * t * t;
        const m = 1 - t;
        return 1 - 8 * m * m * m * m;
      };
    case 5:
      return (t) => {
        if (t < 0.5) return 16 * t * t * t * t * t;
        const m = 1 - t;
        return 1 - 16 * m * m * m * m * m;
      };
    case 6:
      return (t) => {
        if (t < 0.5) return 32 * t * t * t * t * t * t;
        const m = 1 - t;
        return 1 - 32 * m * m * m * m * m * m;
      };
    case 7:
      return (t) => {
        if (t < 0.5) return 64 * t * t * t * t * t * t * t;
        const m = 1 - t;
        return 1 - 64 * m * m * m * m * m * m * m;
      };
    case 8:
      return (t) => {
        if (t < 0.5) return 128 * t * t * t * t * t * t * t * t;
        const m = 1 - t;
        return 1 - 128 * m * m * m * m * m * m * m * m;
      };
    default: {
      const c = Math.pow(2, n - 1);
      return (t) => {
        if (t < 0.5) return c * Math.pow(t, n);
        const m = 1 - t;
        return 1 - c * Math.pow(m, n);
      };
    }
  }
};

// Sine
export const easeInSine: EasingFn = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine: EasingFn = (t) => Math.sin((t * Math.PI) / 2);
export const easeInOutSine: EasingFn = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

// Exponential
export const easeInExpo: EasingFn = (t) =>
  t === 0 ? 0 : Math.pow(2, 10 * t - 10);
export const easeOutExpo: EasingFn = (t) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
export const easeInOutExpo: EasingFn = (t) =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : t < 0.5
        ? Math.pow(2, 20 * t - 10) / 2
        : (2 - Math.pow(2, -20 * t + 10)) / 2;

// Circular
export const easeInCirc: EasingFn = (t) => 1 - Math.sqrt(1 - t * t);
export const easeOutCirc: EasingFn = (t) => Math.sqrt(1 - Math.pow(t - 1, 2));
export const easeInOutCirc: EasingFn = (t) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;

// Back (overshoot) factories
const DEFAULT_OVERSHOOT = 1.70158;

export const easeInBackWith = (overshoot: number): EasingFn => {
  const c = overshoot + 1;
  return (t) => c * t * t * t - overshoot * t * t;
};

export const easeOutBackWith = (overshoot: number): EasingFn => {
  const c = overshoot + 1;
  return (t) => 1 + c * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);
};

export const easeInOutBackWith = (overshoot: number): EasingFn => {
  const c = overshoot * 1.525;
  return (t) =>
    t < 0.5
      ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
};

export const easeInBack = /*#__PURE__*/ easeInBackWith(DEFAULT_OVERSHOOT);
export const easeOutBack = /*#__PURE__*/ easeOutBackWith(DEFAULT_OVERSHOOT);
export const easeInOutBack = /*#__PURE__*/ easeInOutBackWith(DEFAULT_OVERSHOOT);

// Convenience defaults (cubic)
export const easeIn = /*#__PURE__*/ easeInPow(3);
export const easeOut = /*#__PURE__*/ easeOutPow(3);
export const easeInOut = /*#__PURE__*/ easeInOutPow(3);
