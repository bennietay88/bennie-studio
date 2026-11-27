import { z } from "zod";
import {
  DEFAULT_FUNNEL_TIER_CONFIG, normalizeFunnelTierConfig, resolveFunnelTier,
  type FunnelTierConfig, type FunnelLimits,
} from "../src/lib/funnelTiers.js";

type Options = {
  app: any; db: any; authenticate: any; superAdminOnly: any;
  getStripe: () => Promise<any>; publicAppUrl: () => string; rateLimit: any;
};
const uuid = z.string().uuid();
const limitsSchema = z.object({
  maxFunnels: z.number().int().min(0).max(100).optional(),
  maxSteps: z.number().int().min(0).max(100).optional(),
  workflows: z.boolean().optional(), checkout: z.boolean().optional(),
  variants: z.boolean().optional(), ai: z.boolean().optional(),
}).strict();
const configLimitsSchema = z.object({
  maxFunnels: z.number().int().min(0).max(100),
  maxSteps: z.number().int().min(0).max(100),
  workflows: z.boolean(), checkout: z.boolean(), variants: z.boolean(), ai: z.boolean(),
}).strict();

async function checked(task: PromiseLike<{ data: any; error: any }>) {
  const result = await task;
  if (result.error) throw result.error;
  return result.data;
}
export async function getFunnelTierConfig(db: any): Promise<FunnelTierConfig> {
  const row = await checked(db.from("settings").select("content").eq("id", "funnel_tiers").maybeSingle());
  return normalizeFunnelTierConfig(row?.content || DEFAULT_FUNNEL_TIER_CONFIG);
}
async function readBusiness(db: any, businessId: string) {
  return checked(db.from("businesses")
    .select("id,name,status,subscription_status,stripe_customer_id,custom_enabled_features,internal_access_mode")
    .eq("id", businessId).maybeSingle());
}
// Preserve pre-migration production: never interrupt existing funnels or
// unrelated Stripe webhooks simply because the new entitlement table is absent.
export const isMissingFunnelSchema = (error: any) =>
  ["42P01","PGRST205","PGRST116"].includes(String(error?.code || "")) &&
  /funnel_entitlements|funnel_trigger_jobs|does not exist|schema cache/i.test(String(error?.message || ""));
async function readEntitlement(db: any, businessId: string) {
  const result = await db.from("funnel_entitlements").select("*").eq("business_id", businessId).maybeSingle();
  if (result.error && isMissingFunnelSchema(result.error)) return null;
  if (result.error) throw result.error;
  return result.data;
}
const isActiveBusiness = (business: any) =>
  !!business && business.status === "active" && ["active", "trialing"].includes(String(business.subscription_status || ""));
const hasCapability = (business: any) =>
  Array.isArray(business?.custom_enabled_features) && business.custom_enabled_features.includes("sales_funnels");

export async function getUnifiedFunnelAccess(db: any, businessId: string) {
  const [business, entitlement, config] = await Promise.all([
    readBusiness(db, businessId), readEntitlement(db, businessId), getFunnelTierConfig(db),
  ]);
  const resolved = resolveFunnelTier(entitlement, config, hasCapability(business));
  return {
    ...resolved, business, entitlement, config,
    active: resolved.active && isActiveBusiness(business),
  };
}
export async function unifiedFunnelMayServe(db: any, funnel: any) {
  const access = await getUnifiedFunnelAccess(db, funnel.business_id);
  return access.active && access.tier !== "none";
}

async function enablePaidFunnelBuilder(db: any, businessId: string) {
  const business = await checked(db.from("businesses")
    .select("id,sales_funnels_access_mode").eq("id",businessId).maybeSingle());
  if (business?.sales_funnels_access_mode === "managed") {
    await checked(db.from("businesses").update({
      sales_funnels_access_mode: "self_managed",
    }).eq("id", businessId));
  }
}

async function addLegacyCapability(db: any, business: any) {
  if (hasCapability(business)) return;
  const next = [...(Array.isArray(business.custom_enabled_features) ? business.custom_enabled_features : []), "sales_funnels"];
  await checked(db.from("businesses").update({ custom_enabled_features: next }).eq("id", business.id));
}
async function audit(db: any, req: any, action: string, businessId: string, changes: Record<string, unknown>) {
  await checked(db.from("admin_action_audit_logs").insert({
    actor_user_id: req.user.id, actor_email: req.user.email || null, action_type: action,
    target_type: "funnel_entitlement", target_id: businessId, target_label: "Sales Funnel Engine",
    metadata: changes,
  }));
}
const fail = (res: any, error: any, message: string) => {
  console.error("[UnifiedFunnelTiers]", error);
  return res.status(503).json({ error: message });
};

async function downgradeToFree(db: any, businessId: string) {
  const [entitlement, config, business] = await Promise.all([
    readEntitlement(db, businessId), getFunnelTierConfig(db), readBusiness(db, businessId),
  ]);
  if (!entitlement) return;
  const { data: funnels, error } = await db.from("funnels")
    .select("id,status,created_at")
    .eq("business_id", businessId).order("created_at", { ascending: true });
  if (error) throw error;
  // Preserve all records. Unpublish over-limit and advanced-feature funnels.
  const allowedCount = Math.max(0, config.free.maxFunnels);
  let publishable = 0;
  for (const funnel of funnels || []) {
    if (funnel.status !== "published") continue;
    const [{ data: steps }, { data: workflows }, { data: offers }, { data: variants }] = await Promise.all([
      db.from("funnel_steps").select("step_type").eq("funnel_id", funnel.id),
      db.from("funnel_workflows").select("id").eq("funnel_id", funnel.id).eq("status", "active").limit(1),
      db.from("funnel_offers").select("id").eq("funnel_id", funnel.id).eq("active", true).limit(1),
      db.from("funnel_variants").select("id").eq("funnel_id", funnel.id).eq("status", "active").limit(1),
    ]);
    const valid = publishable < allowedCount && (steps || []).length <= config.free.maxSteps
      && (steps || []).every((s: any) => ["lead_form","thank_you"].includes(s.step_type))
      && !(workflows || []).length && !(offers || []).length && !(variants || []).length;
    if (!valid) {
      await checked(db.from("funnels").update({ status: "draft", published_at: null }).eq("id", funnel.id));
      await checked(db.from("funnel_steps").update({ status: "draft" }).eq("funnel_id", funnel.id));
    } else publishable += 1;
  }
  // Free grants are managed; a cancelled paid subscription must not keep self-managed builder access.
  await checked(db.from("businesses").update({ sales_funnels_access_mode: "managed" })
    .eq("id", businessId));
  await checked(db.from("funnel_entitlements").update({
    tier: "free", status: isActiveBusiness(business) ? "active" : "cancelled",
    source: "downgrade", limit_overrides: {}, stripe_subscription_id: null,
    stripe_checkout_session_id: null, cancel_at_period_end: false, updated_at: new Date().toISOString(),
  }).eq("business_id", businessId));
}

export async function handleUnifiedFunnelTierWebhook(db: any, event: any): Promise<boolean> {
  const type = String(event?.type || "");
  const obj: any = event.data?.object || {};
  const metadata = obj.metadata || obj.parent?.subscription_details?.metadata || {};
  const subscriptionId: string | null =
    (typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id) ||
    (typeof obj.parent?.subscription_details?.subscription === "string"
      ? obj.parent.subscription_details.subscription : null) ||
    (type.startsWith("customer.subscription.") ? obj.id : null);
  let entitlement = null;
  if (metadata.type === "unified_funnel_tier" && uuid.safeParse(metadata.businessId).success) {
    entitlement = await readEntitlement(db, metadata.businessId);
  } else if (subscriptionId) {
    const lookup = await db.from("funnel_entitlements")
      .select("*").eq("stripe_subscription_id", subscriptionId).maybeSingle();
    if (lookup.error && !isMissingFunnelSchema(lookup.error)) throw lookup.error;
    entitlement = lookup.data;
  }
  if (!entitlement) return false;
  if (subscriptionId && entitlement.stripe_subscription_id && entitlement.stripe_subscription_id !== subscriptionId) {
    return true; // stale Stripe event for an earlier billing cycle
  }
  if (type === "checkout.session.completed" || type === "checkout.session.async_payment_succeeded") {
    if (metadata.type !== "unified_funnel_tier" || obj.payment_status !== "paid" || !subscriptionId) return true;
    if (entitlement.stripe_checkout_session_id && entitlement.stripe_checkout_session_id !== obj.id) return true;
    const business = await readBusiness(db, entitlement.business_id);
    if (!isActiveBusiness(business)) return true; // never activate without parent website
    await checked(db.from("funnel_entitlements").update({
      tier: "paid", status: "active", source: "checkout",
      stripe_subscription_id: subscriptionId, stripe_checkout_session_id: obj.id,
      cancel_at_period_end: false, updated_at: new Date().toISOString(),
    }).eq("id", entitlement.id));
    await addLegacyCapability(db, business);
    await enablePaidFunnelBuilder(db, business.id);
    return true;
  }
  if (type === "customer.subscription.deleted" ||
      (type === "customer.subscription.updated" && ["canceled","unpaid","incomplete_expired"].includes(obj.status))) {
    await downgradeToFree(db, entitlement.business_id);
    return true;
  }
  if (type === "invoice.payment_failed" ||
      (type === "customer.subscription.updated" && obj.status === "past_due")) {
    await checked(db.from("funnel_entitlements").update({
      status: "payment_failed", updated_at: new Date().toISOString(),
    }).eq("id", entitlement.id));
    return true;
  }
  if (type === "invoice.paid" && entitlement.tier === "paid" && entitlement.status === "payment_failed") {
    const business = await readBusiness(db, entitlement.business_id);
    if (!isActiveBusiness(business)) return true;
    await checked(db.from("funnel_entitlements").update({
      status: "active", updated_at: new Date().toISOString(),
    }).eq("id", entitlement.id));
    return true;
  }
  if (type === "customer.subscription.updated" && entitlement.stripe_subscription_id) {
    await checked(db.from("funnel_entitlements").update({
      cancel_at_period_end: Boolean(obj.cancel_at_period_end), updated_at: new Date().toISOString(),
    }).eq("id", entitlement.id));
  }
  return true;
}

export async function cancelUnifiedFunnelWithParent(db: any, getStripe: () => Promise<any>, businessId: string) {
  const entitlement = await readEntitlement(db, businessId);
  if (!entitlement) return;
  if (entitlement.tier === "paid" && entitlement.stripe_subscription_id) {
    const stripe = await getStripe();
    const subscription = await stripe.subscriptions.retrieve(entitlement.stripe_subscription_id);
    if (subscription.status !== "canceled") await stripe.subscriptions.cancel(entitlement.stripe_subscription_id);
  }
  // Retain all funnel records and billing history; unpublish instead of deleting.
  await checked(db.from("funnels").update({ status: "draft", published_at: null })
    .eq("business_id", businessId).eq("status", "published"));
  await checked(db.from("funnel_steps").update({ status: "draft" }).eq("business_id", businessId));
  await checked(db.from("funnel_entitlements").update({
    status: "cancelled", updated_at: new Date().toISOString(),
  }).eq("business_id", businessId));
}

export function registerUnifiedFunnelTierRoutes({app,db,authenticate,superAdminOnly,getStripe,publicAppUrl,rateLimit}: Options) {
  const customer = async (req: any, res: any, next: any) => {
    try {
      const profile = await checked(db.from("profiles").select("id,business_id,role,status")
        .eq("id", req.user.id).maybeSingle());
      if (!profile || profile.role !== "business_admin" || !profile.business_id ||
          ["suspended","terminated"].includes(profile.status)) return res.status(403).json({ error: "Business admin required." });
      req.funnelBusiness = await readBusiness(db, profile.business_id);
      if (!req.funnelBusiness) return res.status(403).json({ error: "Customer account unavailable." });
      next();
    } catch (error) { return fail(res,error,"Customer access could not be verified."); }
  };
  app.get("/api/customer/funnel-tier", authenticate, customer, async (req:any,res:any) => {
    try {
      const access = await getUnifiedFunnelAccess(db, req.funnelBusiness.id);
      return res.json({
        tier: access.tier, active: access.active, limits: access.limits,
        status: access.entitlement?.status || (access.tier === "legacy" ? "active" : "none"),
        enabled: access.config.enabled, monthlyUsd: access.config.paidMonthlyUsd,
        cancelAtPeriodEnd: Boolean(access.entitlement?.cancel_at_period_end),
      });
    } catch(error) { return fail(res,error,"Funnel plan unavailable."); }
  });
  app.get("/api/admin/funnel-tiers", authenticate, superAdminOnly, async (_req:any,res:any) => {
    try {
      const [config, businesses, entitlements] = await Promise.all([
        getFunnelTierConfig(db),
        checked(db.from("businesses").select("id,name,plan,status,subscription_status,custom_enabled_features").order("name").limit(1000)),
        checked(db.from("funnel_entitlements").select("*").limit(1000)),
      ]);
      return res.json({config, businesses, entitlements});
    } catch(error) { return fail(res,error,"Funnel tier management unavailable."); }
  });
  app.patch("/api/admin/funnel-tiers/config", authenticate, superAdminOnly, async (req:any,res:any) => {
    const body = z.object({enabled:z.boolean(),paidMonthlyUsd:z.number().min(1).max(999),
      free:configLimitsSchema,paid:configLimitsSchema}).strict().safeParse(req.body);
    if (!body.success) return res.status(400).json({error:"Invalid limits or pricing."});
    try {
      const config = normalizeFunnelTierConfig(body.data);
      await checked(db.from("settings").upsert({id:"funnel_tiers",content:config,updated_at:new Date().toISOString()}));
      await audit(db,req,"funnel_tiers.config_updated",req.user.id,{config});
      return res.json({config});
    } catch(error) { return fail(res,error,"Could not save funnel plans."); }
  });
  app.post("/api/admin/funnel-tiers/grant",authenticate,superAdminOnly,async(req:any,res:any)=>{
    const body=z.object({businessId:uuid,overrides:limitsSchema.optional()}).strict().safeParse(req.body);
    if (!body.success) return res.status(400).json({error:"Invalid complimentary grant."});
    try {
      const business=await readBusiness(db,body.data.businessId);
      if (!isActiveBusiness(business)) return res.status(409).json({error:"An active Bennie Studio customer subscription is required."});
      const previous=await readEntitlement(db,business.id);
      if (previous?.tier==="paid" || (!previous && hasCapability(business))) {
        return res.status(409).json({error:"Existing advanced/paid entitlement must not be downgraded automatically."});
      }
      const values={business_id:business.id,tier:"free",status:"active",source:"admin",
        limit_overrides:body.data.overrides||{},updated_at:new Date().toISOString()};
      const entitlement=await checked(db.from("funnel_entitlements").upsert(values,{onConflict:"business_id"}).select("*").single());
      await addLegacyCapability(db,business);
      await audit(db,req,"funnel_tiers.complimentary_grant",business.id,{limits:body.data.overrides||{}});
      return res.json({entitlement});
    } catch(error) { return fail(res,error,"Complimentary access could not be granted."); }
  });
  app.patch("/api/admin/funnel-tiers/:businessId/limits", authenticate, superAdminOnly, async(req:any,res:any)=>{
    if (!uuid.safeParse(req.params.businessId).success) return res.status(400).json({error:"Invalid customer."});
    const parsed = z.object({overrides:limitsSchema}).strict().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({error:"Invalid limit overrides."});
    try {
      const existing = await readEntitlement(db,req.params.businessId);
      if (!existing) return res.status(404).json({error:"No unified entitlement exists for this customer."});
      const updated = await checked(db.from("funnel_entitlements").update({
        limit_overrides:parsed.data.overrides,updated_at:new Date().toISOString(),
      }).eq("business_id",req.params.businessId).select("*").single());
      await audit(db,req,"funnel_tiers.limits_updated",req.params.businessId,{overrides:parsed.data.overrides});
      return res.json({entitlement:updated});
    } catch(error){ return fail(res,error,"Could not change funnel limits."); }
  });
  app.post("/api/admin/funnel-tiers/:businessId/revoke", authenticate, superAdminOnly, async(req:any,res:any)=>{
    if (!uuid.safeParse(req.params.businessId).success) return res.status(400).json({error:"Invalid customer."});
    try {
      const existing = await readEntitlement(db,req.params.businessId);
      if (!existing || existing.tier !== "free") return res.status(409).json({
        error:"Only complimentary entitlements can be revoked here. Paid plans must be cancelled in Stripe."});
      await checked(db.from("funnels").update({status:"draft",published_at:null})
        .eq("business_id",req.params.businessId).eq("status","published"));
      await checked(db.from("funnel_steps").update({status:"draft"}).eq("business_id",req.params.businessId));
      const updated = await checked(db.from("funnel_entitlements").update({
        status:"cancelled",updated_at:new Date().toISOString(),
      }).eq("business_id",req.params.businessId).select("*").single());
      await audit(db,req,"funnel_tiers.complimentary_revoked",req.params.businessId,{previousStatus:existing.status});
      return res.json({entitlement:updated});
    } catch(error){ return fail(res,error,"Could not revoke complimentary access."); }
  });

  app.post("/api/customer/funnel-tier/checkout",authenticate,customer,
    rateLimit({windowMs:60*60*1000,max:5,keyPrefix:"unified-funnel-tier-checkout"}),async(req:any,res:any)=>{
    const business=req.funnelBusiness;
    try {
      if (business.internal_access_mode) return res.status(409).json({error:"Internal workspaces do not require paid funnel checkout. Use Super Admin.",code:"INTERNAL_BILLING_EXEMPT"});
      const config=await getFunnelTierConfig(db);
      if (!config.enabled) return res.status(409).json({error:"Paid funnel plans are not available yet."});
      if (!isActiveBusiness(business)) return res.status(409).json({error:"An active website subscription is required."});
      const prior=await readEntitlement(db,business.id);
      if (prior?.tier==="paid" && prior.status==="active") return res.status(409).json({error:"Your paid funnel plan is already active."});
      if (!prior && hasCapability(business)) return res.status(409).json({error:"Your existing advanced funnel entitlement is managed separately."});
      if (prior?.stripe_subscription_id) return res.status(409).json({error:"Resolve the current funnel billing subscription first."});
      const stripe=await getStripe();
      if (prior?.stripe_checkout_session_id) {
        const existing=await stripe.checkout.sessions.retrieve(prior.stripe_checkout_session_id);
        if (existing.status==="open" && existing.url) return res.json({url:existing.url});
        if (existing.payment_status==="paid") return res.status(409).json({error:"Payment confirmation is processing."});
      }
      const entitlement=prior || await checked(db.from("funnel_entitlements").insert({
        business_id:business.id,tier:"paid",status:"pending_payment",source:"checkout",
      }).select("*").single());
      const meta={type:"unified_funnel_tier",businessId:business.id,entitlementId:entitlement.id};
      const session=await stripe.checkout.sessions.create({
        mode:"subscription",payment_method_types:["card"],
        line_items:[{price_data:{currency:"usd",unit_amount:Math.round(config.paidMonthlyUsd*100),
          recurring:{interval:"month"},product_data:{name:"Bennie Studio — Sales Funnels Paid"}},quantity:1}],
        ...(business.stripe_customer_id?{customer:business.stripe_customer_id}:{customer_email:req.user.email}),
        metadata:meta,subscription_data:{metadata:meta},
        success_url:publicAppUrl()+"/dashboard/funnels/plans?checkout=returned",
        cancel_url:publicAppUrl()+"/dashboard/funnels/plans?checkout=cancelled",
      },{idempotencyKey:"unified-funnel-plan-"+entitlement.id+"-"+Date.now()});
      await checked(db.from("funnel_entitlements").update({
        stripe_checkout_session_id:session.id,updated_at:new Date().toISOString(),
      }).eq("id",entitlement.id));
      return res.json({url:session.url});
    } catch(error) { return fail(res,error,"Could not start secure funnel checkout."); }
  });
  app.post("/api/customer/funnel-tier/cancel",authenticate,customer,async(req:any,res:any)=>{
    try {
      const entitlement=await readEntitlement(db,req.funnelBusiness.id);
      if (!entitlement || entitlement.tier!=="paid" || !entitlement.stripe_subscription_id ||
          entitlement.status==="cancelled") return res.status(409).json({error:"No active paid funnel subscription."});
      const stripe=await getStripe();
      const subscription=await stripe.subscriptions.update(entitlement.stripe_subscription_id,{cancel_at_period_end:true});
      await checked(db.from("funnel_entitlements").update({
        cancel_at_period_end:Boolean(subscription.cancel_at_period_end),updated_at:new Date().toISOString(),
      }).eq("id",entitlement.id));
      return res.json({cancelAtPeriodEnd:Boolean(subscription.cancel_at_period_end)});
    } catch(error) { return fail(res,error,"Could not schedule funnel cancellation."); }
  });
}