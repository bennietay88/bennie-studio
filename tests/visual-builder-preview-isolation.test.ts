import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("rendered section previews are inert while visual editing controls remain interactive", () => {
  const source = readFileSync("src/components/VisualBuilderControls.tsx", "utf8");
  assert.match(source, /children \? <div inert>\{children\}<\/div>/);
  assert.match(source, /<div className="bt-builder-content" onClick=\{\(\)=>canvas\.onSelect\(section\.id\)\} data-builder-control>/);
  assert.match(source, /<VisualBlockEditor value=\{section\.content\.blocks\}/);
  assert.doesNotMatch(source, /<div className="bt-builder-tools"[^>]*\binert\b/);
});
