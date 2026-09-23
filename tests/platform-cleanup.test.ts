import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const roots = ["src", "server", "api"];
const ignored = new Set(["node_modules", "dist", ".git"]);

function filesUnder(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const output: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...filesUnder(full));
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) output.push(full);
  }
  return output;
}

test("retired CMS integration is absent from active runtime code", () => {
  const forbidden = "word" + "press";
  const offenders = roots
    .flatMap(filesUnder)
    .filter((file) => fs.readFileSync(file, "utf8").toLowerCase().includes(forbidden));
  assert.deepEqual(offenders, []);
});
