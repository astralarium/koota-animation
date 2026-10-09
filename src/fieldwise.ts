import { getEasing } from "./easing.js";
import { numberField } from "./fields.js";
import type {
  AnimationPropsBase,
  EasingProps,
  Field,
  InterpolateFn,
  Keyframe,
} from "./types.js";

type Values = Record<string, unknown>;
type FieldMap = Partial<Record<string, Field<unknown>>>;
type Entry = [key: string, field: Field<unknown>];

/** Default `interpolate` and `copy` over the fields of `init()`, read on
 *  first use. Number fields default to {@link numberField}. */
export function fieldwise<T, P extends AnimationPropsBase>(
  init: () => T,
  fields: FieldMap = {},
): {
  interpolate: InterpolateFn<T, P>;
  copy: (target: T, source: T) => void;
} {
  let entries: Entry[] | undefined;
  const getEntries = (): Entry[] => {
    if (!entries) {
      const record = init() as Values;
      entries = Object.keys(record).map((key) => {
        const field =
          fields[key] ??
          (typeof record[key] === "number" ? numberField : undefined);
        if (!field) {
          throw new TypeError(`Field "${key}" needs an entry in \`fields\``);
        }
        return [key, field];
      });
    }
    return entries;
  };

  const interpolate: InterpolateFn<T, P> = (
    out,
    start,
    target,
    progress,
    props,
  ) => {
    const o = out as Values;
    const s = start as Values;
    const to = target as Values;
    const easing = (props as EasingProps<Values> | undefined)?.easing;
    for (const [key, field] of getEntries()) {
      if (to[key] === undefined) continue;
      const t = getEasing(easing, key)(progress);
      assign(o, key, field.interpolate(o[key], s[key], to[key], t));
    }
  };

  const copy = (target: T, source: T): void => {
    const t = target as Values;
    const s = source as Values;
    for (const [key, field] of getEntries()) {
      assign(t, key, field.copy(t[key], s[key]));
    }
  };

  return { interpolate, copy };
}

/** Skip same-value writes: in-place fields may be read-only properties. */
function assign(record: Values, key: string, value: unknown): void {
  if (record[key] !== value) record[key] = value;
}

/** Default `equals`: values by field `equals` or `===`, props by `===`
 *  except `onComplete`. */
export function keyframeEquals<T, P extends AnimationPropsBase>(
  fields: FieldMap = {},
): (a: Keyframe<T, P>, b: Keyframe<T, P>) => boolean {
  return (a, b) =>
    recordEquals(
      a.value,
      b.value,
      (key, x, y) =>
        x === y ||
        (x !== undefined &&
          y !== undefined &&
          (fields[key]?.equals?.(x, y) ?? false)),
    ) &&
    recordEquals(
      a.props,
      b.props,
      (key, x, y) => key === "onComplete" || x === y,
    );
}

/** Absent keys equal `undefined`. */
function recordEquals(
  a: object | undefined,
  b: object | undefined,
  equals: (key: string, a: unknown, b: unknown) => boolean,
): boolean {
  const ra = (a ?? {}) as Values;
  const rb = (b ?? {}) as Values;
  for (const key in ra) {
    if (!equals(key, ra[key], rb[key])) return false;
  }
  for (const key in rb) {
    if (!(key in ra) && !equals(key, undefined, rb[key])) return false;
  }
  return true;
}
