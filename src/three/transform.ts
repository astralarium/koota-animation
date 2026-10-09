import { trait, type TraitRecord } from "koota";
import { Quaternion, Vector3 } from "three";

import { createAnimationSystem } from "../animationSystem.js";
import { type EasingProp, getEasing } from "../easing.js";
import { lerp } from "../lerp.js";
import type { AnimationPropsBase } from "../types.js";

/** Local position, rotation, and scale. {@link linkObject3D} aliases these to an Object3D's own vectors. */
export const Transform = /*#__PURE__*/ trait({
  position: () => new Vector3(),
  rotation: () => new Quaternion(),
  scale: () => new Vector3(1, 1, 1),
});

export type TransformValue = TraitRecord<typeof Transform>;

/** Props for {@link TransformAnimation} keyframes. */
export interface TransformAnimationProps extends AnimationPropsBase {
  /** One easing for all channels, or one per channel. */
  easing?: EasingProp<keyof TransformValue>;
}

/** Keyframe animation of {@link Transform}: lerps position and scale, slerps rotation. */
export const TransformAnimation = /*#__PURE__*/ createAnimationSystem({
  trait: Transform,
  interpolate: (
    out,
    start,
    target,
    progress,
    props: TransformAnimationProps | undefined,
  ) => {
    if (target.position) {
      const t = getEasing(props?.easing, "position")(progress);
      out.position.set(
        lerp(start.position.x, target.position.x, t),
        lerp(start.position.y, target.position.y, t),
        lerp(start.position.z, target.position.z, t),
      );
    }
    if (target.rotation) {
      const t = getEasing(props?.easing, "rotation")(progress);
      out.rotation.slerpQuaternions(start.rotation, target.rotation, t);
    }
    if (target.scale) {
      const t = getEasing(props?.easing, "scale")(progress);
      out.scale.set(
        lerp(start.scale.x, target.scale.x, t),
        lerp(start.scale.y, target.scale.y, t),
        lerp(start.scale.z, target.scale.z, t),
      );
    }
  },
  copy: (target, source) => {
    target.position.copy(source.position);
    target.rotation.copy(source.rotation);
    target.scale.copy(source.scale);
  },
  equals: (a, b) =>
    a.props?.easing === b.props?.easing &&
    channelEquals(a.value.position, b.value.position) &&
    channelEquals(a.value.rotation, b.value.rotation) &&
    channelEquals(a.value.scale, b.value.scale),
});

/** Both channels absent, or both present and equal. */
function channelEquals<V extends { equals(other: V): boolean }>(
  a: V | undefined,
  b: V | undefined,
): boolean {
  return a === b || (a !== undefined && b !== undefined && a.equals(b));
}
