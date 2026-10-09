# koota-animation

Keyframe animation for [koota](https://github.com/pmndrs/koota) traits.

```sh
pnpm add koota-animation koota
```

## Usage

### Define

```ts
import { trait } from "koota";
import {
  type AnimationPropsBase,
  createAnimationSystem,
  type EasingFn,
  lerp,
} from "koota-animation";

// AoS (array of structs) trait: `createLink` shares the record.
const Opacity = trait(() => ({ opacity: 1 }));
// SoA (struct of arrays) trait; `createLink` shares only object fields.
// const Opacity = trait({ opacity: 1 });

// Keyframe props passed to `interpolate()`.
interface OpacityProps extends AnimationPropsBase {
  easing?: EasingFn;
}

export const OpacityAnimation = /*#__PURE__*/ createAnimationSystem({
  trait: Opacity,
  // Writes the value at `progress` (0–1) into `out`.
  interpolate: (
    out,
    start,
    target,
    progress,
    props: OpacityProps | undefined,
  ) => {
    if (target.opacity === undefined) return;
    const t = props?.easing?.(progress) ?? progress;
    out.opacity = lerp(start.opacity, target.opacity, t);
  },
  // Copies the trait into the start snapshot.
  copy: (target, source) => {
    target.opacity = source.opacity;
  },
  // Optional. Lets `setKeyframes` skip an identical queue.
  equals: (a, b) => a.value.opacity === b.value.opacity,
});
```

### Animate

```ts
import { createWorld } from "koota";
import { easeOut } from "koota-animation";

const world = createWorld();
const entity = world.spawn(Opacity);

// Appends a keyframe. Keyframes start from the current value.
OpacityAnimation.pushKeyframe(entity, {
  value: { opacity: 0 }, // target value
  duration: 300, // ms
  props: { easing: easeOut, onComplete: () => entity.destroy() },
  userData: "fade-out", // arbitrary
});

// Replaces the queue; calls the replaced keyframes' `onComplete()`.
OpacityAnimation.setKeyframes(
  entity,
  [
    { value: { opacity: 0 }, duration: 500 },
    { value: { opacity: 1 }, duration: 500 },
  ],
  { loop: true },
);

// Clears the queue without calling `onComplete()`.
OpacityAnimation.cancel(entity);

// Sets the value immediately.
OpacityAnimation.snap(entity, { opacity: 0.5 });

// Call once per frame: advances animations by `delta` ms; runs onComplete().
OpacityAnimation.tick(world, delta);

// Entities with an active animation have the `Keyframes` trait.
world.query(OpacityAnimation.Keyframes);
```

### Link

`createLink` shares a trait's state with an external object, such as a material.

```tsx
import { createLink } from "koota-animation";
import type { Material } from "three";

// The entity's Opacity record becomes the material itself.
const linkMaterial = /*#__PURE__*/ createLink(
  OpacityAnimation,
  (material: Material) => material,
);

// SoA trait: return the object fields to share.
// createLink(ScaleAnimation, (mesh: Mesh) => ({ scale: mesh.scale }));

const entity = world.spawn(Opacity({ opacity: 0 }));

// Fades the material in on mount: links at opacity 0, then animates to 1.
<meshBasicMaterial
  transparent
  ref={(material) =>
    material &&
    linkMaterial(entity, material, {
      animate: { value: { opacity: 1 }, duration: 200 },
    })
  }
/>;
```

### three.js

Install optional dependency:

```sh
pnpm add three
```

`koota-animation/three` provides a `Transform` trait with its animation and link.

```tsx
import { easeOut } from "koota-animation";
import { linkObject3D, TransformAnimation } from "koota-animation/three";
import { Vector3 } from "three";

// Links the `Transform` trait.
<group ref={(group) => group && linkObject3D(entity, group)} />;

// Animates position, rotation, and scale.
TransformAnimation.setKeyframes(entity, [
  {
    value: { position: new Vector3(0, 1, 0) },
    duration: 250,
    props: { easing: { position: easeOut } },
  },
]);
```

## License

MIT
