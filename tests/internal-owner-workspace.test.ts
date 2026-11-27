import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("internal billing exemptions are checked by server and separate from ordinary plan restrictions",()=>{
 const api=readFileSync("api/index.ts","utf8"),admin=readFileSync("src/components/SuperAdminDashboard.tsx","utf8"),bill=readFileSync("src/components/Billing.tsx","utf8"),feature=readFileSync("src/hooks/useFeatures.ts","utf8");
 assert.match(api,/await assertBusinessAdminAccess\(req.user.id, businessId\);\s+if \(await isInternalWorkspace\(businessId\)\)/);
 assert.match(api,/isInternalWorkspace\(proposal.business_id\)/);
 assert.match(api,/isInternalWorkspace\(lead.business_id\)/);
 assert.match(api,/\.is\("internal_access_mode",null\)/);
 assert.match(bill,/Complimentary platform access/);
 assert.match(admin,/Internal owner development/);
 assert.match(feature,/currentPlan.enabled_features/);
});

test("internal add-on checkout protection and migration guard",()=>{
 const api=readFileSync("api/index.ts","utf8");const unified=readFileSync("server/unifiedFunnelTiers.ts","utf8");const simple=readFileSync("server/simpleFunnelAddon.ts","utf8");
 const preview=api.slice(api.indexOf('"/api/public/preview-checkout"'),api.indexOf('"/api/public/preview-checkout/status"'));assert.match(preview,/isInternalWorkspace\(lead.business_id\)/);
 assert.match(unified,/business.internal_access_mode.*INTERNAL_BILLING_EXEMPT/);assert.match(simple,/business.internal_access_mode.*INTERNAL_BILLING_EXEMPT/);
 const migration=readFileSync("supabase/migrations/20261127005929_internal_owner_workspace.sql","utf8");assert.match(migration,/Only a super administrator may configure internal access/);assert.match(migration,/Internal workspace cannot be linked to platform Stripe billing/);
});
