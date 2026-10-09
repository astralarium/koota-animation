import type { Entity, Trait, TraitRecord } from "koota";

import type { AnimationPropsBase, AnimationSystem, Keyframe } from "./types.js";

/** Options for the function {@link createLink} returns. */
export interface LinkOptions<
  T,
  P extends AnimationPropsBase = AnimationPropsBase,
> {
  /** Target keyframe. An entity that has the trait animates to it; an entity
   * without it snaps to it. */
  animate?: Keyframe<T, P>;
}

/**
 * Returns a function that shares an entity's trait with a source object.
 * The trait record becomes `bind(source)`; an existing trait value is copied
 * onto the source first. AoS traits share every field; SoA traits share
 * object fields and copy number fields once.
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
