import { test } from "node:test";
import assert from "node:assert/strict";
import { classify,portfolioSpecs,marketingSpecs,smokeSpecs } from "./ci-scope.mjs";
import { existsSync } from "node:fs";
test("documentation only skips application jobs",()=>assert.equal(classify(["README.md","docs/guide.md"]).scope,"docs"));
test("known portfolio-only changes use targeted tests",()=>assert.equal(classify(["src/components/IndustryExperience.tsx","public/images/case-studies/captures/example.webp"]).scope,"portfolio"));
test("marketing and portfolio stylesheet changes retain marketing coverage",()=>assert.equal(classify(["src/styles/studioReadability.css","src/styles/demoDesigns.css"]).scope,"marketing"));
test("mixed or unknown risk always runs complete coverage",()=>{
 for(const file of ["src/App.tsx","src/index.css","src/components/AgencyVisualDirector.tsx","src/lib/permissions.ts","api/index.ts","supabase/rollout/schema.sql","package-lock.json",".github/workflows/ci.yml","playwright.config.ts","scripts/ci-scope.mjs","e2e/commercial-lifecycle.spec.ts","unknown.ts"]){
  assert.equal(classify(["src/styles/demoDesigns.css",file]).scope,"full",file);
 }
 assert.equal(classify([]).scope,"full");
});
test("reduced suites include access and revenue smoke checks and all selected files exist",()=>{
 for(const suite of [portfolioSpecs,marketingSpecs])for(const spec of smokeSpecs)assert.ok(suite.includes(spec));
 for(const spec of new Set(marketingSpecs))assert.ok(existsSync(spec),spec);
});
