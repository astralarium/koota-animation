import { createWorld, trait } from "koota";
import { describe, expect, it, vi } from "vitest";

import { createAnimationSystem } from "./animationSystem.js";
import { stepField } from "./fields.js";
import type { Field } from "./types.js";

class Vec {
  x: number;
  constructor(x = 0) {
    this.x = x;
  }
}

/** Interpolates a {@link Vec} in place. */
const vecField: Field<Vec> = {
  interpolate: (out, start, target, t) => {
    out.x = start.x + (target.x - start.x) * t;
    return out;
  },
  copy: (target, source) => {
    target.x = source.x;
    return target;
  },
  equals: (a, b) => a.x === b.x,
};

describe("field interpolation", () => {
  it("lerps number fields without options", () => {
    const Value = trait({ v: 0 });
    const system = createAnimationSystem({ trait: Value });
    const world = createWorld();
    const entity = world.spawn(Value);
    system.pushKeyframe(entity, { value: { v: 10 }, duration: 100 });
    system.tick(world, 25);
    expect(entity.get(Value)!.v).toBe(2.5);
  });

  it("interpolates a field by its Field in place", () => {
    const Position = trait({ p: () => new Vec() });
    const system = createAnimationSystem({
      trait: Position,
      fields: { p: vecField },
    });
    const world = createWorld();
    const entity = world.spawn(Position);
    const p = entity.get(Position)!.p;
    system.pushKeyframe(entity, { value: { p: new Vec(10) }, duration: 100 });
    system.tick(world, 50);
    expect(entity.get(Position)!.p).toBe(p);
    expect(p.x).toBe(5);
  });

  it("writes an in-place field without reassigning its property", () => {
    const Position = trait(() => ({ p: new Vec() }));
    const system = createAnimationSystem({
      trait: Position,
      fields: { p: vecField },
    });
    const source = {} as { p: Vec };
    Object.defineProperty(source, "p", { value: new Vec(), enumerable: true });
    const world = createWorld();
    const entity = world.spawn(Position(source));
    system.snap(entity, { p: new Vec(3) });
    expect(source.p.x).toBe(3);
  });

  it("switches a stepField field when the keyframe ends", () => {
    const State = trait({ visible: false });
    const system = createAnimationSystem({
      trait: State,
      fields: { visible: stepField },
    });
    const world = createWorld();
    const entity = world.spawn(State);
    system.pushKeyframe(entity, { value: { visible: true }, duration: 100 });
    system.tick(world, 50);
    expect(entity.get(State)!.visible).toBe(false);
    system.tick(world, 50);
    expect(entity.get(State)!.visible).toBe(true);
  });

  it("eases each field by its own easing", () => {
    const Point = trait({ x: 0, y: 0 });
    const system = createAnimationSystem({ trait: Point });
    const world = createWorld();
    const entity = world.spawn(Point);
    system.pushKeyframe(entity, {
      value: { x: 10, y: 10 },
      duration: 100,
      props: { easing: { x: (t) => t * t } },
    });
    system.tick(world, 50);
    expect(entity.get(Point)!).toEqual({ x: 2.5, y: 5 });
  });

  it("rejects a non-number field without a Field", () => {
    const State = trait({ visible: false });
    // @ts-expect-error: `fields.visible` is required.
    const system = createAnimationSystem({ trait: State });
    const world = createWorld();
    const entity = world.spawn(State);
    system.pushKeyframe(entity, { value: { visible: true }, duration: 100 });
    expect(() => system.tick(world, 50)).toThrow(TypeError);
  });

  it("copies only the fields of the trait's default value", () => {
    const Opacity = trait(() => ({ opacity: 1 }));
    const system = createAnimationSystem({ trait: Opacity });
    const target = { opacity: 0, extra: 1 };
    const source = { opacity: 0.5, extra: 2 };
    system.copy(target, source);
    expect(target).toEqual({ opacity: 0.5, extra: 1 });
  });
});

describe("field equals", () => {
  it("skips a queue equal by its fields' equals", () => {
    const Position = trait({ p: () => new Vec() });
    const system = createAnimationSystem({
      trait: Position,
      fields: { p: vecField },
    });
    const world = createWorld();
    const entity = world.spawn(Position);
    system.setKeyframes(entity, [{ value: { p: new Vec(1) }, duration: 100 }]);
    expect(
      system.setKeyframes(entity, [
        { value: { p: new Vec(1) }, duration: 100 },
      ]),
    ).toBe(false);
  });

  it("installs a queue differing in props", () => {
    const Value = trait({ v: 0 });
    const system = createAnimationSystem({ trait: Value });
    const world = createWorld();
    const entity = world.spawn(Value);
    system.setKeyframes(entity, [{ value: { v: 1 }, duration: 100 }]);
    expect(
      system.setKeyframes(entity, [
        { value: { v: 1 }, duration: 100, props: { easing: (t) => t } },
      ]),
    ).toBe(true);
  });

  it("ignores onComplete", () => {
    const Value = trait({ v: 0 });
    const system = createAnimationSystem({ trait: Value });
    const world = createWorld();
    const entity = world.spawn(Value);
    system.setKeyframes(entity, [
      { value: { v: 1 }, duration: 100, props: { onComplete: vi.fn() } },
    ]);
    expect(
      system.setKeyframes(entity, [
        { value: { v: 1 }, duration: 100, props: { onComplete: vi.fn() } },
      ]),
    ).toBe(false);
  });
});
