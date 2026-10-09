import { createWorld, trait } from "koota";
import { Color, Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { createAnimationSystem } from "../animationSystem.js";
import { lerpField, slerpField } from "./fields.js";

describe("lerpField", () => {
  it("lerps a Color in place", () => {
    const Tint = trait({ color: () => new Color(0, 0, 0) });
    const system = createAnimationSystem({
      trait: Tint,
      fields: { color: lerpField },
    });
    const world = createWorld();
    const entity = world.spawn(Tint);
    const color = entity.get(Tint)!.color;
    system.pushKeyframe(entity, {
      value: { color: new Color(1, 1, 1) },
      duration: 100,
    });
    system.tick(world, 50);
    expect(entity.get(Tint)!.color).toBe(color);
    expect(color.r).toBe(0.5);
  });
});

describe("slerpField", () => {
  it("slerps a Quaternion in place", () => {
    const Rotation = trait({ q: () => new Quaternion() });
    const system = createAnimationSystem({
      trait: Rotation,
      fields: { q: slerpField },
    });
    const world = createWorld();
    const entity = world.spawn(Rotation);
    const target = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      Math.PI,
    );
    system.pushKeyframe(entity, { value: { q: target }, duration: 100 });
    system.tick(world, 50);
    expect(entity.get(Rotation)!.q.angleTo(new Quaternion())).toBeCloseTo(
      Math.PI / 2,
    );
  });
});
