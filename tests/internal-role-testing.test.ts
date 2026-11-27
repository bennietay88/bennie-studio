import test from "node:test";
import assert from "node:assert/strict";
import {isAuthorizedTestOwner} from "../server/internalRoleTestRoutes";
import {findPlan,activePlans} from "../src/constants/plans";
test("role switching requires explicit active owner registry, protected business mode and matching identity",()=>{
 const p={id:"owner",status:"active",role:"business_admin",business_id:"tenant"};
 const r={owner_id:"owner",business_id:"tenant",enabled:true};
 const b={id:"tenant",owner_id:"owner",internal_access_mode:"owner",status:"active"};
 assert.equal(isAuthorizedTestOwner(p,r,b,"owner"),true);
 assert.equal(isAuthorizedTestOwner({...p,role:"staff"},r,b,"owner"),false);
 assert.equal(isAuthorizedTestOwner(p,{...r,enabled:false},b,"owner"),false);
 assert.equal(isAuthorizedTestOwner(p,r,{...b,internal_access_mode:null},"owner"),false);
 assert.equal(isAuthorizedTestOwner(p,r,b,"other"),false);
});
test("internal plan is bounded and not a public purchasable plan",()=>{
 const p=findPlan(undefined,"internal_owner");
 assert.equal(p.maxPages,100);assert.equal(p.isActive,false);assert.equal(p.priceId,"");
 assert.ok(!activePlans([p]).some(x=>x.id==="internal_owner"));
});
