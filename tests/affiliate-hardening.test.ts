import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync("api/index.ts", "utf8");
const pricing = readFileSync("src/components/Pricing.tsx", "utf8");
const marketing = readFileSync("src/components/PublicMarketingPages.tsx", "utf8");
const previewOrder = readFileSync("src/components/PreviewOrderPage.tsx", "utf8");
const affiliateDashboard = readFileSync("src/components/AffiliateDashboard.tsx", "utf8");
const affiliateAuth = readFileSync("src/components/AffiliateAuthPage.tsx", "utf8");
const migration = readFileSync("supabase/migrations/20260927111202_account_affiliate_hardening.sql", "utf8");
const applicationIntegrity = readFileSync("supabase/migrations/20260927111658_affiliate_application_integrity_hardening.sql", "utf8");
const applicationRlsFix = readFileSync("supabase/migrations/20260927111955_affiliate_application_rls_recursion_fix.sql", "utf8");
const ownerHardening = readFileSync("supabase/migrations/20260927112119_business_owner_role_hardening.sql", "utf8");
const accountMembershipHardening = readFileSync("supabase/migrations/20260927112955_account_membership_role_hardening.sql", "utf8");

test("role changes out of tenant scope clear inherited tenant associations", () => {
  assert.match(api, /leavesTenantScope = \["platform_staff", "affiliate"\]\.includes\(body\.role\)/);
  assert.match(api, /business_id: null, default_account_id: null/);
  assert.match(api, /BUSINESS_OWNERSHIP_TRANSFER_REQUIRED/);
  assert.match(api, /ACCOUNT_OWNERSHIP_TRANSFER_REQUIRED/);
  assert.match(migration, /profiles_non_tenant_role_scope_check/);
  assert.match(migration, /role not in \('platform_staff', 'affiliate'\)/);
  assert.match(migration, /p\.role in \('business_admin', 'staff', 'client'\)/);
});

test("self-service affiliate applications cannot mint approval or earnings", () => {
  assert.match(applicationIntegrity, /status = 'pending'/);
  assert.match(applicationIntegrity, /coalesce\(total_earnings, 0\) = 0/);
  assert.match(applicationIntegrity, /coalesce\(unpaid_earnings, 0\) = 0/);
  assert.match(applicationIntegrity, /coalesce\(total_referrals, 0\) = 0/);
  assert.match(applicationIntegrity, /approved_at is null/);
  assert.match(applicationIntegrity, /admin_notes is null/);
});

test("business affiliate application checks avoid recursive affiliate RLS", () => {
  assert.match(applicationRlsFix, /private\.can_apply_to_business_affiliate_program/);
  assert.match(applicationRlsFix, /security definer/);
  assert.match(applicationRlsFix, /ap\.is_enabled = true/);
});

test("business ownership cannot preserve tenant access after a role transition", () => {
  assert.match(ownerHardening, /private\.is_business_owner/);
  assert.match(ownerHardening, /p\.role = 'business_admin'/);
  assert.match(ownerHardening, /Business members can view own business/);
  assert.match(ownerHardening, /Business admins can update own business/);
});

test("account memberships cannot preserve tenant access after a role transition", () => {
  assert.match(accountMembershipHardening, /private\.is_account_member/);
  assert.match(accountMembershipHardening, /p\.role in \('business_admin', 'staff', 'client'\)/);
  assert.match(accountMembershipHardening, /private\.is_account_admin/);
  assert.match(accountMembershipHardening, /p\.role = 'business_admin'/);
});

test("affiliate rows are no longer anonymously readable", () => {
  assert.match(migration, /drop policy if exists "Public can check referral code"/);
  assert.match(migration, /revoke select on table public\.affiliates from anon/);
  assert.match(migration, /create policy "Affiliates can view their earnings"[\s\S]*to authenticated/);
});

test("platform affiliate applications are unique and business applications are explicit", () => {
  assert.match(migration, /create unique index idx_affiliates_platform_uid/);
  assert.match(migration, /where business_id is null/);
  assert.match(migration, /create policy "Users can apply to business affiliate program"/);
  assert.match(migration, /ap\.is_enabled = true/);
});

test("affiliate tiers are deduplicated and visible only to applicable affiliates", () => {
  assert.match(migration, /partition by ct\.program_id, lower\(ct\.name\)/);
  assert.match(migration, /when 'starter affiliate' then 0\.10/);
  assert.match(migration, /when 'growth affiliate' then 0\.15/);
  assert.match(migration, /when 'partner affiliate' then 0\.20/);
  assert.match(migration, /create policy "Affiliates can view applicable commission tiers"/);
});

test("public referral attribution reaches the customer business and Stripe metadata", () => {
  assert.match(pricing, /bt_platform_affiliate_ref/);
  assert.match(pricing, /referralCode/);
  assert.match(marketing, /localStorage\.getItem\("bt_platform_affiliate_ref"\)/);
  assert.match(previewOrder, /attribution\?:/);
  assert.match(previewOrder, /referralCode: intent\.attribution\?\.referralCode/);
  assert.match(api, /resolvePlatformAffiliateAttribution/);
  assert.match(api, /referred_by_affiliate_id: affiliateAttribution\?\.id \|\| null/);
  assert.match(api, /affiliateId: affiliateAttribution\?\.id \|\| ""/);
  assert.match(migration, /businesses_referred_by_affiliate_id_fkey/);
});

test("platform click tracking accepts only active platform affiliate codes", () => {
  assert.match(api, /resolvePlatformAffiliateAttribution\(referralCode\)/);
  assert.match(api, /\.is\("business_id", null\)/);
  assert.match(api, /\.in\("status", \["active", "approved"\]\)/);
});

test("business website affiliate tracking requires an active affiliate for that business", () => {
  assert.match(api, /\.eq\("referral_code", normalizeAffiliateReferralCode\(refCode\)\)[\s\S]{0,180}\.eq\("business_id", businessId\)[\s\S]{0,180}\.in\("status", \["active", "approved"\]\)/);
});

test("commission recording is atomic and idempotent", () => {
  assert.match(migration, /idempotency_key text/);
  assert.match(migration, /idx_affiliate_referrals_idempotency_key/);
  assert.match(migration, /create or replace function public\.record_affiliate_commission/);
  assert.match(api, /supabaseAdmin\.rpc\("record_affiliate_commission"/);
  assert.match(api, /p_idempotency_key: `stripe-checkout:\$\{session\.id\}`/);
  assert.match(api, /buyerEmail[\s\S]{0,350}affiliateEmail[\s\S]{0,350}isSelfReferral/);
});

test("payout requests are atomic and affiliates cannot submit arbitrary payout amounts", () => {
  assert.match(migration, /drop policy if exists "Affiliates can insert payout requests"/);
  assert.match(migration, /create or replace function public\.request_affiliate_payout/);
  assert.match(migration, /PAYOUT_ALREADY_PENDING/);
  assert.match(migration, /PAYOUT_MINIMUM_NOT_MET/);
  assert.match(api, /supabaseAdmin\.rpc\("request_affiliate_payout"/);
  assert.match(affiliateDashboard, /body: JSON\.stringify\(\{ affiliateId: affiliate\.id \}\)/);
});

test("affiliate dashboard supports platform and business-specific referral programs", () => {
  assert.match(affiliateDashboard, /platformAffiliate\.business_id/);
  assert.match(affiliateDashboard, /\/w\/\$\{affiliate\.business_id\}\?ref=/);
  assert.match(affiliateDashboard, /is_platform_program/);
  assert.match(affiliateDashboard, /affiliateApproved/);
});

test("affiliate signup language reflects approval rather than instant activation", () => {
  assert.doesNotMatch(affiliateAuth, /Instant Activation/);
  assert.match(affiliateAuth, /Apply in minutes and start promoting once approved/);
});
