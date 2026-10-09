import type { Entity, Trait, TraitRecord } from "koota";

import type { AnimationPropsBase, AnimationSystem, Keyframe } from "./types.js";

/** Options for the function {@link createLink} returns. */
export interface LinkOptions<
  T,
  P extends AnimationPropsBase = AnimationPropsBase,
> {
  /** Target keyframe: an entity with the trait animates to it; a fresh
   * entity snaps to it. */
  animate?: Keyframe<T, P>;
}

/**
 * Create a function linking an entity's trait to a source object.
 * `bind(source)` becomes the trait record; an existing trait value copies
 * onto the source first. AoS traits share every field; SoA traits share
 * object fields and copy primitive fields once.
 */
export function createLink<
  TTrait extends Trait,
  P extends AnimationPropsBase,
  S,
>(
  system: AnimationSystem<TTrait, P>,
  bind: (source: S) => TraitRecord<TTrait>,
): (
  entity: Entity,
  source: S,
  options?: LinkOptions<TraitRecord<TTrait>, P>,
) => void {
  return (entity, source, options) => {
    if (!entity.isAlive()) return;

    const record = bind(source);
    const current = entity.get(system.trait);

    if (current) {
      system.copy(record, current);
      entity.set(system.trait, record);
      if (options?.animate) system.setKeyframes(entity, [options.animate]);
    } else {
      entity.add(system.trait(record));
      if (options?.animate) system.snap(entity, options.animate.value);
    }
  };
}
