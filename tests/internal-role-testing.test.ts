import test from "node:test";
import assert from "node:assert/strict";
import {hasInternalOwnerAccess} from "../src/lib/internalOwnerAccess";
import {isAuthorizedTestOwner,recentRoleSession} from "../server/internalRoleTestRoutes";
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

test("only the active business administrator who owns the business receives the feature bypass",()=>{
 const p={uid:"owner",role:"business_admin",status:"active",businessId:"tenant"};
 const b={id:"tenant",owner_id:"owner",status:"active",internal_access_mode:"owner"};
 assert.equal(hasInternalOwnerAccess(p,b),true);
 for(const role of ["staff","client","affiliate","platform_staff","super_admin"])assert.equal(hasInternalOwnerAccess({...p,role},b),false);
 assert.equal(hasInternalOwnerAccess({...p,uid:"other"},b),false);
 assert.equal(hasInternalOwnerAccess({...p,status:"suspended"},b),false);
 assert.equal(hasInternalOwnerAccess(p,{...b,id:"other"}),false);
});
test("privileged test roles need fresh MFA on the verified current session",()=>{
 const now=1000000;const claims={sub:"owner",session_id:"session",aal:"aal2",amr:[{method:"totp",timestamp:999}]};
 const token=(c:any)=>"header."+Buffer.from(JSON.stringify(c)).toString("base64url")+".signature";
 assert.equal(recentRoleSession(token(claims),"owner",true,now),true);
 assert.equal(recentRoleSession(token({...claims,aal:"aal1"}),"owner",true,now),false);
 assert.equal(recentRoleSession(token({...claims,amr:[{method:"password",timestamp:600}]}),"owner",false,now),false);
 assert.equal(recentRoleSession(token(claims),"wrong",true,now),false);
 assert.equal(recentRoleSession("invalid","owner",true,now),false);
});
