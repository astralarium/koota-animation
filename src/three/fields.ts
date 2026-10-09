/** Mutable value with three.js-style `copy()`, `lerp()`, and `equals()`. */
interface Lerpable<V> {
  copy(source: V): V;
  lerp(target: V, t: number): V;
  equals(other: V): boolean;
}

/** Mutable value with three.js-style `copy()`, `slerp()`, and `equals()`. */
interface Slerpable<V> {
  copy(source: V): V;
  slerp(target: V, t: number): V;
  equals(other: V): boolean;
}

/** Lerp in place: Vector2, Vector3, Vector4, Color. */
export const lerpField = {
  interpolate: <V extends Lerpable<V>>(
    out: V,
    start: V,
    target: V,
    t: number,
  ) => out.copy(start).lerp(target, t),
  copy: <V extends Lerpable<V>>(target: V, source: V) => target.copy(source),
  equals: <V extends Lerpable<V>>(a: V, b: V) => a.equals(b),
};

/** Slerp in place: Quaternion. */
export const slerpField = {
  interpolate: <V extends Slerpable<V>>(
    out: V,
    start: V,
    target: V,
    t: number,
  ) => out.copy(start).slerp(target, t),
  copy: <V extends Slerpable<V>>(target: V, source: V) => target.copy(source),
  equals: <V extends Slerpable<V>>(a: V, b: V) => a.equals(b),
};
