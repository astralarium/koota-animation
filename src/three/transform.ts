import { trait, type TraitRecord } from "koota";
import { Quaternion, Vector3 } from "three";

import { createAnimationSystem } from "../animationSystem.js";
import { lerpField, slerpField } from "./fields.js";

/** Local position, rotation, and scale. {@link linkObject3D} aliases these to an Object3D's own vectors. */
export const Transform = /*#__PURE__*/ trait({
  position: () => new Vector3(),
  rotation: () => new Quaternion(),
  scale: () => new Vector3(1, 1, 1),
});

/** Record of {@link Transform}. */
export type TransformValue = TraitRecord<typeof Transform>;

/** Keyframe animation of {@link Transform}: lerps position and scale, slerps rotation. */
export const TransformAnimation = /*#__PURE__*/ createAnimationSystem({
  trait: Transform,
  fields: { position: lerpField, rotation: slerpField, scale: lerpField },
});
