import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20261113010447_hostinger_portal_vault_20261113.sql", import.meta.url), "utf8");
const api = readFileSync(new URL("../api/index.ts", import.meta.url), "utf8");
const portal = readFileSync(new URL("../src/components/SuperAdmin/EmailProviderSettings.tsx", import.meta.url), "utf8");

test("Hostinger Vault secret is not exposed to anonymous or authenticated PostgREST callers", () => {
  assert.match(migration, /alter table public\.hostinger_smtp_settings enable row level security/i);
  assert.match(migration, /revoke all on table public\.hostinger_smtp_settings from public, anon, authenticated/i);
  assert.match(migration, /revoke all on function public\.get_hostinger_smtp_credentials\(\)\s+from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.get_hostinger_smtp_credentials\(\)\s+to service_role/i);
  assert.match(migration, /current_setting\('request\.jwt\.claim\.role', true\) is distinct from 'service_role'/);
});

test("Hostinger new mailbox requires its own SMTP secret", () => {
  assert.match(migration, /smtp_user <> v_user/);
  assert.match(migration, /A password is required when changing the mailbox/);
  assert.match(migration, /vault\.create_secret/);
  assert.match(migration, /vault\.update_secret/);
});

test("Hostinger admin endpoints authorize super admin and do not return the password", () => {
  const start = api.indexOf('app.get("/api/admin/email-providers/status"');
  const end = api.indexOf('app.post("/api/admin/prospects/:prospectId/outreach"', start);
  assert.ok(start > -1 && end > start);
  const endpoints = api.slice(start, end);
  assert.equal((endpoints.match(/profile\?\.role !== "super_admin"/g) || []).length, 3);
  assert.match(endpoints, /\.select\("smtp_user,from_email,smtp_port,updated_at"\)/);
  assert.doesNotMatch(endpoints, /res\.json\([^\n]*smtp_password/);
  assert.match(endpoints, /save_hostinger_smtp_settings/);
  assert.match(endpoints, /verifyHostingerSmtp\(await loadHostingerSettings\(\)\)/);
});

test("Portal sends secret once and never displays saved password", () => {
  assert.match(portal, /type="password"/);
  assert.match(portal, /setPassword\(" "\)|setPassword\(" "\.trim\(\)\)|setPassword\(""\)/);
  assert.match(portal, /\.\.\.\(password \? \{ password \} : \{\}\)/);
  assert.match(portal, /\/api\/admin\/email-providers\/hostinger/);
  assert.match(portal, /Leave blank to keep existing password/);
});
