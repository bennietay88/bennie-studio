import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20261113010447_hostinger_portal_vault_20261113.sql", import.meta.url), "utf8");
const resendMigration = readFileSync(new URL("../supabase/migrations/20261113053756_resend_portal_vault_20261113.sql", import.meta.url), "utf8");
const resendValidationFix = readFileSync(new URL("../supabase/migrations/20261113053926_resend_api_key_validation_fix_20261113.sql", import.meta.url), "utf8");
const multiResendMigration = readFileSync(new URL("../supabase/migrations/20261115062335_resend_multi_account_routing.sql", import.meta.url), "utf8");
const roleFix = readFileSync(new URL("../supabase/migrations/20261113022143_hostinger_vault_service_role_claim_fix_20261113.sql", import.meta.url), "utf8");
const api = readFileSync(new URL("../api/index.ts", import.meta.url), "utf8");
const portal = readFileSync(new URL("../src/components/SuperAdmin/EmailProviderSettings.tsx", import.meta.url), "utf8");

test("Hostinger Vault secret is not exposed to anonymous or authenticated PostgREST callers", () => {
  assert.match(migration, /alter table public\.hostinger_smtp_settings enable row level security/i);
  assert.match(migration, /revoke all on table public\.hostinger_smtp_settings from public, anon, authenticated/i);
  assert.match(migration, /revoke all on function public\.get_hostinger_smtp_credentials\(\)\s+from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.get_hostinger_smtp_credentials\(\)\s+to service_role/i);
  assert.match(migration, /current_setting\('request\.jwt\.claim\.role', true\) is distinct from 'service_role'/);
});

test("Vault RPC hotfix uses Supabase JWT role and retains server-only grants", () => {
  assert.equal(roleFix.split("auth.role() is distinct from 'service_role'").length - 1, 2);
  assert.ok(roleFix.includes("revoke all on function public.save_hostinger_smtp_settings(text, text, integer, text) from public, anon, authenticated"));
  assert.ok(roleFix.includes("revoke all on function public.get_hostinger_smtp_credentials() from public, anon, authenticated"));
  assert.ok(roleFix.includes("grant execute on function public.get_hostinger_smtp_credentials() to service_role"));
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
  assert.equal((endpoints.match(/profile\?\.role !== "super_admin"/g) || []).length, 7);
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

test("Resend API settings use encrypted Vault storage and deny direct client access", () => {
  assert.match(resendMigration, /alter table public\.resend_provider_settings enable row level security/i);
  assert.match(resendMigration, /revoke all on table public\.resend_provider_settings from public, anon, authenticated/i);
  assert.match(resendMigration, /revoke all on function public\.get_resend_provider_credentials\(\) from public,anon,authenticated/i);
  assert.match(resendMigration, /grant execute on function public\.get_resend_provider_credentials\(\) to service_role/i);
  assert.ok(resendMigration.includes("auth.role() is distinct from 'service_role'"));
  assert.ok(resendMigration.includes("vault.create_secret"));
  assert.ok(resendMigration.includes("vault.update_secret"));
  assert.match(multiResendMigration, /create table if not exists public\.resend_provider_accounts/i);
  assert.match(multiResendMigration, /create table if not exists public\.resend_provider_assignments/i);
  assert.match(multiResendMigration, /revoke all on function public\.get_resend_provider_credentials_for_purpose\(text\) from public,anon,authenticated/i);
  assert.match(multiResendMigration, /delete from vault\.secrets where id=v_secret_id/i);
});

test("Resend portal configuration is server-only and covers all server-side sending paths", () => {
  assert.match(api, /supabaseAdmin\.rpc\("get_resend_provider_credentials_for_purpose"/);
  assert.match(api, /supabaseAdmin\.rpc\("save_resend_provider_account"/);
  assert.match(api, /app\.put\("\/api\/admin\/email-providers\/resend\/accounts", authenticate/);
  assert.match(api, /app\.put\("\/api\/admin\/email-providers\/resend\/assignments\/\:purpose", authenticate/);
  assert.match(api, /app\.delete\("\/api\/admin\/email-providers\/resend\/accounts\/\:accountId", authenticate/);
  assert.match(api, /resendConfigCache\.clear\(\)/);
  assert.match(api, /getResendProvider\("sales"\)/);
  assert.match(api, /getResendProvider\("transactional"\)/);
  assert.doesNotMatch(api, /getResend\(\)/);
  assert.match(portal, /Add Resend account/);
  assert.match(portal, /All outbound email/);
  assert.match(portal, /selectDeliveryProvider/);
  assert.doesNotMatch(portal, /Transactional email account|Sales follow-ups account/);
  assert.match(api, /const sendConfiguredEmail = async/);
  assert.match(api, /sendConfiguredEmail\("transactional", \{ to, subject, html \}\)/);
  assert.match(api, /sendConfiguredEmail\("sales", \{ to, subject, html \}\)/);
  assert.match(portal, /setResendApiKey\(""\)/);
  assert.match(portal, /Leave blank to keep saved key/);
});

test("Resend key validation hotfix avoids PostgreSQL excessive regex repetition bound", () => {
  assert.ok(resendValidationFix.includes("length(p_api_key) > 259"));
  assert.ok(resendValidationFix.includes("length(p_api_key) < 15"));
  assert.ok(!resendValidationFix.includes("{12,256}"));
});

test("Hostinger manual sends use explicit recipient permission confirmation instead of duplicate document fields", () => {
  const direct = api.slice(api.indexOf("const sendDirectSalesEmail = async"), api.indexOf("const isPrivateAddress", api.indexOf("const sendDirectSalesEmail = async")));
  assert.match(direct, /message\.provider_payload\?\.directSend !== true/);
  assert.match(direct, /message\.provider_payload\?\.recipientPermissionConfirmed !== true/);
  assert.match(direct, /CONTACT_PERMISSION_CONFIRMATION_REQUIRED/);
  assert.doesNotMatch(direct, /consent_timestamp|consent_source|marketing_consent/);
  assert.match(api, /recipientPermissionConfirmed: z\.boolean\(\)\.optional\(\)/);
  assert.match(api, /canManageSalesOperations\(profile\)/);
  assert.match(direct, /await isSalesSuppressed\(supabaseAdmin, target\)/);
  assert.match(direct, /sendHostingerMail\(/);
});

test("Manual outreach confirmation propagates through single and bulk UI without writing consent records", () => {
  const operations = readFileSync(new URL("../server/salesOperations.ts", import.meta.url), "utf8");
  const prospectUi = readFileSync(new URL("../src/components/SuperAdmin/ProspectExplorer.tsx", import.meta.url), "utf8");
  const labUi = readFileSync(new URL("../src/components/SuperAdmin/OutreachLab.tsx", import.meta.url), "utf8");
  const bulkIntro = readFileSync(new URL("../src/components/SuperAdmin/ManualBulkProspectIntros.tsx", import.meta.url), "utf8");
  const bulkFollowUp = readFileSync(new URL("../src/components/SuperAdmin/ManualBulkProspectFollowUps.tsx", import.meta.url), "utf8");
  assert.match(operations, /recipientPermissionConfirmed: input\.recipientPermissionConfirmed === true/);
  assert.match(operations, /permissionConfirmedAt: input\.recipientPermissionConfirmed === true/);
  assert.match(prospectUi, /recipientPermissionConfirmed: recipientPermissionConfirmed/);
  assert.match(labUi, /templateId, recipientPermissionConfirmed, requestId/);
  assert.match(bulkIntro, /recipientPermissionConfirmed: true/);
  assert.doesNotMatch(bulkIntro, /<Checkbox|setConfirmed|!confirmed/);
  assert.match(bulkFollowUp, /recipientPermissionConfirmed: confirmed/);
  assert.match(operations, /OUTREACH_TOO_SOON/);
  assert.match(operations, /CONTACT_SUPPRESSED/);
});
