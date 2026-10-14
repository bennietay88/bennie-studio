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

test("retired CMS integrations remain absent while fair website ownership comparisons are allowed", () => {
  // Mentioning an external owned-website option is not a CMS integration.
  // Disallow the retired SDK/imports and direct content-management API calls instead.
  const forbidden = [
    /\b(?:from|import)\s*\(?\s*["']@wordpress\//i,
    /\brequire\(["']@wordpress\//i,
    /\/wp-json\/wp\/v2\//i,
    /\/wp-admin\/admin-ajax\.php/i,
  ];
  const offenders = roots.flatMap(filesUnder).filter((file) => {
    const contents = fs.readFileSync(file, "utf8");
    return forbidden.some((pattern) => pattern.test(contents));
  });
  assert.deepEqual(offenders, []);
});
