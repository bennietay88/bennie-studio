import test from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_MODULES,
  DEFAULT_ADMIN_MODULE_VISIBILITY,
} from "../src/constants/adminModules";

test("all configured Super Admin modules have graduated from Build later", () => {
  const deferred = ADMIN_MODULES.filter((module) => module.priority === "later");
  assert.deepEqual(deferred, []);
});

test("formerly deferred modules are visible by default once built", () => {
  for (const moduleId of [
    "growth_operations",
    "operations_control",
    "blog_cms",
    "local_seo",
    "partners_affiliates",
    "ecosystem_architect",
  ]) {
    assert.equal(DEFAULT_ADMIN_MODULE_VISIBILITY[moduleId], true, `${moduleId} should be visible by default`);
  }
});
