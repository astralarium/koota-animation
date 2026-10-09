import { createWorld } from "koota";
import { Group, Object3D, Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { linkObject3D, ParentObject, reparentObject3D } from "./object3d.js";
import { Transform, TransformAnimation } from "./transform.js";

describe("linkObject3D", () => {
  it("shares the object's vectors with a fresh entity's Transform", () => {
    const world = createWorld();
    const entity = world.spawn();
    const object = new Object3D();
    linkObject3D(entity, object);
    const transform = entity.get(Transform)!;
    expect(transform.position).toBe(object.position);
    expect(transform.rotation).toBe(object.quaternion);
    expect(transform.scale).toBe(object.scale);
  });

  it("carries an existing Transform's values onto the object", () => {
    const world = createWorld();
    const entity = world.spawn(Transform);
    entity.get(Transform)!.position.set(1, 2, 3);
    const object = new Object3D();
    linkObject3D(entity, object);
    expect(object.position.toArray()).toEqual([1, 2, 3]);
    expect(entity.get(Transform)!.position).toBe(object.position);
  });

  it("snaps a fresh entity to the animate target", () => {
    const world = createWorld();
    const entity = world.spawn();
    const object = new Object3D();
    linkObject3D(entity, object, {
      animate: { value: { position: new Vector3(5, 0, 0) }, duration: 100 },
    });
    expect(object.position.x).toBe(5);
    expect(entity.has(TransformAnimation.Keyframes)).toBe(false);
  });

  it("animates a linked entity to the animate target", () => {
    const world = createWorld();
    const entity = world.spawn(Transform);
    const object = new Object3D();
    linkObject3D(entity, object, {
      animate: { value: { position: new Vector3(10, 0, 0) }, duration: 100 },
    });
    expect(object.position.x).toBe(0);
    TransformAnimation.tick(world, 50);
    expect(object.position.x).toBe(5);
  });

  it("records the object's parent", () => {
    const world = createWorld();
    const entity = world.spawn();
    const parent = new Group();
    const object = new Object3D();
    parent.add(object);
    linkObject3D(entity, object);
    expect(entity.get(ParentObject)).toBe(parent);
  });

  it("preserves the world transform when the object moves to a new parent", () => {
    const world = createWorld();
    const entity = world.spawn();
    const a = new Group();
    a.position.set(10, 0, 0);
    const b = new Group();
    b.position.set(0, 5, 0);
    const object = new Object3D();
    object.position.set(1, 0, 0);
    a.add(object);
    linkObject3D(entity, object);

    b.add(object);
    linkObject3D(entity, object);

    expect(object.position.toArray()).toEqual([11, -5, 0]);
    expect(entity.get(ParentObject)).toBe(b);
  });
});

describe("reparentObject3D", () => {
  it("preserves world position, rotation, and scale", () => {
    const world = createWorld();
    const entity = world.spawn(Transform);
    const a = new Group();
    a.position.set(1, 2, 3);
    a.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    a.scale.setScalar(2);
    const b = new Group();
    b.position.set(-4, 0, 1);
    b.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 3);
    b.scale.setScalar(0.5);

    const object = new Object3D();
    a.add(object);
    linkObject3D(entity, object);
    object.position.set(1, 1, 0);
    object.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), 0.3);

    a.updateMatrixWorld();
    const worldPosition = object.getWorldPosition(new Vector3());
    const worldRotation = object.getWorldQuaternion(new Quaternion());
    const worldScale = object.getWorldScale(new Vector3());

    reparentObject3D(entity, a, b);
    b.add(object);
    b.updateMatrixWorld();

    const position = object.getWorldPosition(new Vector3());
    expect(position.distanceTo(worldPosition)).toBeLessThan(1e-9);
    expect(
      object.getWorldQuaternion(new Quaternion()).angleTo(worldRotation),
    ).toBeLessThan(1e-6);
    expect(
      object.getWorldScale(new Vector3()).distanceTo(worldScale),
    ).toBeLessThan(1e-9);
  });
});

describe("TransformAnimation.setKeyframes", () => {
  it("installs a keyframe targeting different channels", () => {
    const world = createWorld();
    const entity = world.spawn(Transform);
    TransformAnimation.setKeyframes(entity, [
      { value: { rotation: new Quaternion() }, duration: 100 },
    ]);
    expect(
      TransformAnimation.setKeyframes(entity, [
        { value: { position: new Vector3(1, 0, 0) }, duration: 100 },
      ]),
    ).toBe(true);
  });

  it("skips a structurally equal queue", () => {
    const world = createWorld();
    const entity = world.spawn(Transform);
    TransformAnimation.setKeyframes(entity, [
      { value: { position: new Vector3(1, 0, 0) }, duration: 100 },
    ]);
    expect(
      TransformAnimation.setKeyframes(entity, [
        { value: { position: new Vector3(1, 0, 0) }, duration: 100 },
      ]),
    ).toBe(false);
  });
});
