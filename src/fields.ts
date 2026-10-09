import { lerp } from "./lerp.js";
import type { Field } from "./types.js";

/** Lerp a number. */
export const numberField: Field<number> = {
  interpolate: (_out, start, target, t) => lerp(start, target, t),
  copy: (_target, source) => source,
};

/** Switch a primitive to the target when eased `t` reaches 1. */
export const stepField = {
  interpolate: <V extends Primitive>(
    _out: V,
    start: V,
    target: V,
    t: number,
  ) => (t >= 1 ? target : start),
  copy: <V extends Primitive>(_target: V, source: V) => source,
};

type Primitive = string | number | boolean | bigint | symbol | null | undefined;
