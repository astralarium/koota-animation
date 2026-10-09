import type { Entity, Trait, TraitRecord, World } from "koota";

/** Base for animation props. Extend when defining custom props. */
export interface AnimationPropsBase {
  /** Fires when the keyframe is no longer active — either finished or replaced via `setKeyframes`. */
  onComplete?: () => void;
}

/** A target value, duration, and optional props the animation interpolates to. */
export interface Keyframe<T, P = AnimationPropsBase> {
  /** Target value to interpolate to. */
  value: Partial<T>;
  /** Time (ms) to reach `value` from the previous state; finite, non-negative. */
  duration: number;
  /** User-defined props (easing, bezier, callbacks, etc.). */
  props?: P;
  /** Opaque metadata. Ignored by the animation system; consumers may tag
   * keyframes (e.g. as a delete animation) and inspect them later. */
  userData?: unknown;
}

/**
 * Interpolates between `start` and `target`, mutating `out` in place to avoid
 * GC pressure. `progress` is raw 0–1; the implementation applies any easing.
 */
export type InterpolateFn<
  T,
  P extends AnimationPropsBase = AnimationPropsBase,
> = (
  out: T,
  /** Snapshot of the trait value when the current keyframe started. */
  start: T,
  target: Partial<T>,
  progress: number,
  props: P | undefined,
  entity: Entity,
) => void;

/** Per-entity animation state: the record of the Keyframes trait. */
export interface AnimationState<
  T,
  P extends AnimationPropsBase = AnimationPropsBase,
> {
  /** Queue of keyframes to process; the head is the active one. */
  frames: Keyframe<T, P>[];
  /** Time (ms) elapsed in the active keyframe. */
  elapsed: number;
  /** Cycle keyframes when complete instead of removing them. */
  loop: boolean;
  /** Trait value captured when the active keyframe started. */
  snapshot: T;
  /** Refresh {@link snapshot} from the current trait value on next tick. */
  needsSnapshot: boolean;
}

// Type alias: koota `Schema` requires an index-signature-compatible shape.
/** Koota schema of the Keyframes trait; its record is {@link AnimationState}. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
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

/** Options for {@link createAnimationSystem}. */
export interface AnimationSystemOptions<
  TTrait extends Trait,
  P extends AnimationPropsBase = AnimationPropsBase,
> {
  /** Trait to animate (e.g., Position). */
  trait: TTrait;
  /** Interpolates between start and target into the trait's record in place. */
  interpolate: InterpolateFn<TraitRecord<TTrait>, P>;
  /** Copies a trait value into the snapshot (avoids allocation). */
  copy: (target: TraitRecord<TTrait>, source: TraitRecord<TTrait>) => void;
  /** Keyframe `value` and `props` equality. With it, `setKeyframes` skips a
   * queue matching the current one; the system already matches `loop`,
   * `duration`, and `userData`. */
  equals?: (
    a: Keyframe<TraitRecord<TTrait>, P>,
    b: Keyframe<TraitRecord<TTrait>, P>,
  ) => boolean;
}

/** Per-trait animation system created by {@link createAnimationSystem}. */
export interface AnimationSystem<
  T,
  P extends AnimationPropsBase = AnimationPropsBase,
> {
  /** The keyframes trait — alias on use (e.g., `PositionKeyframes`). */
  Keyframes: Trait<KeyframesSchema<T, P>>;
  /** Append a keyframe to the entity's queue (adds the trait if absent). */
  pushKeyframe: (entity: Entity, keyframe: Keyframe<T, P>) => void;
  /** Replace all keyframes on an entity (adds the trait if absent). Fires
   * `onComplete` on the replaced frames. Returns whether the frames were
   * installed — false on a dead entity or a deduplicated no-op, whose new
   * callbacks will never fire. Throws on a looping queue with no total
   * duration. */
  setKeyframes: (
    entity: Entity,
    frames: Keyframe<T, P>[],
    options?: { loop?: boolean },
  ) => boolean;
  /** Drop the entity's queue without firing `onComplete`; the trait keeps
   * its current value. */
  cancel: (entity: Entity) => void;
  /** Advance all entities' keyframes by `dt` ms, then fire completed
   * keyframes' `onComplete`. Call once per frame. */
  tick: (world: World, dt: number) => void;
}
