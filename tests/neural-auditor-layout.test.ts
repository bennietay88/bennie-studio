import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/SuperAdmin/NeuralAuditor.tsx", "utf8");

test("neural auditor remains inside the admin viewport", () => {
  assert.match(source, /w-full min-w-0 max-w-full overflow-x-hidden/);
  assert.match(source, /xl:grid-cols-\[minmax\(0,1\.75fr\)_minmax\(300px,0\.9fr\)\]/);
  assert.match(source, /max-w-xl min-w-0 flex-col gap-3 sm:flex-row/);
});

test("neural auditor report dialog is responsive", () => {
  assert.match(source, /w-\[calc\(100vw-2rem\)\] max-w-4xl/);
  assert.match(source, /lg:flex-row lg:items-center lg:justify-between/);
});
