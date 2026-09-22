import test from "node:test";
import assert from "node:assert/strict";
import {
  contrastRatio,
  resolveAccessibleThemeColors,
} from "../src/lib/colorContrast.ts";

test("dark mid-tone brand surfaces use white text and are darkened only enough for AA", () => {
  const colors = resolveAccessibleThemeColors("#3194ad", "#ffffff");

  assert.equal(colors.primaryForeground, "#ffffff");
  assert.ok(contrastRatio(colors.primaryForeground, colors.primarySurface) >= 4.5);
  assert.notEqual(colors.primarySurface, "#3194ad");
});

test("light brand surfaces keep dark readable text", () => {
  const colors = resolveAccessibleThemeColors("#f8fafc", "#ffffff");

  assert.notEqual(colors.primaryForeground, "#ffffff");
  assert.ok(contrastRatio(colors.primaryForeground, colors.primarySurface) >= 4.5);
});
