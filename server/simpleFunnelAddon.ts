import crypto from "node:crypto";
import { z } from "zod";
import {
  DEFAULT_SIMPLE_FUNNEL_ADDON_CONFIG, normalizeSimpleFunnelAddonConfig,
  simpleFunnelPriceForPlan, SIMPLE_FUNNEL_MAX_REVISIONS,
} from "../src/lib/simpleFunnelAddon.js";

type Store = any;
type HandlerOptions = {
  app: any; db: Store; authenticate: any; superAdminOnly: any;
  assertBusinessAdminAccess: (userId: string, businessId: string) => Promise<any>;
  getStripe: () => Promise<any>;
  publicAppUrl: () => string;
  rateLimit: (...args: any[]) => any;
};
const uuid = z.string().uuid();
const briefSchema = z.object({
  offerName: z.string().trim().min(3).max(160),
  audience: z.string().trim().min(3).max(400),
  offerDescription: z.string().trim().min(10).max(2000),
  contactEmail: z.string().trim().email().max(254),
  notes: z.string().trim().max(3000).default(""),
}).strict();
const adminState = z.enum(["in_production", "approval_required", "active", "paused"]);
const publicFields = "id,business_id,mode,status,offer_name,audience,offer_description,contact_email,customer_notes,setup_fee_usd,monthly_fee_usd,funnel_id,approval_notes,revision_count,approved_at,activated_at,created_at,updated_at,cancel_at_period_end";

async function check(promise: PromiseLike<{ data: any; error: any }>): Promise<{ data: any; error: any }> {
  const result = await promise;
  if (result.error) throw result.error;
  return result;
}
const fail = (res: any, error: unknown, message: string) => {
  console.error("[SimpleFunnelAddon]", error);
  return res.status(503).json({ error: message });
};

export async function loadSimpleFunnelAddonConfig(db: Store) {
  const { data } = await check(db.from("settings").select("content").eq("id", "simple_funnel_addon").maybeSingle());
  return normalizeSimpleFunnelAddonConfig(data?.content || DEFAULT_SIMPLE_FUNNEL_ADDON_CONFIG);
}

async function loadCustomer(db: Store, req: any, authorize: HandlerOptions["assertBusinessAdminAccess"]) {
  const { data: profile } = await check(db.from("profiles")
    .select("id,role,business_id,status").eq("id", req.user.id).maybeSingle());
  if (!profile || profile.role !== "business_admin" || !profile.business_id ||
      ["suspended", "terminated"].includes(profile.status)) return null;
  await authorize(req.user.id, profile.business_id);
  const { data: business } = await check(db.from("businesses")
    .select("id,name,plan,status,subscription_status,stripe_customer_id,stripe_subscription_id,custom_enabled_features")
    .eq("id", profile.business_id).maybeSingle());
  return business || null;
}

async function audit(db: Store, actor: any, action: string, row: any, metadata: Record<string, unknown> = {}) {
  const { error } = await db.from("admin_action_audit_logs").insert({
    actor_user_id: actor.id, actor_email: actor.email || null,
    action_type: action, target_type: "simple_funnel_addon", target_id: row.id,
    target_label: row.offer_name, metadata,
  });
  if (error) throw error;
}

// An entitlement is granted only by a verified Stripe webhook or the included
// plan path. Preserve an independently purchased advanced funnel entitlement.
// Simple funnel add-on access is isolated from the advanced sales_funnels
// entitlement. Never mutate businesses.custom_enabled_features on purchase
// or cancellation: that could unlock advanced builder controls or revoke a
// separately purchased capability.
async function grantFunnelAccess(db: Store, addon: any) {
  await check(db.from("simple_funnel_addons").update({
    feature_granted_at: new Date().toISOString(),
  }).eq("id", addon.id));
}

async function withdrawFunnelAccess(db: Store, addon: any) {
  if (!addon.funnel_id) return;
  await check(db.from("funnels").update({ status: "draft", published_at: null })
    .eq("id", addon.funnel_id).eq("business_id", addon.business_id));
  await check(db.from("funnel_steps").update({ status: "draft" }).eq("funnel_id", addon.funnel_id));
}

// A simple funnel depends on the parent managed-website subscription.
// Cancel the separate paid subscription too; otherwise charges can continue
// after the customer's website subscription has ended.
export async function cancelSimpleFunnelWithParent(
  db: Store, getStripe: () => Promise<any>, businessId: string,
): Promise<void> {
  const { data: addon } = await check(db.from("simple_funnel_addons").select("*")
    .eq("business_id", businessId).maybeSingle());
  if (!addon || addon.status === "cancelled") return;
  if (addon.mode === "paid" && addon.stripe_subscription_id) {
    const stripe = await getStripe();
    const subscription = await stripe.subscriptions.retrieve(addon.stripe_subscription_id);
    if (subscription.status !== "canceled") {
      await stripe.subscriptions.cancel(addon.stripe_subscription_id);
    }
  }
  await withdrawFunnelAccess(db, addon);
  await check(db.from("simple_funnel_addons").update({
    status: "cancelled", cancel_at_period_end: false, updated_at: new Date().toISOString(),
  }).eq("id", addon.id));
}

export async function handleSimpleFunnelAddonWebhook(db: Store, getStripe: () => Promise<any>, event: any): Promise<boolean> {
  const type = String(event.type || "");
  const obj = event.data?.object || {};
  let addonId = "";
  let subscriptionId: string | null = null;
  if (type.startsWith("checkout.session.") && obj.metadata?.type === "simple_funnel_addon") {
    addonId = String(obj.metadata.addonId || "");
    subscriptionId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id || null;
  } else if (type.startsWith("customer.subscription.")) {
    subscriptionId = typeof obj.id === "string" ? obj.id : null;
    if (!subscriptionId) return false;
    // Stripe subscription metadata may not be present on every event/version.
    // Resolve the persisted addon subscription before base billing sees it.
    const { data: registered } = await check(db.from("simple_funnel_addons")
      .select("id").eq("stripe_subscription_id", subscriptionId).maybeSingle());
    if (!registered && obj.metadata?.type !== "simple_funnel_addon") return false;
    addonId = String(registered?.id || obj.metadata?.addonId || "");
  } else if (type === "invoice.paid" || type === "invoice.payment_failed") {
    const invoiceSub = obj.subscription || obj.parent?.subscription_details?.subscription;
    subscriptionId = typeof invoiceSub === "string" ? invoiceSub : invoiceSub?.id || null;
    if (!subscriptionId) return false;
    const { data: match } = await check(db.from("simple_funnel_addons")
      .select("id").eq("stripe_subscription_id", subscriptionId).maybeSingle());
    if (match) addonId = match.id;
    else {
      // Stripe invoice deliveries can precede checkout completion. Prefer
      // subscription metadata embedded in the invoice; never retrieve an
      // unrelated customer's Stripe subscription from the platform account.
      // Base website billing must remain isolated from the add-on.
      const details = obj.parent?.subscription_details;
      if (details?.metadata?.type !== "simple_funnel_addon") return false;
      addonId = String(details.metadata.addonId || "");
    }
  } else return false;

  if (!uuid.safeParse(addonId).success) throw new Error("FUNNEL_ADDON_WEBHOOK_MISSING_ID");
  const { data: addon } = await check(db.from("simple_funnel_addons").select("*").eq("id", addonId).maybeSingle());
  if (!addon) throw new Error("FUNNEL_ADDON_WEBHOOK_NOT_FOUND");
  if (obj.metadata?.businessId && obj.metadata.businessId !== addon.business_id) throw new Error("FUNNEL_ADDON_BUSINESS_MISMATCH");
  if (addon.stripe_subscription_id && subscriptionId && addon.stripe_subscription_id !== subscriptionId) {
    // Old deliveries for a previous billing cycle cannot alter a replacement subscription.
    return true;
  }

  if (type.startsWith("checkout.session.")) {
    if (obj.payment_status !== "paid" || !subscriptionId) return true;
    if (addon.status === "cancelled") return true;
    await check(db.from("simple_funnel_addons").update({
      status: addon.funnel_id ? "in_production" : "queued",
      stripe_subscription_id: subscriptionId,
      stripe_checkout_session_id: obj.id,
      updated_at: new Date().toISOString(),
    }).eq("id", addon.id));
    await grantFunnelAccess(db, addon);
    return true;
  }
  if (type === "customer.subscription.deleted" || (type === "customer.subscription.updated"
      && ["canceled", "unpaid", "incomplete_expired"].includes(obj.status))) {
    await withdrawFunnelAccess(db, addon);
    await check(db.from("simple_funnel_addons").update({
      status: "cancelled", cancel_at_period_end: false, updated_at: new Date().toISOString(),
    }).eq("id", addon.id));
    return true;
  }
  if (type === "invoice.payment_failed" || (type === "customer.subscription.updated" && obj.status === "past_due")) {
    if (addon.status !== "cancelled" && addon.status !== "pending_payment") {
      await withdrawFunnelAccess(db, addon);
      await check(db.from("simple_funnel_addons").update({
        status: "payment_failed", updated_at: new Date().toISOString(),
      }).eq("id", addon.id));
    }
    return true;
  }
  if (type === "invoice.paid" && addon.status === "payment_failed") {
    await grantFunnelAccess(db, addon);
    await check(db.from("simple_funnel_addons").update({
      status: addon.funnel_id ? "in_production" : "queued", updated_at: new Date().toISOString(),
    }).eq("id", addon.id));
    return true;
  }
  if (type === "customer.subscription.updated") {
    await check(db.from("simple_funnel_addons").update({
      cancel_at_period_end: Boolean(obj.cancel_at_period_end), updated_at: new Date().toISOString(),
    }).eq("id", addon.id));
  }
  return true;
}

// Historical billing and fulfilment are retained; new Simple Funnel sales are retired.
const SIMPLE_FUNNEL_NEW_SALES_RETIRED = true;

export function registerSimpleFunnelAddonRoutes(options: HandlerOptions) {
  const { app, db, authenticate, superAdminOnly, assertBusinessAdminAccess, getStripe, publicAppUrl, rateLimit } = options;
  const customer = async (req: any, res: any, next: any) => {
    try {
      req.addonBusiness = await loadCustomer(db, req, assertBusinessAdminAccess);
      if (!req.addonBusiness) return res.status(403).json({ error: "Business administrator access required." });
      next();
    } catch (error) { return fail(res, error, "Customer access could not be verified."); }
  };

  app.get("/api/customer/simple-funnel-addon", authenticate, customer, async (req: any, res: any) => {
    try {
      const business = req.addonBusiness;
      const config = await loadSimpleFunnelAddonConfig(db);
      const { data: addon } = await check(db.from("simple_funnel_addons").select(publicFields)
        .eq("business_id", business.id).maybeSingle());
      const price = simpleFunnelPriceForPlan(business.plan, config);
      let publicUrl: string | null = null;
      if (addon?.status === "active" && addon.funnel_id && ["active", "trialing"].includes(String(business.subscription_status || ""))) {
        const { data: funnel } = await check(db.from("funnels").select("slug,status")
          .eq("id", addon.funnel_id).eq("business_id", business.id).maybeSingle());
        if (funnel?.status === "published") publicUrl = publicAppUrl() + "/f/" + business.id + "/" + funnel.slug;
      }
      return res.json({ enabled: config.enabled, plan: business.plan, price, addon, publicUrl,
        isSubscriber: ["active", "trialing"].includes(String(business.subscription_status || "")) });
    } catch (error) { return fail(res, error, "Funnel add-on details unavailable."); }
  });

  // Customer-scoped draft preview: service-role fetch is allowed only after
  // validating the authenticated business admin and matching add-on tenant.
  app.get("/api/customer/simple-funnel-addon/preview", authenticate, customer, async (req: any, res: any) => {
    try {
      const { data: addon } = await check(db.from("simple_funnel_addons")
        .select("id,status,funnel_id").eq("business_id", req.addonBusiness.id).maybeSingle());
      if (!addon?.funnel_id || ["pending_payment","payment_failed","cancelled"].includes(addon.status)) {
        return res.status(404).json({ error: "No draft funnel is available." });
      }
      const { data: funnel } = await check(db.from("funnels")
        .select("id,name,status").eq("id", addon.funnel_id)
        .eq("business_id", req.addonBusiness.id).maybeSingle());
      if (!funnel) return res.status(404).json({ error: "Funnel draft not found." });
      const { data: steps } = await check(db.from("funnel_steps")
        .select("id,name,step_type,slug,sort_order,page_content,status")
        .eq("funnel_id", funnel.id).eq("business_id", req.addonBusiness.id)
        .order("sort_order"));
      return res.json({ funnel, steps: steps || [] });
    } catch (error) { return fail(res, error, "Draft preview could not be loaded."); }
  });

  app.post("/api/customer/simple-funnel-addon", authenticate, customer,
    rateLimit({ windowMs: 60 * 60 * 1000, max: 5, keyPrefix: "simple-funnel-addon-checkout" }),
    async (req: any, res: any) => {
      if (SIMPLE_FUNNEL_NEW_SALES_RETIRED) return res.status(410).json({ error: "Simple Funnel ordering has been retired. Use the unified Sales Funnel plans." });
      const parsed = briefSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Complete the offer, audience and contact details." });
      const business = req.addonBusiness;
      try {
        const config = await loadSimpleFunnelAddonConfig(db);
        if (!config.enabled) return res.status(409).json({ error: "The add-on is not available for new orders yet." });
        if (!["active", "trialing"].includes(String(business.subscription_status || ""))) {
          return res.status(409).json({ error: "An active Bennie Studio subscription is required." });
        }
        const price = simpleFunnelPriceForPlan(business.plan, config);
        if (!price.included && price.monthlyUsd < 1) return res.status(409).json({ error: "Recurring add-on pricing is not configured." });
        const { data: previous } = await check(db.from("simple_funnel_addons").select("*")
          .eq("business_id", business.id).maybeSingle());
        if (previous && !["pending_payment", "cancelled", "payment_failed"].includes(previous.status)) {
          return res.status(409).json({ error: "A funnel add-on is already attached to this business." });
        }
        if (previous?.status === "pending_payment" && previous.stripe_checkout_session_id) {
          const stripe = await getStripe();
          const session = await stripe.checkout.sessions.retrieve(previous.stripe_checkout_session_id);
          if (session.status === "open" && session.url) return res.json({ mode: "paid", url: session.url, addonId: previous.id });
          if (session.payment_status === "paid") return res.status(409).json({ error: "Payment is processing. Refresh your add-on status." });
        }
        if (previous?.stripe_subscription_id && previous.status !== "cancelled") {
          return res.status(409).json({ error: "Resolve the current subscription before purchasing again." });
        }
        const fields = {
          requested_by: req.user.id, offer_name: parsed.data.offerName, audience: parsed.data.audience,
          offer_description: parsed.data.offerDescription, contact_email: parsed.data.contactEmail,
          customer_notes: parsed.data.notes, mode: price.included ? "included" : "paid",
          status: price.included ? "queued" : "pending_payment",
          setup_fee_usd: price.setupUsd, monthly_fee_usd: price.monthlyUsd,
          stripe_checkout_session_id: null, stripe_subscription_id: null, cancel_at_period_end: false,
          checkout_attempt: Number(previous?.checkout_attempt || 0) + 1,
          funnel_id: null, feature_preexisting: null, feature_granted_at: null, approval_notes: null,
          revision_count: 0, approved_at: null, activated_at: null, updated_at: new Date().toISOString(),
        };
        const { data: addon } = previous
          ? await check(db.from("simple_funnel_addons").update(fields).eq("id", previous.id).select("*").single())
          : await check(db.from("simple_funnel_addons").insert({ ...fields, business_id: business.id }).select("*").single());
        if (price.included) {
          await grantFunnelAccess(db, addon);
          return res.json({ mode: "included", status: "queued", addonId: addon.id });
        }
        const stripe = await getStripe();
        const recurring = {
          price_data: { currency: "usd", unit_amount: Math.round(price.monthlyUsd * 100),
            recurring: { interval: "month" }, product_data: { name: "Bennie Studio — Simple Sales Funnel" } },
          quantity: 1,
        };
        const setup = price.setupUsd > 0 ? [{
          price_data: { currency: "usd", unit_amount: Math.round(price.setupUsd * 100),
            product_data: { name: "Simple Sales Funnel — One-time Setup" } }, quantity: 1,
        }] : [];
        const metadata = { type: "simple_funnel_addon", addonId: addon.id, businessId: business.id };
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [recurring, ...setup],
          ...(business.stripe_customer_id ? { customer: business.stripe_customer_id }
            : { customer_email: req.user.email }),
          subscription_data: { metadata },
          metadata,
          success_url: publicAppUrl() + "/dashboard/funnels?funnel_checkout=success",
          cancel_url: publicAppUrl() + "/dashboard/funnels?funnel_checkout=cancelled",
        }, { idempotencyKey: "simple-funnel-addon-" + addon.id + "-attempt-" + addon.checkout_attempt });
        await check(db.from("simple_funnel_addons").update({
          stripe_checkout_session_id: session.id, updated_at: new Date().toISOString(),
        }).eq("id", addon.id));
        return res.json({ mode: "paid", url: session.url, addonId: addon.id });
      } catch (error) { return fail(res, error, "Funnel checkout could not be started. No entitlement has been granted."); }
    });

  app.post("/api/customer/simple-funnel-addon/respond", authenticate, customer, async (req: any, res: any) => {
    const body = z.object({ decision: z.enum(["approve", "request_changes"]), notes: z.string().trim().max(2500).default("") }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid approval response." });
    try {
      const { data: addon } = await check(db.from("simple_funnel_addons").select("*")
        .eq("business_id", req.addonBusiness.id).maybeSingle());
      if (!addon || addon.status !== "approval_required" || !addon.funnel_id) {
        return res.status(409).json({ error: "No funnel is awaiting your approval." });
      }
      if (body.data.decision === "request_changes" && (!body.data.notes || addon.revision_count >= SIMPLE_FUNNEL_MAX_REVISIONS)) {
        return res.status(409).json({ error: "Describe your requested change. One revision round is included." });
      }
      const changes = body.data.decision === "approve"
        ? { status: "approved", approved_at: new Date().toISOString(), approval_notes: body.data.notes }
        : { status: "revision_requested", revision_count: addon.revision_count + 1, approval_notes: body.data.notes };
      await check(db.from("simple_funnel_addons").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", addon.id));
      return res.json({ status: changes.status });
    } catch (error) { return fail(res, error, "Approval could not be recorded."); }
  });

  app.post("/api/customer/simple-funnel-addon/cancel", authenticate, customer, async (req: any, res: any) => {
    try {
      const { data: addon } = await check(db.from("simple_funnel_addons").select("*")
        .eq("business_id", req.addonBusiness.id).maybeSingle());
      if (!addon || addon.mode !== "paid" || !addon.stripe_subscription_id || addon.status === "cancelled") {
        return res.status(409).json({ error: "No paid funnel subscription can be cancelled." });
      }
      const stripe = await getStripe();
      const subscription = await stripe.subscriptions.update(addon.stripe_subscription_id, { cancel_at_period_end: true });
      await check(db.from("simple_funnel_addons").update({
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end), updated_at: new Date().toISOString(),
      }).eq("id", addon.id));
      return res.json({ cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end) });
    } catch (error) { return fail(res, error, "Subscription cancellation could not be scheduled."); }
  });

  app.get("/api/admin/simple-funnel-addons", authenticate, superAdminOnly, async (_req: any, res: any) => {
    try {
      const [config, rows, businesses] = await Promise.all([
        loadSimpleFunnelAddonConfig(db),
        check(db.from("simple_funnel_addons").select("*").order("created_at", { ascending: false }).limit(300)),
        check(db.from("businesses").select("id,name,plan").limit(1000)),
      ]);
      const labels = new Map<string, { name?: string; plan?: string }>((businesses.data || []).map((item: any): [string, { name?: string; plan?: string }] => [item.id, item]));
      return res.json({ config, addons: (rows.data || []).map((item: any) => ({
        ...item, business_name: labels.get(item.business_id)?.name || item.business_id,
        business_plan: labels.get(item.business_id)?.plan || "",
      })) });
    } catch (error) { return fail(res, error, "Funnel fulfilment queue unavailable."); }
  });

  app.patch("/api/admin/simple-funnel-addons/config", authenticate, superAdminOnly, async (req: any, res: any) => {
    const body = z.object({
      enabled: z.boolean(), standardSetupUsd: z.number().min(0).max(9999),
      growthSetupUsd: z.number().min(0).max(9999), monthlyUsd: z.number().min(1).max(9999),
      includeGrowthPartner: z.boolean(),
    }).strict().safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid funnel prices or feature configuration." });
    try {
      const config = normalizeSimpleFunnelAddonConfig(body.data);
      await check(db.from("settings").upsert({
        id: "simple_funnel_addon", content: config, updated_at: new Date().toISOString(),
      }));
      await audit(db, req.user, "simple_funnel_addon.config_updated", { id: crypto.randomUUID(), offer_name: "Simple Funnel Pricing" }, config);
      return res.json({ config });
    } catch (error) { return fail(res, error, "Funnel configuration could not be saved."); }
  });

  app.post("/api/admin/simple-funnel-addons/:id/provision", authenticate, superAdminOnly, async (req: any, res: any) => {
    if (!uuid.safeParse(req.params.id).success) return res.status(400).json({ error: "Invalid add-on." });
    try {
      const { data: addon } = await check(db.from("simple_funnel_addons").select("*").eq("id", req.params.id).single());
      if (!["queued", "in_production"].includes(addon.status)) {
        return res.status(409).json({ error: "Only paid/included queued funnels can be created." });
      }
      if (addon.funnel_id) return res.json({ funnelId: addon.funnel_id, existing: true });
      const funnelId = crypto.randomUUID();
      const landingId = crypto.randomUUID();
      const thanksId = crypto.randomUUID();
      const { data: funnel } = await check(db.from("funnels").insert({
        id: funnelId, business_id: addon.business_id,
        name: addon.offer_name, slug: "simple-" + addon.id.slice(0, 8),
        objective: "lead", status: "draft", access_mode: "managed",
        template_key: "simple-two-page", description: addon.offer_description,
        settings: { indexable: false, simpleFunnelAddonId: addon.id }, created_by: req.user.id,
      }).select("id").single());
      const steps = [{
        id: landingId, funnel_id: funnel.id, business_id: addon.business_id,
        step_type: "lead_form", name: "Landing Page", slug: "start", sort_order: 0,
        position_x: 100, position_y: 160, is_entry: true, status: "draft",
        page_content: {
          eyebrow: "Get started", headline: addon.offer_name,
          subheadline: addon.offer_description, ctaLabel: "Send Enquiry",
          benefits: ["Clear next steps", "A direct response from the team", "No obligation"],
          fields: [
            { id: "name", name: "name", label: "Your name", type: "text", required: true },
            { id: "email", name: "email", label: "Email address", type: "email", required: true },
            { id: "phone", name: "phone", label: "Phone / WhatsApp", type: "tel" },
          ],
          theme: { primary: "#4f46e5", background: "#ffffff", text: "#141821" },
        }, settings: {},
      }, {
        id: thanksId, funnel_id: funnel.id, business_id: addon.business_id,
        step_type: "thank_you", name: "Thank You Page", slug: "thank-you", sort_order: 1,
        position_x: 400, position_y: 160, is_entry: false, status: "draft",
        page_content: {
          eyebrow: "Thank you", headline: "Your enquiry is on its way.",
          subheadline: "We have received your details and will be in touch.",
          ctaLabel: "Back to website",
        }, settings: {},
      }];
      await check(db.from("funnel_steps").insert(steps));
      await check(db.from("funnel_connections").insert({
        id: crypto.randomUUID(), funnel_id: funnel.id, business_id: addon.business_id,
        source_step_id: landingId, target_step_id: thanksId,
        condition_type: "always", condition_config: {}, priority: 0,
      }));
      await check(db.from("simple_funnel_addons").update({
        funnel_id: funnel.id, status: "in_production", updated_at: new Date().toISOString(),
      }).eq("id", addon.id));
      await audit(db, req.user, "simple_funnel_addon.provisioned", addon, { funnelId });
      return res.json({ funnelId, status: "in_production" });
    } catch (error) { return fail(res, error, "Funnel draft could not be provisioned. Inspect partial draft before retrying."); }
  });

  app.patch("/api/admin/simple-funnel-addons/:id/status", authenticate, superAdminOnly, async (req: any, res: any) => {
    if (!uuid.safeParse(req.params.id).success) return res.status(400).json({ error: "Invalid add-on." });
    const body = z.object({ status: adminState }).strict().safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid delivery status." });
    try {
      const { data: addon } = await check(db.from("simple_funnel_addons").select("*").eq("id", req.params.id).single());
      if (!addon.funnel_id || ["pending_payment", "payment_failed", "cancelled"].includes(addon.status)) {
        return res.status(409).json({ error: "A paid or included, provisioned funnel is required." });
      }
      const transitions: Record<string, string[]> = {
        in_production: ["queued", "revision_requested", "paused"],
        approval_required: ["in_production"],
        active: ["approved", "paused"],
        paused: ["active", "approved", "in_production"],
      };
      if (!(transitions[body.data.status] || []).includes(addon.status)) {
        return res.status(409).json({ error: "This delivery status transition is not allowed." });
      }
      if (body.data.status === "approval_required" || body.data.status === "active") {
        const { data: steps } = await check(db.from("funnel_steps").select("step_type")
          .eq("funnel_id", addon.funnel_id).order("sort_order"));
        if (steps?.length !== 2 || steps[0].step_type !== "lead_form" || steps[1].step_type !== "thank_you") {
          return res.status(409).json({ error: "Simple funnels must contain exactly one lead form and one thank-you page." });
        }
      }
      if (body.data.status === "active") {
        const { data: funnel } = await check(db.from("funnels").select("status")
          .eq("id", addon.funnel_id).single());
        if (funnel.status !== "published") {
          return res.status(409).json({ error: "Publish the approved funnel before activating delivery." });
        }
      }
      if (body.data.status === "paused") {
        await check(db.from("funnels").update({ status: "draft", published_at: null })
          .eq("id", addon.funnel_id));
        await check(db.from("funnel_steps").update({ status: "draft" }).eq("funnel_id", addon.funnel_id));
      }
      await check(db.from("simple_funnel_addons").update({
        status: body.data.status,
        ...(body.data.status === "active" ? { activated_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      }).eq("id", addon.id));
      await audit(db, req.user, "simple_funnel_addon.status_updated", addon, {
        previous: addon.status, next: body.data.status,
      });
      return res.json({ status: body.data.status });
    } catch (error) { return fail(res, error, "Funnel delivery state could not be changed."); }
  });
}
