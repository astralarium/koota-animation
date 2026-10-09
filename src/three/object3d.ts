import { type Entity, trait } from "koota";
import { type Object3D, Quaternion, Vector3 } from "three";

import type { Keyframe } from "../types.js";
import {
  Transform,
  TransformAnimation,
  type TransformAnimationProps,
  type TransformValue,
} from "./transform.js";

/** Object3D parent at the last {@link linkObject3D}; a changed parent triggers a reparent. */
export const ParentObject = /*#__PURE__*/ trait(() => null as Object3D | null);

/** Options for {@link linkObject3D}. */
export interface LinkObject3DOptions {
  /** Keyframe to the target transform. An entity with a Transform animates
   * to it; a fresh entity snaps to its value. */
  animate?: Keyframe<TransformValue, TransformAnimationProps>;
}

/**
 * Binds an entity's {@link Transform} to an Object3D: the trait record holds
 * the object's own `position`, `quaternion`, and `scale`, so writes to either
 * side are shared. An existing Transform's values carry over to the object;
 * a moved object is reparented with its world transform preserved.
 *
 * @example
 * ```tsx
 * <group ref={(group) => { if (group) linkObject3D(entity, group); }} />
 * ```
 */
export function linkObject3D(
  entity: Entity,
  object: Object3D,
  options?: LinkObject3DOptions,
): void {
  if (!entity.isAlive()) return;

  const transform = entity.get(Transform);
  const currentParent = object.parent;

  if (transform) {
    const oldParent = entity.get(ParentObject);
    if (oldParent && oldParent !== currentParent && currentParent) {
      reparentObject3D(entity, oldParent, currentParent);
    }

    object.position.copy(transform.position);
    object.quaternion.copy(transform.rotation);
    object.scale.copy(transform.scale);
    entity.set(Transform, {
      position: object.position,
      rotation: object.quaternion,
      scale: object.scale,
    });

    if (options?.animate) {
      TransformAnimation.setKeyframes(entity, [options.animate]);
    }
  } else {
    entity.add(
      Transform({
        position: object.position,
        rotation: object.quaternion,
        scale: object.scale,
      }),
    );

    if (options?.animate) {
      applyTransformValue(entity, options.animate.value);
    }
  }

  if (entity.has(ParentObject)) {
    entity.set(ParentObject, currentParent);
  } else {
    entity.add(ParentObject(currentParent));
  }
}

/** Copies the given channels into the entity's {@link Transform}. */
export function applyTransformValue(
  entity: Entity,
  value: Partial<TransformValue>,
): void {
  const transform = entity.get(Transform);
  if (!transform) return;

  if (value.position) transform.position.copy(value.position);
  if (value.rotation) transform.rotation.copy(value.rotation);
  if (value.scale) transform.scale.copy(value.scale);

  entity.changed(Transform);
}

const _q1 = /*#__PURE__*/ new Quaternion();
const _s1 = /*#__PURE__*/ new Vector3();
const _s2 = /*#__PURE__*/ new Vector3();

/** Rewrites the entity's local {@link Transform} into `newParent`'s frame so
 *  its world position, rotation, and scale carry over unchanged. */
export function reparentObject3D(
  entity: Entity,
  oldParent: Object3D,
  newParent: Object3D,
): void {
  const transform = entity.get(Transform);
  if (!transform) return;

  const { position, rotation, scale } = transform;

  oldParent.updateMatrixWorld();
  newParent.updateMatrixWorld();

  oldParent.localToWorld(position);
  newParent.worldToLocal(position);

  oldParent.getWorldQuaternion(_q1);
  _q1.multiply(rotation);
  newParent.getWorldQuaternion(rotation).invert();
  rotation.multiply(_q1);

  oldParent.getWorldScale(_s1);
  newParent.getWorldScale(_s2);
  scale.multiply(_s1).divide(_s2);

  entity.changed(Transform);
}
