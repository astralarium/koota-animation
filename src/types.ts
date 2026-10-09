import type { Entity, Trait, TraitRecord, World } from "koota";

import type { EasingProp } from "./easing.js";

/** Base keyframe props; extend for custom props. */
export interface AnimationPropsBase {
  /** Fires when the keyframe finishes or `setKeyframes()` replaces it. */
  onComplete?: () => void;
}

/** Props of the default `interpolate`. */
export interface EasingProps<T> extends AnimationPropsBase {
  /** One easing for all fields, or one per field. */
  easing?: EasingProp<Extract<keyof T, string>>;
}

/** One animation step: target value, duration, and props. */
export interface Keyframe<T, P = AnimationPropsBase> {
  /** Target value. */
  value: Partial<T>;
  /** Time (ms) to reach `value` from the previous state; finite, non-negative. */
  duration: number;
  /** User-defined props, e.g. easing and `onComplete`. */
  props?: P;
  /** Opaque consumer metadata, e.g. a tag for a delete animation.
   * `setKeyframes()` compares it by identity. */
  userData?: unknown;
}

/** Write the value between `start` and `target` into `out` in place. */
export type InterpolateFn<
  T,
  P extends AnimationPropsBase = AnimationPropsBase,
> = (
  /** Live trait record. */
  out: T,
  /** Trait value when the active keyframe started. */
  start: T,
  /** Keyframe `value`. */
  target: Partial<T>,
  /** Linear 0–1; the implementation applies easing. */
  progress: number,
  /** Keyframe `props`; undefined from `snap()`. */
  props: P | undefined,
  entity: Entity,
) => void;

/** Record of the `Keyframes` trait. */
export interface AnimationState<
  T,
  P extends AnimationPropsBase = AnimationPropsBase,
> {
  /** Keyframe queue; the head is active. */
  frames: Keyframe<T, P>[];
  /** Time (ms) elapsed in the active keyframe. */
  elapsed: number;
  /** Requeue completed keyframes at the tail. */
  loop: boolean;
  /** Trait value captured when the active keyframe started. */
  snapshot: T;
  /** Refresh {@link snapshot} from the current trait value on next tick. */
  needsSnapshot: boolean;
}

/** Koota schema of the `Keyframes` trait; its record is {@link AnimationState}. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- koota `Schema` needs an index signature
export type KeyframesSchema<
  T,
  P extends AnimationPropsBase = AnimationPropsBase,
> = {
  frames: () => Keyframe<T, P>[];
  elapsed: number;
  loop: boolean;
  snapshot: () => T;
  needsSnapshot: boolean;
};

/** Interpolation of one field. */
export interface Field<V> {
  /** Write the value at eased `t` into `out` and return it; primitives
   * return the new value. */
  interpolate(out: V, start: V, target: V, t: number): V;
  /** Copy `source` into `target` and return it; primitives return `source`. */
  copy(target: V, source: V): V;
  /** Compare two values. Default: `===`. */
  equals?(a: V, b: V): boolean;
}

/** {@link Field} per key: optional for number fields, required otherwise. */
export type Fields<T> = {
  [K in keyof T as T[K] extends number ? never : K]-?: Field<T[K]>;
} & {
  [K in keyof T as T[K] extends number ? K : never]?: Field<T[K]>;
};

/** Options for {@link createAnimationSystem}. */
export type AnimationSystemOptions<
  TTrait extends Trait,
  P extends AnimationPropsBase = AnimationPropsBase,
> = {
  /** Trait to animate. */
  trait: TTrait;
  /** Compare keyframe `value` and `props`. Lets `setKeyframes()` skip a
   * queue matching the current one; the system compares `loop`, `duration`,
   * and `userData` itself. Default: values by field `equals` or `===`, props
   * by `===` except `onComplete`. */
  equals?: (
    a: Keyframe<TraitRecord<TTrait>, P>,
    b: Keyframe<TraitRecord<TTrait>, P>,
  ) => boolean;
} & (
  | CustomInterpolation<TraitRecord<TTrait>, P>
  | FieldInterpolation<TraitRecord<TTrait>>
);

/** Whole-record interpolation. */
export interface CustomInterpolation<
  T,
  P extends AnimationPropsBase = AnimationPropsBase,
> {
  /** Write the value between start and target into the trait record. */
  interpolate: InterpolateFn<T, P>;
  /** Copy `source` into `target` in place. */
  copy: (target: T, source: T) => void;
  fields?: undefined;
}

/** Per-field interpolation; reads {@link EasingProps}. */
export type FieldInterpolation<T> = {
  interpolate?: undefined;
  copy?: undefined;
} & (Partial<Fields<T>> extends Fields<T>
  ? {
      /** Field interpolations; number fields default to `numberField`. */
      fields?: Fields<T>;
    }
  : {
      /** Field interpolations; number fields default to `numberField`. */
      fields: Fields<T>;
    });

/** Per-trait animation system created by {@link createAnimationSystem}. */
export interface AnimationSystem<
  TTrait extends Trait,
  P extends AnimationPropsBase = AnimationPropsBase,
> {
  /** The animated trait. */
  trait: TTrait;
  /** Keyframe queue trait; present while animating. Alias per system, e.g. `PositionKeyframes`. */
  Keyframes: Trait<KeyframesSchema<TraitRecord<TTrait>, P>>;
  /** Copy `source` into `target` in place. */
  copy: (target: TraitRecord<TTrait>, source: TraitRecord<TTrait>) => void;
  /** Set the trait to `value` immediately; queued keyframes keep playing. */
  snap: (entity: Entity, value: Partial<TraitRecord<TTrait>>) => void;
  /** Append a keyframe to the entity's queue. Throws on a negative or
   * non-finite duration. */
  pushKeyframe: (
    entity: Entity,
    keyframe: Keyframe<TraitRecord<TTrait>, P>,
  ) => void;
  /** Replace the entity's queue; fire the replaced keyframes' `onComplete`.
   * Returns whether `frames` installed: false for a destroyed entity or a
   * queue `equals` matches, whose callbacks never fire. Throws on a negative
   * or non-finite duration, or a looping queue with zero total duration. */
  setKeyframes: (
    entity: Entity,
    frames: Keyframe<TraitRecord<TTrait>, P>[],
    options?: { loop?: boolean },
  ) => boolean;
  /** Drop the entity's queue without firing `onComplete`; the trait keeps
   * its current value. */
  cancel: (entity: Entity) => void;
  /** Advance all entities' keyframes by `dt` ms, then fire completed
   * keyframes' `onComplete`. Call once per frame. */
  tick: (world: World, dt: number) => void;
}
