import test from "node:test";
import assert from "node:assert/strict";
import {secondaryDomainFailure,type SecondaryRouteRow} from "../src/lib/secondarySiteRouting";
const site:SecondaryRouteRow={id:"site-a",business_id:"tenant-a",custom_domain:"www.example.com",status:"published",is_primary:false,is_internal_pilot:false,archived_at:null,custom_domain_status:"connected",custom_domain_verified_at:"2026-11-27",custom_domain_permission_confirmed:true,custom_domain_suspended:false,ssl_status:"issued"};
test("only the exact assigned ready host resolves",()=>{
 assert.equal(secondaryDomainFailure(site,"www.example.com"),null);
 assert.equal(secondaryDomainFailure(site,"example.com")?.code,"DOMAIN_NOT_FOUND");
 for(const patch of [{status:"draft"},{archived_at:"2026-11-27"},{is_internal_pilot:true},{is_primary:true},{custom_domain_suspended:true},{custom_domain_permission_confirmed:false},{custom_domain_verified_at:null},{custom_domain_status:"dns_pending"},{ssl_status:"pending"}]){
 assert.notEqual(secondaryDomainFailure({...site,...patch},site.custom_domain),null);
 }
});
