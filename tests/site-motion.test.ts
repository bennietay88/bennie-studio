import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { SITE_MOTION_PROFILES, SITE_MOTION_SETTINGS, resolveSiteMotionProfile } from "../src/lib/siteMotionProfiles";
test("motion profiles resolve consistently and retain a disabled state", () => {
  assert.equal(SITE_MOTION_PROFILES.length, 5);
  assert.equal(resolveSiteMotionProfile("none"), "none");
  assert.equal(resolveSiteMotionProfile("invalid"), "refined");
  assert.equal(SITE_MOTION_SETTINGS.none.duration, 0);
  assert.equal(SITE_MOTION_SETTINGS.subtle.spotlight, false);
  assert.ok(SITE_MOTION_SETTINGS.cinematic.duration > SITE_MOTION_SETTINGS.refined.duration);
});
test("motion is connected to the shared client renderer, editor, and public pages", () => {
  const renderer = readFileSync("src/components/WebsiteRenderer.tsx", "utf8");
  const editor = readFileSync("src/components/WebsiteEditor.tsx", "utf8");
  const director = readFileSync("src/components/AgencyMotionDirector.tsx", "utf8");
  const layer = readFileSync("src/lib/siteMotion.ts", "utf8");
  assert.match(renderer, /<ClientSiteMotion rootRef=/);
  assert.match(renderer, /<MotionConfig reducedMotion=/);
  assert.match(editor, /id="website-motion-profile"/);
  assert.match(editor, /motionProfile: value as MotionProfileId/);
  assert.match(director, /"\/services", "\/about", "\/resources", "\/contact"/);
  assert.match(layer, /reduce.matches \|\| profile === "none"/);
  assert.match(layer, /intersection\?\.disconnect\(\)/);
});
