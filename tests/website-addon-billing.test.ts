import test from "node:test";
import assert from "node:assert/strict";
import {validWebsiteAddonPrice,websiteAddonPaidState} from "../server/websiteAddonRoutes";
test("only positive monthly licensed recurring prices qualify",()=>{
 const p={active:true,type:"recurring",unit_amount:100,recurring:{usage_type:"licensed",interval:"month",interval_count:1}};
 assert.equal(validWebsiteAddonPrice(p),true);
 for(const bad of [{...p,active:false},{...p,unit_amount:0},{...p,recurring:{...p.recurring,interval:"year"}},{...p,recurring:{...p.recurring,usage_type:"metered"}}])assert.equal(validWebsiteAddonPrice(bad),false);
});
test("no slots for unpaid, expired or cancelled subscription; scheduled cancellation keeps a paid period",()=>{
 const now=1000000;const s={status:"active",latest_invoice:{status:"paid"},current_period_end:2000,cancel_at_period_end:true};
 assert.equal(websiteAddonPaidState(s,now).status,"active");
 assert.equal(websiteAddonPaidState(s,now).cancel_at_period_end,true);
 assert.equal(websiteAddonPaidState({...s,latest_invoice:{status:"open"}},now).status,"inactive");
 assert.equal(websiteAddonPaidState({...s,status:"past_due"},now).status,"inactive");
 assert.equal(websiteAddonPaidState({...s,status:"canceled"},now).status,"cancelled");
 assert.equal(websiteAddonPaidState({...s,current_period_end:999},now).status,"inactive");
});
