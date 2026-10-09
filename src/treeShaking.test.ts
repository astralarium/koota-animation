import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";
import { describe, expect, it } from "vitest";

const root = dirname(fileURLToPath(import.meta.url));

async function bundle(contents: string): Promise<string> {
  const result = await build({
    stdin: { contents, resolveDir: root, loader: "ts" },
    bundle: true,
    format: "esm",
    write: false,
    external: ["koota", "three"],
    logLevel: "silent",
  });
  return result.outputFiles[0].text;
}

describe("tree shaking", () => {
  it("bundles an easing alone", async () => {
    const out = await bundle(
      'import { easeInOut } from "./index.js"; console.log(easeInOut);',
    );
    expect(out).not.toMatch(/from "koota"|from "three"/);
    expect(out).not.toMatch(/easeOutBack|cubicBezier|createAnimationSystem/);
  });

  it("keeps the core entry free of three", async () => {
    const out = await bundle('export * from "./index.js";');
    expect(out).not.toContain('from "three"');
  });

  it("bundles createAnimationSystem without easings", async () => {
    const out = await bundle(
      'import { createAnimationSystem } from "./index.js"; console.log(createAnimationSystem);',
    );
    expect(out).not.toMatch(/easeOutBack|cubicBezier|bezierPresets/);
  });

  it("bundles the Transform trait without its animation or Object3D helpers", async () => {
    const out = await bundle(
      'import { Transform } from "./three/index.js"; console.log(Transform);',
    );
    expect(out).toContain('from "three"');
    expect(out).not.toMatch(
      /TransformAnimation|createAnimationSystem|ParentObject|reparentObject3D|_q1/,
    );
  });

  it("bundles TransformAnimation without Object3D helpers", async () => {
    const out = await bundle(
      'import { TransformAnimation } from "./three/index.js"; console.log(TransformAnimation);',
    );
    expect(out).not.toMatch(/ParentObject|reparentObject3D|easeOutBack/);
  });
});
