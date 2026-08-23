import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Check, Zap, Star, Loader2, Rocket } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { PLANS as STATIC_PLANS, Plan, activePlans, normalizePlans } from "../constants/plans";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { useGeoPricing } from "../hooks/useGeoPricing";
import { trackPinterestCheckout, trackPinterestSignup } from "../lib/pinterestTracking";
import { GROWTH_PLAN_POSITIONING, MONTHLY_MANAGED_SERVICE_RITUAL } from "../constants/businessStrategy";

interface PricingProps {
  currentPlan?: string;
  onSelectPlan?: (plan: any) => void;
  isDashboard?: boolean;
  onDark?: boolean;
}

const mapPlanTableRows = (tablePlans: any[]): Plan[] =>
  activePlans(
    [...tablePlans]
      .sort((a: any, b: any) => {
        const aOrder = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : Number.MAX_SAFE_INTEGER;
        const bOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return Number(a.price_usd || 0) - Number(b.price_usd || 0);
      })
      .map((plan: any) => ({
      id: plan.slug || plan.name?.toLowerCase()?.replace(/[^a-z0-9]+/g, "_"),
      name: plan.name,
      source: "plans_table",
      price: `$${Number(plan.price_usd || 0).toFixed(0)}`,
      description: plan.description || `${plan.name} website subscription plan`,
      aiCredits: plan.monthly_credit_limit ?? 0,
      maxPages: plan.project_limit ?? 1,
      maxLocationPages: plan.location_page_limit ?? 0,
      monthlyUpdates: plan.monthly_update_allowance || plan.monthly_updates || "Monthly update support",
      upgradePrompt: plan.upgrade_prompt || "Upgrade to unlock more pages and growth tools.",
      enabled_features: Array.isArray(plan.enabled_features) ? plan.enabled_features : [],
      features: Array.isArray(plan.features) ? plan.features : [],
      isPopular: !!plan.is_popular,
      isActive: plan.is_active !== false,
      priceId: plan.stripe_price_id || "",
      productId: plan.stripe_product_id || "",
      yearlyPriceId: plan.yearly_stripe_price_id || plan.yearly_price_id || "",
    })),
  );

const withCustomerFacingPlanNames = (plans: Plan[]) =>
  plans.map((plan) =>
    plan.id === "business" ? { ...plan, name: "Business" } : plan,
  );

export const Pricing: React.FC<PricingProps> = ({
  currentPlan,
  onSelectPlan,
  isDashboard,
  onDark = false,
}) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const geoPricing = useGeoPricing();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );

  React.useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch("/api/public/site-config");
        if (!response.ok) throw new Error("Public plans are unavailable");
        const config = await response.json();
        const tablePlans = config?.plans;

        if (Array.isArray(tablePlans) && tablePlans.length > 0) {
          setPlans(withCustomerFacingPlanNames(mapPlanTableRows(tablePlans)));
          return;
        }

        if (Array.isArray(config?.legacyPricing)) {
          setPlans(withCustomerFacingPlanNames(activePlans(normalizePlans(config.legacyPricing))));
        } else {
          setPlans(withCustomerFacingPlanNames(activePlans(STATIC_PLANS)));
        }
      } catch (err) {
        setPlans(withCustomerFacingPlanNames(activePlans(STATIC_PLANS)));
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleSelect = async (plan: any) => {
    if (onSelectPlan) {
      onSelectPlan(plan);
      return;
    }

    const checkoutIntent = { planId: plan.id, billingCycle, savedAt: new Date().toISOString() };
    localStorage.setItem("bt_checkout_intent", JSON.stringify(checkoutIntent));

    if (!profile) {
      trackPinterestSignup("pricing_signup_intent", {
        plan: plan.name || plan.id || "unknown",
      });
      navigate("/signup?redirectTo=%2Fdashboard%2Fonboarding");
      return;
    }

    const priceId = billingCycle === "yearly"
      ? plan.yearlyPriceId || plan.yearly_price_id
      : plan.priceId ||
      plan.stripe_price_id ||
      plan.stripePriceId ||
      plan.monthlyPriceId ||
      plan.monthly_price_id;

    if (!priceId || !String(priceId).startsWith("price_")) {
      toast.error(
        `${plan.name} is missing a valid Stripe Price ID. Configure this plan in Super Admin > Billing Plans.`,
      );
      return;
    }

    if (!profile.businessId) {
      toast.info("Complete the business setup first. Your selected plan has been saved.");
      navigate("/dashboard/onboarding");
      return;
    }

    // Stripe logic for platform plans
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;

      if (!token) {
        toast.error("You must be logged in to start checkout.");
        return;
      }

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId,
          businessId: profile.businessId,
          customerEmail: profile.email,
          couponId: geoPricing.couponId,
          type: "subscription",
          planId: plan.id,
          billingCycle,
        }),
      });

      const stripeSession = await response.json();
      if (stripeSession.url) {
        trackPinterestCheckout("subscription_checkout", {
          plan: plan.name || plan.id || "unknown",
          billing_cycle: billingCycle,
        });
        window.location.href = stripeSession.url;
      }
      else throw new Error(stripeSession.error || "Failed to create checkout session");
    } catch (error: any) {
      toast.error(error.message || "Payment process failed");
    }
  };

  const calculatePrice = (planPrice: string) => {
    const numericPrice = Number(String(planPrice).replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) return planPrice;

    return geoPricing.formatUsd(planPrice, {
      yearlyMonthlyAverage: billingCycle === "yearly",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-10">
      <div className="flex flex-col items-center gap-6 mb-8">
        <div className="flex flex-col items-center gap-2 text-center max-w-2xl px-4">
          <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50 mb-3 px-4 py-1 font-black">
            Basic Website Plans
          </Badge>
          <h2 className={cn(
            "text-4xl sm:text-6xl font-black tracking-tighter uppercase italic",
            onDark ? "text-white" : "text-slate-900 dark:text-white",
          )}>
            Choose Your Starting Plan
          </h2>
          <p className={cn(
            "text-lg font-medium leading-relaxed",
            onDark ? "text-slate-300" : "text-slate-500",
          )}>
            {GROWTH_PLAN_POSITIONING.description}
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex items-center p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                billingCycle === "monthly" ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-md" : "text-slate-400"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                billingCycle === "yearly" ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-md" : "text-slate-400"
              )}
            >
              Yearly
              <Badge className="bg-emerald-500 text-white text-[10px] border-none px-2 py-0">SAVE UP TO 20%</Badge>
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-indigo-100 bg-indigo-50/80 p-5 shadow-sm dark:border-indigo-500/20 dark:bg-indigo-950/30 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-200">Default recommendation</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{GROWTH_PLAN_POSITIONING.headline}</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {MONTHLY_MANAGED_SERVICE_RITUAL.slice(0, 4).map((item) => (
              <div key={item} className="flex gap-2 rounded-2xl bg-white/80 p-3 dark:bg-white/10">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                <p className="text-xs font-bold leading-5 text-slate-700 dark:text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan, index) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            price={calculatePrice(plan.price)}
            index={index}
            billingCycle={billingCycle}
            onSelect={() => handleSelect(plan)}
            isPopular={plan.isPopular}
            isDashboard={isDashboard}
            geoPricing={geoPricing}
          />
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Enquiry-first structure", "Pages are planned around WhatsApp enquiries, quote requests, bookings, and contact forms."],
            ["Plan limits protect quality", "Pages, monthly edits, and growth support are limited by plan so delivery stays sustainable."],
            ["Custom website quote", "CMS control, blogs, advanced SEO, ecommerce, and integrations are handled as premium custom website projects."],
          ].map(([title, copy]) => (
            <div key={title} className="flex gap-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{title}</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const getPlanHighlights = (plan: Plan) => {
  const identity = `${plan.id || ""} ${plan.name || ""}`.toLowerCase();
  if (identity.includes("starter") || identity.includes("launch")) {
    return {
      bestFor: "Entry path for a fast one-page lead website.",
      included: [
        "1-page lead website",
        "Hosting and SSL",
        "Contact form + WhatsApp",
        "Basic SEO setup",
      ],
    };
  }
  if (identity.includes("scale") || identity.includes("authority") || identity.includes("premium")) {
    return {
      bestFor: "Upgrade path for landing pages, local expansion, and priority support.",
      included: [
        "Up to 5 managed pages",
        "Landing + location pages",
        "Enquiry tracking + monthly report",
        "6 monthly updates + priority support",
      ],
    };
  }
  return {
    bestFor: "Recommended default for service businesses that need trust, services, and enquiry flow.",
    included: [
      "Home, Services + Contact",
      "WhatsApp + lead capture",
      "Local SEO + trust sections",
      "3 monthly managed updates",
    ],
  };
};

const PricingCard = ({
  plan,
  price,
  index,
  billingCycle,
  onSelect,
  isPopular,
  isDashboard,
  isCustom,
  geoPricing
}: any) => {
  const planHighlights = getPlanHighlights(plan);
  // Pricing cards show only the essentials. The complete feature list remains
  // on the plan record for checkout, entitlements, and admin configuration.
  const includedFeatures = planHighlights.included;
  const description = plan.description || planHighlights.bestFor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -10 }}
      className="flex flex-col group h-full"
    >
      <div
        className={cn(
          "relative flex-1 flex flex-col p-6 sm:p-7 rounded-[2rem] transition-all duration-500 h-full",
          isPopular
            ? "bg-slate-900 text-white shadow-2xl ring-4 ring-indigo-600/30"
            : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-100 dark:border-white/5 shadow-xl hover:border-indigo-100"
        )}
      >
        {isPopular && (
          <div className="absolute top-0 right-10 -translate-y-1/2">
            <div className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2.5 rounded-full shadow-xl">
              Best Value
            </div>
          </div>
        )}

        <div className="mb-7">
          <div className="flex items-center justify-between mb-6">
            <div
              className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
                isPopular
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600"
              )}
            >
              {isCustom ? <Star className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
            </div>
            {geoPricing?.hasGeoDiscount && !isCustom && (
              <Badge className="bg-emerald-500 text-white border-none text-[10px] font-black px-3 py-1">
                {geoPricing.discountPercentage}% LOCAL SAVINGS
              </Badge>
            )}
          </div>

          <h3 className={cn(
            "text-2xl font-black mb-2 tracking-tight",
            isPopular ? "text-white" : "text-slate-950"
          )}>{plan.name}</h3>
          <p className={cn(
            "text-sm font-medium leading-relaxed mb-5 min-h-[44px]",
            isPopular ? "text-slate-300" : "text-slate-500"
          )}>
            {description}
          </p>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tighter">{price}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
              {isCustom ? "project" : `/ ${billingCycle === "yearly" ? "month" : "month"}`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-7">
          <div className={cn(
            "rounded-2xl p-3",
            isPopular ? "bg-white/15" : "bg-slate-50 dark:bg-white/5",
          )}>
            <p className={cn(
              "text-[9px] font-black uppercase tracking-widest",
              isPopular ? "text-slate-300" : "text-slate-400",
            )}>Pages</p>
            <p className={cn(
              "mt-1 text-sm font-black",
              isPopular ? "text-white" : "text-slate-900 dark:text-white",
            )}>{plan.maxPages ? `Up to ${plan.maxPages}` : "Custom"}</p>
          </div>
          <div className={cn(
            "rounded-2xl p-3",
            isPopular ? "bg-white/15" : "bg-slate-50 dark:bg-white/5",
          )}>
            <p className={cn(
              "text-[9px] font-black uppercase tracking-widest",
              isPopular ? "text-slate-300" : "text-slate-400",
            )}>Locations</p>
            <p className={cn(
              "mt-1 text-sm font-black",
              isPopular ? "text-white" : "text-slate-900 dark:text-white",
            )}>{plan.maxLocationPages ? `Up to ${plan.maxLocationPages}` : "Primary"}</p>
          </div>
        </div>

        <div className="flex-1 space-y-5 mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Included
          </p>
          <ul className="space-y-3">
            {includedFeatures.length === 0 && (
              <li className="text-sm font-bold leading-tight text-slate-500 dark:text-slate-400">
                Included items are being updated.
              </li>
            )}
            {includedFeatures.map((feature: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-1 h-4 w-4 shrink-0 rounded-full flex items-center justify-center",
                    isPopular ? "bg-indigo-600/20 text-indigo-400" : "bg-emerald-50 text-emerald-600"
                  )}
                >
                  <Check className="h-2.5 w-2.5 stroke-[4]" />
                </div>
                <span className={cn(
                  "text-sm font-bold leading-tight",
                  isPopular ? "text-slate-300" : "text-slate-600 dark:text-slate-400"
                )}>
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Button
          size="lg"
          onClick={onSelect}
          data-testid={`plan-checkout-${String(plan.id || plan.name || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          className={cn(
            "w-full h-14 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-500 shadow-xl",
            isPopular
              ? "bg-indigo-600 hover:bg-indigo-500 text-white"
              : "bg-indigo-50 dark:bg-indigo-800/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
          )}
        >
          {isCustom ? "Apply Now" : "Start Lead Website"}
          <Rocket className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};
