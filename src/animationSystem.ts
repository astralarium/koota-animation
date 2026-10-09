import {
  type Entity,
  type Schema,
  type Trait,
  trait,
  type TraitRecord,
  type World,
} from "koota";

import type {
  AnimationPropsBase,
  AnimationState,
  AnimationSystem,
  AnimationSystemOptions,
  Keyframe,
  KeyframesSchema,
} from "./types.js";

/**
 * Creates a keyframe animation system for one trait.
 *
 * Module-level systems tree-shake when assigned whole and marked pure;
 * destructuring the result keeps it in every bundle.
 *
 * @example
 * ```ts
 * interface PositionProps extends AnimationPropsBase {
 *   easing?: EasingFn;
 * }
 *
 * export const PositionAnimation = /*#__PURE__*\/ createAnimationSystem({
 *   trait: Position,
 *   interpolate: (out, start, target, progress, props: PositionProps | undefined) => {
 *     const t = props?.easing?.(progress) ?? progress;
 *     if (target.x !== undefined) out.x = lerp(start.x, target.x, t);
 *     if (target.y !== undefined) out.y = lerp(start.y, target.y, t);
 *   },
 *   copy: (target, source) => Object.assign(target, source),
 * });
 *
 * PositionAnimation.pushKeyframe(entity, {
 *   value: { x: 10 },
 *   duration: 1000,
 *   props: { easing: easeInOut, onComplete: () => console.log("done") },
 * });
 *
 * // Once per frame
 * PositionAnimation.tick(world, deltaMs);
 * ```
 */
export function createAnimationSystem<
  TTrait extends Trait,
  P extends AnimationPropsBase = AnimationPropsBase,
>({
  trait: targetTrait,
  interpolate,
  copy,
  equals,
}: AnimationSystemOptions<TTrait, P>): AnimationSystem<TTrait, P> {
  type T = TraitRecord<TTrait>;

  const Keyframes: Trait<KeyframesSchema<T, P>> = trait({
    frames: (): Keyframe<T, P>[] => [],
    elapsed: 0,
    loop: false,
    snapshot: () => initSnapshot(targetTrait),
    needsSnapshot: true,
  });

  let scratch: T | undefined;
  const snap = (entity: Entity, value: Partial<T>): void => {
    if (!entity.isAlive() || !entity.has(targetTrait)) return;
    const record = entity.get(targetTrait) as T;
    const start = (scratch ??= initSnapshot(targetTrait));
    copy(start, record);
    interpolate(record, start, value, 1, undefined, entity);
    // SoA records are copies: write back.
    entity.set(targetTrait, record);
  };

  const pushKeyframe = (entity: Entity, keyframe: Keyframe<T, P>): void => {
    assertDuration(keyframe);
    if (!entity.isAlive()) return;
    if (!entity.has(Keyframes)) {
      entity.add(Keyframes);
    }
    entity.get(Keyframes)!.frames.push(keyframe);
  };

  const setKeyframes = (
    entity: Entity,
    frames: Keyframe<T, P>[],
    opts?: { loop?: boolean },
  ): boolean => {
    const loop = opts?.loop ?? false;
    let period = 0;
    for (const frame of frames) {
      assertDuration(frame);
      period += frame.duration;
    }
    if (loop && !(period > 0)) {
      throw new RangeError("Looping keyframes need a positive total duration");
    }
    if (!entity.isAlive()) return false;

    const current = entity.has(Keyframes) ? entity.get(Keyframes)! : undefined;
    if (
      equals &&
      current?.loop === loop &&
      current.frames.length === frames.length &&
      frames.every((frame, i) => {
        const other = current.frames[i];
        return (
          frame.duration === other.duration &&
          frame.userData === other.userData &&
          equals(frame, other)
        );
      })
    ) {
      return false;
    }

    const replaced = current?.frames.flatMap((frame) => {
      const fn = frame.props?.onComplete;
      return fn ? [fn] : [];
    });

    if (!current) {
      entity.add(Keyframes);
    }
    entity.set(Keyframes, {
      frames: [...frames],
      elapsed: 0,
      loop,
      needsSnapshot: true,
    });

    // After commit: a callback may destroy the entity or install keyframes.
    if (replaced) {
      for (const fn of replaced) fn();
    }
    return true;
  };

  const cancel = (entity: Entity): void => {
    if (entity.isAlive() && entity.has(Keyframes)) entity.remove(Keyframes);
  };

  // Three phases: advance queues inside the query; then fire completions,
  // free to mutate any trait; then drop queues still empty. A completion that
  // pushes onto its own drained queue carries the leftover time.
  const tick = (world: World, dt: number): void => {
    const completed: (() => void)[] = [];
    const drained: Entity[] = [];

    world.query(targetTrait, Keyframes).updateEach((data, entity) => {
      // Query records: updateEach writes SoA mutations back to the store.
      const traitData = data[0] as T;
      const anim = data[1] as AnimationState<T, P>;

      if (anim.frames.length === 0) {
        drained.push(entity);
        return;
      }
      anim.elapsed += dt;

      // Complete every keyframe `elapsed` spans, carrying the excess.
      while (
        anim.frames.length > 0 &&
        anim.elapsed >= anim.frames[0].duration
      ) {
        const keyframe = anim.frames[0];
        if (anim.needsSnapshot) copy(anim.snapshot, traitData);
        interpolate(
          traitData,
          anim.snapshot,
          keyframe.value,
          1,
          keyframe.props,
          entity,
        );
        const onComplete = keyframe.props?.onComplete;
        if (onComplete) completed.push(onComplete);

        anim.elapsed -= keyframe.duration;
        if (anim.loop) {
          anim.frames.push(anim.frames.shift()!);
        } else {
          anim.frames.shift();
        }
        anim.needsSnapshot = true;
      }

      if (anim.frames.length > 0) {
        const keyframe = anim.frames[0];
        if (anim.needsSnapshot) {
          copy(anim.snapshot, traitData);
          anim.needsSnapshot = false;
        }
        interpolate(
          traitData,
          anim.snapshot,
          keyframe.value,
          anim.elapsed / keyframe.duration,
          keyframe.props,
          entity,
        );
      } else {
        drained.push(entity);
      }
      entity.changed(targetTrait);
    });

    for (const fn of completed) fn();

    for (const entity of drained) {
      if (
        entity.isAlive() &&
        entity.has(Keyframes) &&
        entity.get(Keyframes)!.frames.length === 0
      ) {
        entity.remove(Keyframes);
      }
    }
  };

  return {
    trait: targetTrait,
    Keyframes,
    copy,
    snap,
    pushKeyframe,
    setKeyframes,
    cancel,
    tick,
  };
}

function assertDuration(keyframe: { duration: number }): void {
  if (!(keyframe.duration >= 0 && keyframe.duration < Infinity)) {
    throw new RangeError(
      `Keyframe duration must be finite and non-negative: ${keyframe.duration}`,
    );
  }
}

function initSnapshot<TTrait extends Trait>(
  targetTrait: TTrait,
): TraitRecord<TTrait> {
  const schema = targetTrait.schema as Schema;
  if (typeof schema === "function") {
    return schema() as TraitRecord<TTrait>;
  }
  const result: Record<string, unknown> = {};
  for (const key in schema) {
    const value = schema[key];
    result[key] = typeof value === "function" ? value() : value;
  }

  return result as TraitRecord<TTrait>;
}
