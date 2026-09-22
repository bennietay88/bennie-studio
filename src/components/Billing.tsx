import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Pricing } from "./Pricing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Loader2,
  CreditCard,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Business } from "../types";
import { PLANS } from "../constants/plans";
import { cn } from "../lib/utils";
import { stripePublishableKey, holdsValidStripeKey } from "../lib/stripe";

export const Billing = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("success")) {
      toast.success("Payment successful! Your account is being updated.");
      // Remove query params from URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (urlParams.get("canceled")) {
      toast.error("Payment canceled.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // New accounts can reach billing before a business record exists. Keep
    // the page usable so they can select a plan and start checkout instead of
    // leaving the screen in an infinite loading state.
    if (!profile?.businessId) {
      setBusiness(null);
      setLoading(false);
      return;
    }

    const fetchBusiness = async () => {
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", profile.businessId)
          .single();

        if (error) throw error;

        // Map snake_case to camelCase
        const mappedBusiness: Business = {
          id: data.id,
          name: data.name,
          ownerId: data.owner_id,
          plan: data.plan,
          status: data.status,
          industry: data.industry,
          location: data.location,
          subdomain: data.subdomain,
          stripeCustomerId: data.stripe_customer_id,
          stripeSubscriptionId: data.stripe_subscription_id,
          subscriptionStatus: data.subscription_status,
          // Retained for backward-compatible business records; intentionally not shown to customers.
          aiCredits: data.ai_credits || 0,
          aiCreditsUsed: data.ai_credits_used || 0,
          trialEndsAt: data.trial_ends_at
            ? new Date(data.trial_ends_at).getTime()
            : 0,
          createdAt: data.created_at
            ? new Date(data.created_at).getTime()
            : Date.now(),
        };

        setBusiness(mappedBusiness);
      } catch (err) {
        console.error("Error fetching business:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [profile?.businessId]);

  const handleManageBilling = async () => {
    if (!business?.stripeCustomerId) {
      toast.error("No active subscription found");
      return;
    }

    setPortalLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: business.stripeCustomerId,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to create portal session");
      }
    } catch (error: any) {
      console.error("Portal error:", error);
      const message = error.message || "";
      if (
        message.includes("STRIPE_SECRET_KEY") ||
        message.includes("STRIPE_CONFIG_MISSING") ||
        message.includes("STRIPE_INVALID_KEY")
      ) {
        toast.error(
          "Payment system not configured or invalid key. Please contact the Support.",
        );
      } else {
        toast.error(message || "Failed to open billing portal");
      }
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isSubscribed = business?.subscriptionStatus === "active";
  const isTrialing = business?.subscriptionStatus === "trialing";
  const isLegacyTrialPlan = ["starter", "business", "growth", "scale"].includes(
    String(business?.plan || "").toLowerCase(),
  );
  const hasStripeSubscription = !!business?.stripeSubscriptionId;

  const handleEndTrialEarly = async () => {
    // This is now handled by picking a plan in the Pricing component,
    // which will use the trial_end in Stripe.
    // If they already have a subscription, this button shouldn't really be here
    // unless we want to manually end the trial in Stripe (which would start billing immediately).
    // The user wants to fulfill the trial, so we just let it run.
    toast.info(
      "Your trial is active. To commit to a plan, please select one below. Your billing will only start after the trial ends.",
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Billing & Subscription
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Manage your plan and payment methods.
        </p>
      </div>

      {/* Stripe Operational Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-slate-200 shadow-sm overflow-hidden bg-slate-50/50">
          <CardHeader className="py-4 px-6 border-b border-slate-200">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Merchant Status
            </h3>
          </CardHeader>
          <CardContent className="py-6 px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-3 w-3 rounded-full animate-pulse",
                  holdsValidStripeKey()
                    ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]",
                )}
              />
              <span className="text-sm font-bold text-slate-700">
                {holdsValidStripeKey()
                  ? "Live Connection"
                  : "Offline / Unconfigured"}
              </span>
            </div>
            {stripePublishableKey && (
              <Badge
                variant="outline"
                className="text-[9px] font-bold border-slate-200 text-slate-500"
              >
                {stripePublishableKey.startsWith("pk_test_")
                  ? "TEST MODE"
                  : "PRODUCTION"}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-slate-200 shadow-sm overflow-hidden bg-slate-50/50">
          <CardHeader className="py-4 px-6 border-b border-slate-200">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Security & Compliance
            </h3>
          </CardHeader>
          <CardContent className="py-6 px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-slate-600">
                PCI DSS Level 1 Compliant Payments via Stripe
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-4 w-px bg-slate-300 mx-2" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                SSL Secure
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLegacyTrialPlan && isTrialing && (
        <Card
          className={cn(
            "border-2",
            hasStripeSubscription
              ? "border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10"
              : "border-amber-100 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-900/10",
          )}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "p-2 rounded-xl text-white",
                    hasStripeSubscription ? "bg-emerald-500" : "bg-amber-500",
                  )}
                >
                  {hasStripeSubscription ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <AlertCircle className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {hasStripeSubscription
                      ? "Subscription Confirmed"
                      : "Legacy Access Period"}
                  </CardTitle>
                  <CardDescription>
                    {hasStripeSubscription
                      ? `Your paid subscription starts on ${new Date(business.trialEndsAt).toLocaleDateString()}`
                      : `Your existing access period ends on ${new Date(business.trialEndsAt).toLocaleDateString()}`}
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "border-2",
                  hasStripeSubscription
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
                )}
              >
                {hasStripeSubscription ? "COMMITTED" : "LEGACY ACCESS"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {hasStripeSubscription
                ? "Your subscription is confirmed and will follow the billing schedule already shown for this account."
                : "This account has an existing legacy access period. Choose a current service below if you want access to continue afterward."}
            </p>
            {!hasStripeSubscription && (
              <Button
                onClick={() => {
                  const pricingSection =
                    document.getElementById("pricing-plans");
                  pricingSection?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
              >
                View Current Services
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {isSubscribed ? (
        <Card className="border-2 border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl">Active Subscription</CardTitle>
                  <CardDescription className="capitalize">
                    You are currently on the {PLANS.find(p => p.id === (business?.plan as any))?.name || business?.plan} plan
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
              >
                {business?.subscriptionStatus?.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    Payment Method
                  </p>
                  <p className="text-xs text-slate-500">
                    Update your default payment method securely in Stripe
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={handleManageBilling}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Update Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-6 rounded-2xl flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-400">
              No Active Subscription
            </h3>
            <p className="text-amber-700 dark:text-amber-500 text-sm mb-4">
              Your account is currently in a trial or limited state. Choose a
              plan below to unlock all features and start growing your business.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 text-sm leading-6 text-slate-600">
        <span className="font-bold text-slate-900">Marketing Pro is included by plan entitlement.</span>{" "}
        There is no separate Marketing Pro subscription. Open Marketing Pro from the dashboard to see which growth capabilities are included in your current Bennie Studio plan.
      </div>

      <div id="pricing-plans" className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center">
          Available Plans
        </h2>
        <Pricing currentPlan={business?.plan} />
      </div>
    </div>
  );
};
