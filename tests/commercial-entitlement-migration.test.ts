import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const migration = readFileSync(
  fileURLToPath(new URL("../supabase/migrations/20261021130735_20261021120000_align_managed_website_page_entitlement.sql", import.meta.url)),
  "utf8",
);

test("Personal Profile entitlement slug is allowed and provisioned idempotently", () => {
  assert.match(migration, /'growth-partner',\s*'custom-website',\s*'profile'/);
  assert.match(migration, /'Personal Profile',\s*'profile',\s*0,\s*100,\s*5/);
  assert.match(migration, /on conflict\s*\(slug\)\s*do nothing/i);
});

test("Managed Website database page allowance is five without changing customer rows", () => {
  assert.match(migration, /set project_limit = 5/);
  assert.match(migration, /where slug = 'business'\s+and is_active = true\s+and project_limit <> 5/i);
  assert.doesNotMatch(migration, /update public\.businesses\b/i);
});
