import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

test("Node runtime is aligned across package metadata, lockfile, local development and CI", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  assert.equal(pkg.engines.node, "26.x");
  assert.equal(lock.packages[""].engines.node, pkg.engines.node);
  assert.equal(readFileSync(".nvmrc", "utf8").trim(), "26");
  for (const name of readdirSync(".github/workflows").filter(name => /\.ya?ml$/.test(name))) {
    const source = readFileSync(".github/workflows/" + name, "utf8");
    for (const match of source.matchAll(/^\s*node-version:\s*(\S+)/gm)) {
      assert.equal(match[1], "26", name + " runtime drift");
    }
  }
});
