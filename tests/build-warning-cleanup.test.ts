import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { normalizeZodDocumentationComments } from "../scripts/normalize-zod-comments.ts";

test("Zod prose annotation workaround leaves real PURE markers and unrelated files intact", () => {
  const prose = "// Wrapped in a \x60@__PURE__\x60 IIFE: explanation\n/**\n * esbuild will not drop a \x60@__PURE__\x60 call whose own argument interpolates a variable. */";
  const original = prose + "\nconst x = /* @__PURE__ */ make();";
  const updated = normalizeZodDocumentationComments(original, "/vercel/path0/node_modules/zod/v4/core/util.js");
  assert.equal(updated, original.replaceAll("\x60@__PURE__\x60", "\x60PURE\x60"));
  assert.equal(normalizeZodDocumentationComments(original, "/src/util.js"), original);
});
test("Node runtime is pinned consistently with the lockfile and server output is compact", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  assert.equal(pkg.engines.node, "26.x");
  assert.equal(lock.packages[""].engines.node, pkg.engines.node);
  assert.match(pkg.scripts.build, /--minify --sourcemap/);
});
