import { createWorld, trait } from "koota";
import { describe, expect, it } from "vitest";

import { createAnimationSystem } from "./animationSystem.js";
import { lerp } from "./lerp.js";
import { createLink } from "./link.js";

const Offset = trait({ point: () => ({ x: 0 }) });

const OffsetAnimation = createAnimationSystem({
  trait: Offset,
  interpolate: (out, start, target, progress) => {
    if (target.point)
      out.point.x = lerp(start.point.x, target.point.x, progress);
  },
  copy: (target, source) => {
    target.point.x = source.point.x;
  },
});

class Source {
  point = { x: 0 };
  opacity = 1;
}

// AoS: the record is the source itself.
const Opacity = trait(() => ({ opacity: 1 }));

const OpacityAnimation = createAnimationSystem({
  trait: Opacity,
  interpolate: (out, start, target, progress) => {
    if (target.opacity !== undefined) {
      out.opacity = lerp(start.opacity, target.opacity, progress);
    }
  },
  copy: (target, source) => {
    target.opacity = source.opacity;
  },
});

const linkOpacity = createLink(OpacityAnimation, (source: Source) => source);

const linkSource = createLink(OffsetAnimation, (source: Source) => ({
  point: source.point,
}));

describe("createLink", () => {
  it("shares the source's references with a fresh entity's trait", () => {
    const world = createWorld();
    const entity = world.spawn();
    const source = new Source();
    linkSource(entity, source);
    expect(entity.get(Offset)!.point).toBe(source.point);
  });

  it("carries an existing trait value onto the source", () => {
    const world = createWorld();
    const entity = world.spawn(Offset);
    entity.get(Offset)!.point.x = 3;
    const source = new Source();
    linkSource(entity, source);
    expect(source.point.x).toBe(3);
    expect(entity.get(Offset)!.point).toBe(source.point);
  });

  it("snaps a fresh entity to the animate target", () => {
    const world = createWorld();
    const entity = world.spawn();
    const source = new Source();
    linkSource(entity, source, {
      animate: { value: { point: { x: 5 } }, duration: 100 },
    });
    expect(source.point.x).toBe(5);
    expect(entity.has(OffsetAnimation.Keyframes)).toBe(false);
  });

  it("animates a linked entity to the animate target", () => {
    const world = createWorld();
    const entity = world.spawn(Offset);
    const source = new Source();
    linkSource(entity, source, {
      animate: { value: { point: { x: 10 } }, duration: 100 },
    });
    expect(source.point.x).toBe(0);
    OffsetAnimation.tick(world, 50);
    expect(source.point.x).toBe(5);
  });

  it("animates a fresh entity from the initial value", () => {
    const world = createWorld();
    const entity = world.spawn();
    const source = new Source();
    linkSource(entity, source, {
      initial: { point: { x: 2 } },
      animate: { value: { point: { x: 10 } }, duration: 100 },
    });
    expect(source.point.x).toBe(2);
    OffsetAnimation.tick(world, 50);
    expect(source.point.x).toBe(6);
  });

  it("keeps a linked entity's value over the initial value", () => {
    const world = createWorld();
    const entity = world.spawn(Offset);
    entity.get(Offset)!.point.x = 3;
    const source = new Source();
    linkSource(entity, source, { initial: { point: { x: 0 } } });
    expect(source.point.x).toBe(3);
  });

  it("ignores a destroyed entity", () => {
    const world = createWorld();
    const entity = world.spawn();
    entity.destroy();
    const source = new Source();
    linkSource(entity, source, {
      animate: { value: { point: { x: 5 } }, duration: 100 },
    });
    expect(source.point.x).toBe(0);
  });

  it("shares an AoS source's primitive fields", () => {
    const world = createWorld();
    const entity = world.spawn(Opacity);
    entity.get(Opacity)!.opacity = 0.5;
    const source = new Source();
    linkOpacity(entity, source);
    expect(source.opacity).toBe(0.5);
    OpacityAnimation.setKeyframes(entity, [
      { value: { opacity: 0 }, duration: 100 },
    ]);
    OpacityAnimation.tick(world, 50);
    expect(source.opacity).toBe(0.25);
    OpacityAnimation.snap(entity, { opacity: 1 });
    expect(source.opacity).toBe(1);
  });
});
