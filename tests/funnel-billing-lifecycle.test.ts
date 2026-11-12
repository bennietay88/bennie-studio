import test from "node:test";
import assert from "node:assert/strict";
import { handleUnifiedFunnelTierWebhook, getUnifiedFunnelAccess } from "../server/unifiedFunnelTiers.ts";

type Row = Record<string, any>;
class Query {
  filters: Array<(r: Row) => boolean> = [];
  operation: "select" | "update" | "insert" = "select";
  patch: Row = {};
  constructor(public store: MockStore, public table: string) {}
  select(_keys?: string) { return this; }
  eq(key: string, val: any) { this.filters.push((r) => r[key] === val); return this; }
  order(_key: string, _opts?: any) { return this; }
  limit(_count: number) { return this; }
  update(patch: Row) { this.operation = "update"; this.patch = patch; return this; }
  insert(row: Row) { this.operation = "insert"; this.patch = row; return this; }
  async result(single = false) {
    if (!(this.table in this.store.rows)) {
      return {data:null,error:{code:"PGRST205",message:"Could not find table public."+this.table+" in schema cache"}};
    }
    const matches = this.store.rows[this.table].filter(r => this.filters.every(fn=>fn(r)));
    if (this.operation === "update") for (const row of matches) Object.assign(row, this.patch);
    if (this.operation === "insert") this.store.rows[this.table].push({...this.patch});
    const data = this.operation === "insert" ? this.patch : single ? (matches[0] || null) : matches;
    return {data,error:null};
  }
  maybeSingle() { return this.result(true); }
  single() { return this.result(true); }
  then(resolve: any, reject: any) { return this.result().then(resolve,reject); }
}
class MockStore {
  rows: Record<string, Row[]>;
  constructor(hasMigration = true) {
    this.rows = {
      businesses: [{
        id:"11111111-1111-4111-8111-111111111111",
        name:"Example",status:"active",subscription_status:"active",
        custom_enabled_features:[],sales_funnels_access_mode:"managed",
      }],
      settings: [{
        id:"funnel_tiers",content: {
          enabled:false, paidMonthlyUsd:19,
          free:{maxFunnels:1,maxSteps:2,workflows:false,checkout:false,variants:false,ai:false},
          paid:{maxFunnels:3,maxSteps:10,workflows:true,checkout:true,variants:true,ai:true},
        },
      }],
      funnels:[],
    };
    if (hasMigration) this.rows.funnel_entitlements = [{
      id:"22222222-2222-4222-8222-222222222222",
      business_id:"11111111-1111-4111-8111-111111111111",
      tier:"paid",status:"pending_payment",source:"checkout",
      stripe_checkout_session_id:"cs_test_1234567890123456",stripe_subscription_id:null,
      limit_overrides:{},
    }];
  }
  from(table: string) { return new Query(this,table); }
  get e() { return this.rows.funnel_entitlements?.[0]; }
  get b() { return this.rows.businesses[0]; }
}
const businessId="11111111-1111-4111-8111-111111111111";
const subId="sub_example123456";
const checkout=()=>({
  type:"checkout.session.completed",
  data:{object:{
    id:"cs_test_1234567890123456",
    metadata:{type:"unified_funnel_tier",businessId},
    subscription:subId,payment_status:"paid",
  }},
});
const event=(type:string, object:Row={})=>({
  type,data:{object:{...object,parent:{subscription_details:{subscription:subId}}}},
});
test("migration absent: existing advanced entitlements continue and new tiers are fail closed",async()=>{
  const db=new MockStore(false);
  db.b.custom_enabled_features=["sales_funnels"];
  let access=await getUnifiedFunnelAccess(db,businessId);
  assert.equal(access.tier,"legacy");
  assert.equal(access.active,true);
  assert.equal(await handleUnifiedFunnelTierWebhook(db,event("invoice.payment_failed")),false);
  db.b.custom_enabled_features=[];
  access=await getUnifiedFunnelAccess(db,businessId);
  assert.equal(access.active,false);
});
test("verified paid checkout activates only once and does not modify unrelated website billing",async()=>{
  const db=new MockStore();
  assert.equal(await handleUnifiedFunnelTierWebhook(db,checkout()),true);
  assert.equal(db.e.status,"active");
  assert.equal(db.e.stripe_subscription_id,subId);
  assert.equal(db.b.sales_funnels_access_mode,"self_managed");
  assert.deepEqual(db.b.custom_enabled_features,["sales_funnels"]);
  assert.equal(await handleUnifiedFunnelTierWebhook(db,checkout()),true);
  assert.deepEqual(db.b.custom_enabled_features,["sales_funnels"]);
  assert.equal(db.b.subscription_status,"active");
});
test("fake checkout, mismatched session, and unpaid session cannot activate",async()=>{
  for(const change of [
    {payment_status:"unpaid"},
    {metadata:{type:"unrelated",businessId}},
    {id:"cs_test_another_9876543210"},
  ]) {
    const db=new MockStore();
    const attempt=checkout();
    Object.assign(attempt.data.object,change);
    const handled = await handleUnifiedFunnelTierWebhook(db,attempt);
    // Other-product events remain available to their own webhook handler.
    assert.equal(handled, change.metadata ? false : true);
    assert.equal(db.e.status,"pending_payment");
  }
});
test("subscription failure suspends checkout; successful renewal reactivates after website check",async()=>{
  const db=new MockStore();
  await handleUnifiedFunnelTierWebhook(db,checkout());
  assert.equal(await handleUnifiedFunnelTierWebhook(db,event("invoice.payment_failed")),true);
  assert.equal(db.e.status,"payment_failed");
  let access=await getUnifiedFunnelAccess(db,businessId);
  assert.equal(access.active,false);
  assert.equal(await handleUnifiedFunnelTierWebhook(db,event("invoice.paid")),true);
  assert.equal(db.e.status,"active");
  db.b.subscription_status="canceled";
  await handleUnifiedFunnelTierWebhook(db,event("invoice.payment_failed"));
  await handleUnifiedFunnelTierWebhook(db,event("invoice.paid"));
  assert.equal(db.e.status,"payment_failed");
});
test("stale subscription event cannot downgrade a newer active subscription",async()=>{
  const db=new MockStore();
  await handleUnifiedFunnelTierWebhook(db,checkout());
  assert.equal(await handleUnifiedFunnelTierWebhook(db, {
    type:"customer.subscription.deleted",
    data:{object:{id:"sub_old_cancelled"}},
  }),false);
  assert.equal(db.e.tier,"paid");
  assert.equal(db.e.status,"active");
});
test("subscription deletion downgrades without deleting CRM or funnel records",async()=>{
  const db=new MockStore();
  await handleUnifiedFunnelTierWebhook(db,checkout());
  db.rows.funnels.push({id:"some-funnel",business_id:businessId,status:"draft",created_at:"2026-01-01"});
  assert.equal(await handleUnifiedFunnelTierWebhook(db,{
    type:"customer.subscription.deleted",data:{object:{id:subId}},
  }),true);
  assert.equal(db.e.tier,"free");
  assert.equal(db.e.status,"active");
  assert.equal(db.e.stripe_subscription_id,null);
  assert.equal(db.b.sales_funnels_access_mode,"managed");
  assert.equal(db.rows.funnels.length,1);
});
