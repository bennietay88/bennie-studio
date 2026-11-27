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
