# koota-animation

Keyframe animation for [koota](https://github.com/pmndrs/koota) traits.

```sh
pnpm add koota-animation koota
```

## Usage

```ts
import { createWorld, trait } from "koota";
import {
  type AnimationPropsBase,
  createAnimationSystem,
  type EasingFn,
  easeOut,
  lerp,
} from "koota-animation";

const Opacity = trait({ value: 1 });

// interpolate() props.
interface OpacityProps extends AnimationPropsBase {
  easing?: EasingFn;
}

export const OpacityAnimation = /*#__PURE__*/ createAnimationSystem({
  trait: Opacity,
  // Write the value at progress (0–1) into `out`.
  interpolate: (
    out,
    start,
    target,
    progress,
    props: OpacityProps | undefined,
  ) => {
    if (target.value === undefined) return;
    const t = props?.easing?.(progress) ?? progress;
    out.value = lerp(start.value, target.value, t);
  },
  // Copies the trait into the start snapshot.
  copy: (target, source) => {
    target.value = source.value;
  },
  // Optional. Lets `setKeyframes` skip an identical queue.
  equals: (a, b) => a.value.value === b.value.value,
});

const world = createWorld();
const entity = world.spawn(Opacity);

// Append keyframe. Keyframes start from the current value.
OpacityAnimation.pushKeyframe(entity, {
  value: { value: 0 }, // target value
  duration: 300, // ms
  props: { easing: easeOut, onComplete: () => entity.destroy() },
  userData: "fade-out", // arbitrary
});

// Replace queue; calls onComplete() callbacks.
OpacityAnimation.setKeyframes(
  entity,
  [
    { value: { value: 0 }, duration: 500 },
    { value: { value: 1 }, duration: 500 },
  ],
  { loop: true },
);

// Clear queue without calling keyframes onComplete().
OpacityAnimation.cancel(entity);

// Advances every animation by `delta` ms, then runs onComplete() callbacks.
OpacityAnimation.tick(world, delta);

// Entities with an active animation have the `Keyframes` trait.
world.query(OpacityAnimation.Keyframes);
```

### three.js

```sh
pnpm add three
```

```tsx
import {
  linkObject3D,
  reparentObject3D,
  TransformAnimation,
} from "koota-animation/three";

// Bind the entity trait to Object3D position, quaternion, and scale.
// Existing links animate into position.
// New Object3D links snap into position.
<group
  ref={(group) =>
    group &&
    linkObject3D(entity, group, {
      animate: { value: { scale: new Vector3(1, 1, 1) }, duration: 200 },
    })
  }
/>;

// Animate position, rotation, and scale with per-channel easing.
TransformAnimation.setKeyframes(entity, [
  {
    value: { position: new Vector3(0, 1, 0) },
    duration: 250,
    props: { easing: { position: easeOut } },
  },
]);

// Moves the Transform to a new parent and preserves the world transform.
reparentObject3D(entity, oldParent, newParent);
```

## License

MIT
