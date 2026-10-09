import { createWorld, trait } from "koota";
import { describe, expect, it, vi } from "vitest";

import { createAnimationSystem } from "./animationSystem.js";

const Value = trait({ v: 0 });

function makeSystem() {
  return createAnimationSystem({
    trait: Value,
    interpolate: (out, start, target, progress) => {
      if (target.v === undefined) return;
      out.v = start.v + (target.v - start.v) * progress;
    },
    copy: (target, source) => {
      target.v = source.v;
    },
    equals: (a, b) => a.value.v === b.value.v,
  });
}

describe("tick", () => {
  it("interpolates the head keyframe by elapsed time", () => {
    const { pushKeyframe, tick } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    pushKeyframe(entity, { value: { v: 10 }, duration: 100 });
    tick(world, 25);
    expect(entity.get(Value)!.v).toBe(2.5);
    tick(world, 25);
    expect(entity.get(Value)!.v).toBe(5);
  });

  it("starts each keyframe from the value the previous one reached", () => {
    const { pushKeyframe, tick } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    pushKeyframe(entity, { value: { v: 10 }, duration: 100 });
    pushKeyframe(entity, { value: { v: 20 }, duration: 100 });
    tick(world, 150);
    expect(entity.get(Value)!.v).toBe(15);
  });

  it("completes every keyframe a large step spans, in order", () => {
    const { pushKeyframe, tick } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    const order: number[] = [];
    for (const v of [1, 2, 3]) {
      pushKeyframe(entity, {
        value: { v },
        duration: 10,
        props: { onComplete: () => order.push(v) },
      });
    }
    tick(world, 1000);
    expect(order).toEqual([1, 2, 3]);
    expect(entity.get(Value)!.v).toBe(3);
  });

  it("removes the Keyframes trait on the tick the queue empties", () => {
    const { Keyframes, pushKeyframe, tick } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    pushKeyframe(entity, { value: { v: 1 }, duration: 10 });
    expect(entity.has(Keyframes)).toBe(true);
    tick(world, 10);
    expect(entity.has(Keyframes)).toBe(false);
  });

  it("cycles a looping queue instead of draining it", () => {
    const { Keyframes, setKeyframes, tick } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    setKeyframes(
      entity,
      [
        { value: { v: 10 }, duration: 100 },
        { value: { v: 0 }, duration: 100 },
      ],
      { loop: true },
    );
    tick(world, 250);
    expect(entity.get(Value)!.v).toBe(5);
    expect(entity.get(Keyframes)!.frames).toHaveLength(2);
  });

  it("leaves entities without the animated trait untouched", () => {
    const { Keyframes, pushKeyframe, tick } = makeSystem();
    const world = createWorld();
    const entity = world.spawn();
    const onComplete = vi.fn();
    pushKeyframe(entity, {
      value: { v: 1 },
      duration: 10,
      props: { onComplete },
    });
    tick(world, 100);
    expect(onComplete).not.toHaveBeenCalled();
    expect(entity.has(Keyframes)).toBe(true);
  });
});

describe("onComplete", () => {
  it("sees the completed keyframe's final value", () => {
    const { pushKeyframe, tick } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    let seen: number | undefined;
    pushKeyframe(entity, {
      value: { v: 1 },
      duration: 10,
      props: { onComplete: () => (seen = entity.get(Value)!.v) },
    });
    tick(world, 10);
    expect(seen).toBe(1);
  });

  it("keeps trait writes made by a completion", () => {
    const { pushKeyframe, tick } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    pushKeyframe(entity, {
      value: { v: 1 },
      duration: 10,
      props: { onComplete: () => entity.set(Value, { v: 7 }) },
    });
    tick(world, 10);
    expect(entity.get(Value)!.v).toBe(7);
  });

  it("chains a queue installed by a completion", () => {
    const { setKeyframes, tick } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    const first = vi.fn(() => {
      setKeyframes(entity, [
        { value: { v: 5 }, duration: 10, props: { onComplete: second } },
      ]);
    });
    const second = vi.fn();
    setKeyframes(entity, [
      { value: { v: 1 }, duration: 10, props: { onComplete: first } },
    ]);
    tick(world, 10);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    tick(world, 10);
    expect(entity.get(Value)!.v).toBe(5);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("fires in completion order across a step", () => {
    const { pushKeyframe, tick } = makeSystem();
    const world = createWorld();
    const a = world.spawn(Value);
    const b = world.spawn(Value);
    const order: string[] = [];
    pushKeyframe(a, {
      value: { v: 1 },
      duration: 5,
      props: { onComplete: () => order.push("a1") },
    });
    pushKeyframe(a, {
      value: { v: 2 },
      duration: 5,
      props: { onComplete: () => order.push("a2") },
    });
    pushKeyframe(b, {
      value: { v: 1 },
      duration: 5,
      props: { onComplete: () => order.push("b1") },
    });
    tick(world, 10);
    expect(order).toEqual(["a1", "a2", "b1"]);
  });
});

describe("pushKeyframe", () => {
  it("carries leftover time into a keyframe pushed by a completion", () => {
    const { pushKeyframe, tick } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    pushKeyframe(entity, {
      value: { v: 1 },
      duration: 10,
      props: {
        onComplete: () =>
          pushKeyframe(entity, { value: { v: 11 }, duration: 10 }),
      },
    });
    tick(world, 18);
    tick(world, 0);
    expect(entity.get(Value)!.v).toBe(9);
  });

  it("starts a keyframe pushed onto an idle entity from zero", () => {
    const { pushKeyframe, tick } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    pushKeyframe(entity, { value: { v: 1 }, duration: 10 });
    tick(world, 18);
    pushKeyframe(entity, { value: { v: 11 }, duration: 10 });
    tick(world, 0);
    expect(entity.get(Value)!.v).toBe(1);
  });

  it("rejects a negative or non-finite duration", () => {
    const { pushKeyframe } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    for (const duration of [-1, NaN, Infinity]) {
      expect(() => pushKeyframe(entity, { value: { v: 1 }, duration })).toThrow(
        RangeError,
      );
    }
  });

  it("ignores a destroyed entity", () => {
    const { Keyframes, pushKeyframe } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    entity.destroy();
    pushKeyframe(entity, { value: { v: 1 }, duration: 10 });
    expect(entity.has(Keyframes)).toBe(false);
  });
});

describe("cancel", () => {
  it("drops the queue without firing onComplete", () => {
    const { Keyframes, pushKeyframe, cancel, tick } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    const onComplete = vi.fn();
    pushKeyframe(entity, {
      value: { v: 10 },
      duration: 100,
      props: { onComplete },
    });
    tick(world, 50);
    cancel(entity);
    tick(world, 100);
    expect(entity.has(Keyframes)).toBe(false);
    expect(onComplete).not.toHaveBeenCalled();
    expect(entity.get(Value)!.v).toBe(5);
  });

  it("ignores an idle or destroyed entity", () => {
    const { cancel } = makeSystem();
    const world = createWorld();
    const idle = world.spawn(Value);
    const destroyed = world.spawn(Value);
    destroyed.destroy();
    expect(() => {
      cancel(idle);
      cancel(destroyed);
    }).not.toThrow();
  });
});

describe("snap", () => {
  it("writes the value at once", () => {
    const { snap } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    snap(entity, { v: 7 });
    expect(entity.get(Value)!.v).toBe(7);
  });

  it("ignores an entity without the trait", () => {
    const { snap } = makeSystem();
    const world = createWorld();
    const entity = world.spawn();
    snap(entity, { v: 7 });
    expect(entity.has(Value)).toBe(false);
  });
});

describe("setKeyframes", () => {
  it("rejects a looping queue without total duration", () => {
    const { setKeyframes } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    expect(() =>
      setKeyframes(entity, [{ value: { v: 1 }, duration: 0 }], { loop: true }),
    ).toThrow(RangeError);
    expect(() => setKeyframes(entity, [], { loop: true })).toThrow(RangeError);
  });

  it("installs a queue differing in userData or loop", () => {
    const { setKeyframes } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    const frame = { value: { v: 1 }, duration: 100 };
    setKeyframes(entity, [frame]);
    expect(setKeyframes(entity, [{ ...frame, userData: "tag" }])).toBe(true);
    expect(setKeyframes(entity, [{ ...frame, userData: "tag" }])).toBe(false);
    expect(
      setKeyframes(entity, [{ ...frame, userData: "tag" }], { loop: true }),
    ).toBe(true);
  });

  it("installs a queue differing only in duration", () => {
    const { setKeyframes } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    setKeyframes(entity, [{ value: { v: 1 }, duration: 100 }]);
    expect(setKeyframes(entity, [{ value: { v: 1 }, duration: 50 }])).toBe(
      true,
    );
  });

  it("reports an installed queue and a deduplicated no-op", () => {
    const { setKeyframes } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    expect(setKeyframes(entity, [{ value: { v: 1 }, duration: 100 }])).toBe(
      true,
    );
    expect(setKeyframes(entity, [{ value: { v: 1 }, duration: 100 }])).toBe(
      false,
    );
    expect(setKeyframes(entity, [{ value: { v: 2 }, duration: 100 }])).toBe(
      true,
    );
  });

  it("installs nothing on a destroyed entity", () => {
    const { setKeyframes } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    entity.destroy();
    expect(setKeyframes(entity, [{ value: { v: 1 }, duration: 100 }])).toBe(
      false,
    );
  });

  it("fires a replaced keyframe's onComplete exactly once", () => {
    const { setKeyframes, tick } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    const replaced = vi.fn();
    const replacement = vi.fn();
    setKeyframes(entity, [
      { value: { v: 1 }, duration: 100, props: { onComplete: replaced } },
    ]);
    setKeyframes(entity, [
      { value: { v: 2 }, duration: 100, props: { onComplete: replacement } },
    ]);
    expect(replaced).toHaveBeenCalledTimes(1);
    expect(replacement).not.toHaveBeenCalled();
    tick(world, 100);
    expect(replaced).toHaveBeenCalledTimes(1);
    expect(replacement).toHaveBeenCalledTimes(1);
    expect(entity.get(Value)!.v).toBe(2);
  });

  it("leaves the current queue's onComplete live on a deduplicated call", () => {
    const { setKeyframes, tick } = makeSystem();
    const world = createWorld();
    const entity = world.spawn(Value);
    const first = vi.fn();
    const duplicate = vi.fn();
    setKeyframes(entity, [
      { value: { v: 1 }, duration: 100, props: { onComplete: first } },
    ]);
    setKeyframes(entity, [
      { value: { v: 1 }, duration: 100, props: { onComplete: duplicate } },
    ]);
    tick(world, 100);
    expect(first).toHaveBeenCalledTimes(1);
    expect(duplicate).not.toHaveBeenCalled();
  });
});
