# koota-animation

Keyframe animation for [koota](https://github.com/pmndrs/koota) traits.

```sh
pnpm add koota-animation koota
```

## Usage

### Define

```ts
import { trait } from "koota";
import { createAnimationSystem } from "koota-animation";

// AoS (array of structs) trait: `createLink` shares the record.
const Opacity = trait(() => ({ opacity: 1 }));

export const OpacityAnimation = /*#__PURE__*/ createAnimationSystem({
  trait: Opacity,
});
```

### Animate

```ts
import { createWorld } from "koota";
import { easeOut } from "koota-animation";

const world = createWorld();
const entity = world.spawn(Opacity);

// Append a keyframe. Keyframes start from the current value.
OpacityAnimation.pushKeyframe(entity, {
  value: { opacity: 0 }, // target value
  duration: 300, // ms
  props: { easing: easeOut, onComplete: () => entity.destroy() },
  userData: "fade-out", // arbitrary
});

// Replace the queue; calls the replaced keyframes' `onComplete()`.
OpacityAnimation.setKeyframes(
  entity,
  [
    { value: { opacity: 0 }, duration: 500 },
    { value: { opacity: 1 }, duration: 500 },
  ],
  { loop: true },
);

// Clear queue without calling `onComplete()`.
OpacityAnimation.cancel(entity);

// Set value immediately.
OpacityAnimation.snap(entity, { opacity: 0.5 });

// Call per frame: advances animations by `delta` ms; runs `onComplete()`.
OpacityAnimation.tick(world, delta);

// Entities with active animation have the `Keyframes` trait.
world.query(OpacityAnimation.Keyframes);
```

### Link

`createLink()` shares trait state with an external object.

```tsx
import type { Entity } from "koota";
import { createLink } from "koota-animation";
import type { Material } from "three";

// The material becomes the entity's `Opacity` record.
const linkMaterial = /*#__PURE__*/ createLink(
  OpacityAnimation,
  (material: Material) => material,
);

// Fade-in on mount. Set to `initial` if entity has no `Opacity`.
function FadeIn({ entity }: { entity: Entity }) {
  return (
    <meshBasicMaterial
      transparent
      ref={(material) =>
        material &&
        linkMaterial(entity, material, {
          initial: { opacity: 0 },
          animate: { value: { opacity: 1 }, duration: 200 },
        })
      }
    />
  );
}
```

### three.js

Install optional dependency:

```sh
pnpm add three
```

`koota-animation/three` provides a `Transform` trait with animation and linking.

```tsx
import { easeOut } from "koota-animation";
import { linkObject3D, TransformAnimation } from "koota-animation/three";
import { Vector3 } from "three";

// Link the `Transform` trait.
<group ref={(group) => group && linkObject3D(entity, group)} />;

// Animate position, rotation, and scale.
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
