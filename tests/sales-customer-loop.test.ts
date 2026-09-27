import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync("api/index.ts", "utf8");
const sales = readFileSync("server/salesOperations.ts", "utf8");
const prospects = readFileSync("src/components/SuperAdmin/ProspectExplorer.tsx", "utf8");
const onboarding = readFileSync("src/components/SuperAdmin/ClientOnboarding.tsx", "utf8");
const approvals = readFileSync("src/components/CustomerApprovals.tsx", "utf8");
const pricing = readFileSync("src/components/Pricing.tsx", "utf8");
const previewOrder = readFileSync("src/components/PreviewOrderPage.tsx", "utf8");
const policies = readFileSync("src/components/Policies.tsx", "utf8");
const proposals = readFileSync("src/components/PublicProposalPage.tsx", "utf8");
const commercialCatalogue = readFileSync("src/components/SuperAdmin/CommercialCatalogue.tsx", "utf8");
const prospectPreview = readFileSync("src/components/ProspectPreviewPage.tsx", "utf8");
const checkoutStatus = readFileSync("src/components/CheckoutStatusPage.tsx", "utf8");
const publicChrome = readFileSync("src/components/PublicSiteChrome.tsx", "utf8");
const appRoutes = readFileSync("src/App.tsx", "utf8");
const hardeningMigration = readFileSync("supabase/migrations/20260927070000_commercial_launch_hardening.sql", "utf8");
const finalLaunchQa = readFileSync("server/finalLaunchQa.ts", "utf8");
const commercialLifecycleE2e = readFileSync("e2e/commercial-lifecycle.spec.ts", "utf8");

test("prospect engagement API exposes messages and tasks", () => {
  assert.match(api, /\/api\/admin\/prospects\/:prospectId\/engagement/);
  assert.match(api, /sales_messages/);
  assert.match(api, /sales_tasks/);
  assert.match(prospects, /Sales Inbox/);
  assert.match(prospects, /Client reply/);
});

test("direct outreach can reply to a stored inbound message", () => {
  assert.match(sales, /replyToMessageId\?: string \| null/);
  assert.match(sales, /reply_to_message_id: replyToMessageId/);
  assert.match(api, /replyToMessageId: UUID_SCHEMA\.optional\(\)\.nullable\(\)/);
  assert.match(prospects, /Personal reply sent from Prospect Explorer/);
});

test("prospect conversion creates the connected customer handoff", () => {
  assert.match(api, /\/api\/admin\/prospects\/:prospectId\/convert/);
  assert.match(api, /prospect-business:/);
  assert.match(api, /Awaiting customer onboarding/);
  assert.match(api, /awaiting_onboarding/);
  assert.match(api, /claimPendingCustomerBusiness/);
  assert.match(api, /customer-onboarding-/);
  assert.match(api, /Start onboarding/);
  assert.match(prospects, /Convert to Customer/);
  assert.match(prospects, /Create Customer Workspace/);
});

test("preview-to-outreach workflow is visible in the prospect table", () => {
  assert.match(prospects, /Prepare & Email/);
  assert.match(prospects, /preview_generated_at/);
  assert.match(prospects, /\/api\/admin\/website-audit/);
});

test("approval requests and customer responses update lifecycle", () => {
  assert.match(api, /\/api\/admin\/businesses\/:businessId\/approval-request/);
  assert.match(api, /\/api\/customer\/approvals\/:approvalId\/respond/);
  assert.match(api, /lifecycle_stage: "launch_ready"/);
  assert.match(api, /lifecycle_stage: "design_build"/);
  assert.match(approvals, /\/api\/customer\/approvals\//);
  assert.match(onboarding, /Request Approval/);
});

test("launch readiness combines delivery, approval, domain and live health checks", () => {
  assert.match(api, /\/api\/admin\/businesses\/:businessId\/launch-readiness/);
  assert.match(api, /Customer onboarding complete/);
  assert.match(api, /No broken website buttons\/links/);
  assert.match(api, /Customer approved current version/);
  assert.match(api, /Public website returns a successful HTML page/);
  assert.match(api, /response\.status >= 200 && response\.status < 400/);
  assert.match(onboarding, /Launch QA/);
});


test("daily automation also performs lightweight published-site health monitoring", () => {
  assert.match(api, /BennieStudio-HealthMonitor\/1\.0/);
  assert.match(api, /website_health_checks/);
  assert.match(api, /source: "daily_cron"/);
  assert.match(api, /websiteHealthChecks:/);
});


test("sales inbox summaries surface reply preview, unread handling and follow-up tasks", () => {
  assert.match(api, /\/api\/admin\/sales-inbox/);
  assert.match(api, /\/api\/admin\/prospects\/:prospectId\/follow-up/);
  assert.match(prospects, /Sales Reply Center/);
  assert.match(prospects, /No inbound sales replies yet/);
  assert.match(prospects, /Last send:/);
  assert.match(prospects, /Replied ·/);
  assert.match(prospects, /Mark handled/);
  assert.match(prospects, /formatDistanceToNowStrict/);
});

test("prospect conversion captures agreed commercial and contact terms", () => {
  assert.match(api, /setupFee: z\.number/);
  assert.match(api, /recurringFee: z\.number/);
  assert.match(api, /commercialAgreement/);
  assert.match(prospects, /Setup fee/);
  assert.match(prospects, /Recurring fee/);
});

test("customer change requests become structured launch-blocking work items", () => {
  assert.match(api, /website_approval_change/);
  assert.match(api, /monthly_update_requests/);
  assert.match(approvals, /Page \(optional\)/);
  assert.match(approvals, /Section \(optional\)/);
});

test("launch readiness covers the full commercial launch checklist", () => {
  assert.match(api, /Mobile\/responsive QA approved/);
  assert.match(api, /No broken website buttons\/links/);
  assert.match(api, /No broken images reported/);
  assert.match(api, /Favicon configured/);
  assert.match(api, /Privacy page present/);
  assert.match(api, /Analytics\/tracking configured/);
  assert.match(api, /Publication status:/);
});


test("admin-configured commitment is authoritative across catalogue, terms and checkout", () => {
  assert.match(api, /getMinimumTermMonths\(\{ minimumTermMonths: price\.minimum_term_months/);
  assert.doesNotMatch(api, /\[3, 6, 9, 12\]/);
  assert.match(prospects, /Defaults from Products & Pricing/);
  assert.match(api, /currentPrice\.minimum_term_months/);
  assert.match(commercialCatalogue, /source of truth used by public pricing, checkout, new proposals and the live Terms page/);
  assert.match(pricing, /getMinimumTermMonths\(pendingPrice\)/);
  assert.match(previewOrder, /getMinimumTermMonths\(price\)/);
  assert.match(policies, /Current configured commitment/);
  assert.doesNotMatch(proposals, /commitmentMonths \|\| 6/);
});

test("subscription checkout records explicit terms acceptance and business billing identity", () => {
  assert.match(api, /termsAccepted: z\.literal\(true\)/);
  assert.match(api, /billing_address_collection: "required"/);
  assert.match(api, /tax_id_collection: \{ enabled: true \}/);
  assert.match(api, /termsVersion: COMMERCIAL_TERMS_VERSION/);
  assert.match(pricing, /I confirm this scope/);
  assert.match(previewOrder, /I confirm this scope/);
  assert.match(proposals, /I confirm the scope/);
});

test("customer confidence flow makes evidence and managed handoff explicit", () => {
  assert.match(prospectPreview, /What we found/);
  assert.match(prospectPreview, /What changes/);
  assert.match(prospectPreview, /What stays grounded/);
  assert.match(prospectPreview, /After subscription/);
  assert.match(checkoutStatus, /Your managed project starts here/);
  assert.match(publicChrome, /companyRegistrationNumber/);
  assert.match(publicChrome, /businessAddress/);
});

test("customer approval access matches the client approval capability", () => {
  assert.match(appRoutes, /allowedRoles=\{\["business_admin", "staff", "client"\]\}[\s\S]{0,180}<CustomerApprovals \/>/);
});
test("launch hardening migration aligns negotiated terms and least-privilege RLS", () => {
  assert.match(hardeningMigration, /commercial_term_months >= 1 AND commercial_term_months <= 120/);
  assert.match(hardeningMigration, /has_platform_permission\('sales'/);
  assert.match(hardeningMigration, /DROP POLICY IF EXISTS "Customers respond to their approvals"/);
  assert.match(hardeningMigration, /Customer users create own update requests/);
});


test("customer onboarding access can be resent without recreating conversion records", () => {
  assert.match(api, /\/api\/admin\/businesses\/:businessId\/onboarding-invite/);
  assert.match(api, /deliverCustomerOnboardingInvite/);
  assert.match(onboarding, /Resend invite/);
  assert.match(onboarding, /Copy access link/);
});

test("final launch uses a fresh content-aware live crawler", () => {
  assert.match(api, /runFinalLaunchCrawler/);
  assert.match(api, /fresh_crawl/);
  assert.match(finalLaunchQa, /brokenResources/);
  assert.match(finalLaunchQa, /duplicate page slug/);
  assert.match(onboarding, /Fresh crawl:/);
});

test("deterministic commercial lifecycle e2e covers conversion, access, launch QA and approval", () => {
  assert.match(commercialLifecycleE2e, /Create Customer Workspace/);
  assert.match(commercialLifecycleE2e, /Resend invite/);
  assert.match(commercialLifecycleE2e, /Launch QA/);
  assert.match(commercialLifecycleE2e, /Approve Version/);
  assert.match(commercialLifecycleE2e, /horizontal overflow/);
});
