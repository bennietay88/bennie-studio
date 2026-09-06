/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Gift,
  Loader2,
  MousePointer2,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { toast } from "sonner";

const currency = (value: number | string | null | undefined) =>
  `$${Number(value || 0).toFixed(2)}`;

export function AffiliateDashboard() {
  const { user } = useAuth();
  const [affiliate, setAffiliate] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const referralLink =
    affiliate?.referral_code && typeof window !== "undefined"
      ? `${window.location.origin}/?ref=${affiliate.referral_code}`
      : "";

  useEffect(() => {
    if (user?.id) fetchAffiliateData();
  }, [user?.id]);

  const fetchAffiliateData = async () => {
    setLoading(true);
    try {
      const { data: affiliates, error: affiliateError } = await supabase
        .from("affiliates")
        .select("*")
        .eq("uid", user?.id)
        .order("created_at", { ascending: false });

      if (affiliateError) throw affiliateError;

      const platformAffiliate =
        affiliates?.find((item) => !item.business_id) || affiliates?.[0] || null;
      setAffiliate(platformAffiliate);

      if (!platformAffiliate) {
        setLoading(false);
        return;
      }

      const [programRes, referralRes, payoutRes] = await Promise.all([
        supabase
          .from("affiliate_programs")
          .select("*, commission_tiers(*)")
          .eq("is_platform_program", true)
          .maybeSingle(),
        supabase
          .from("affiliate_referrals")
          .select("*")
          .eq("affiliate_id", platformAffiliate.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("affiliate_payouts")
          .select("*")
          .eq("affiliate_id", platformAffiliate.id)
          .order("created_at", { ascending: false }),
      ]);

      setProgram(programRes.data);
      setTiers(
        [...(programRes.data?.commission_tiers || [])].sort(
          (a, b) => Number(a.requirement_value || 0) - Number(b.requirement_value || 0),
        ),
      );
      setReferrals(referralRes.data || []);
      setPayouts(payoutRes.data || []);
    } catch (err) {
      console.error("Error fetching affiliate dashboard:", err);
      toast.error("Failed to load affiliate dashboard");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const clicks = referrals.filter((item) => item.event_type === "click").length;
    const signups = referrals.filter((item) => item.event_type === "signup").length;
    const payingCustomers = referrals.filter(
      (item) => item.status === "converted" || item.event_type === "paid_subscription",
    ).length;
    const approvedCommission = referrals
      .filter((item) => item.commission_status === "approved" || item.status === "converted")
      .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);
    const paidCommission = payouts
      .filter((item) => item.status === "processed")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pendingPayout = payouts
      .filter((item) => item.status === "pending")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      clicks,
      signups,
      payingCustomers,
      conversionRate: clicks > 0 ? (payingCustomers / clicks) * 100 : 0,
      approvedCommission,
      paidCommission,
      pendingPayout,
    };
  }, [referrals, payouts]);

  const currentTier = useMemo(() => {
    if (!tiers.length) return null;
    return [...tiers]
      .reverse()
      .find((tier) => Number(affiliate?.total_referrals || 0) >= Number(tier.requirement_value || 0));
  }, [tiers, affiliate?.total_referrals]);

  const nextTier = useMemo(() => {
    if (!tiers.length) return null;
    return tiers.find(
      (tier) => Number(tier.requirement_value || 0) > Number(affiliate?.total_referrals || 0),
    );
  }, [tiers, affiliate?.total_referrals]);

  const copyRefLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied");
  };

  const handleRequestPayout = async () => {
    if (!affiliate) return;
    const minimum = Number(program?.payout_minimum || 50);
    const amount = Number(affiliate.unpaid_earnings || 0);

    if (amount < minimum) {
      toast.error(`Minimum payout is ${currency(minimum)}`);
      return;
    }

    setRequestingPayout(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch("/api/affiliate/request-payout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token || ""}`,
        },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Payout request failed");
      toast.success("Payout request submitted");
      fetchAffiliateData();
    } catch (error: any) {
      toast.error(error.message || "Failed to request payout");
    } finally {
      setRequestingPayout(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-indigo-600" />
        Loading affiliate dashboard...
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-center">
        <AlertCircle className="h-12 w-12 text-slate-300" />
        <h2 className="text-xl font-bold">Join the Bennie Studio Affiliate Program</h2>
        <p className="max-w-md text-muted-foreground">
          Promote our managed website subscription plans and earn commission when
          referred businesses become paying customers.
        </p>
        <Button
          className="rounded-full bg-indigo-600 hover:bg-indigo-700"
          onClick={() => {
            window.location.href = "/affiliate/join";
          }}
        >
          Apply to Join
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Badge className="mb-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
            Bennie Studio Partner Program
          </Badge>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-4xl">
            Promote Our Website Subscription Platform and Earn Commission
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 md:text-base">
            Share your referral link with businesses that need a managed website.
            We track clicks, signups, paying customers, commission, and payout status.
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            affiliate.status === "active"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : affiliate.status === "pending"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-red-200 bg-red-50 text-red-700"
          }
        >
          Status: {String(affiliate.status || "pending").toUpperCase()}
        </Badge>
      </div>

      {affiliate.status !== "active" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-800">
            <Clock className="mt-0.5 h-4 w-4" />
            <p>
              Your affiliate account is not active yet. Referral links are visible,
              but commissions are only counted after superadmin approval.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-none bg-gradient-to-br from-indigo-600 to-slate-950 text-white shadow-sm">
        <CardHeader>
          <CardTitle>Your Platform Referral Link</CardTitle>
          <CardDescription className="text-indigo-100">
            Send prospects to the Bennie Studio sales page. This is not for promoting
            your own products or customer websites.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="break-all rounded-2xl border border-white/20 bg-white/10 p-4 font-mono text-xs font-bold">
            {referralLink}
          </div>
          <Button variant="secondary" className="rounded-xl" onClick={copyRefLink}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
            onClick={() => window.open(referralLink, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="mr-2 h-4 w-4" /> Open
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Clicks", stats.clicks, MousePointer2],
          ["Total Signups", stats.signups, Users],
          ["Paying Customers", stats.payingCustomers, ShoppingCart],
          ["Conversion Rate", `${stats.conversionRate.toFixed(1)}%`, TrendingUp],
        ].map(([label, value, Icon]: any) => (
          <Card key={label} className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                {label}
              </CardDescription>
              <CardTitle className="flex items-center justify-between text-3xl font-black">
                {value}
                <Icon className="h-5 w-5 text-indigo-500" />
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
              Estimated Commission
            </CardDescription>
            <CardTitle className="text-3xl font-black text-indigo-600">
              {currency(affiliate.total_earnings)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
              Approved Commission
            </CardDescription>
            <CardTitle className="text-3xl font-black">
              {currency(stats.approvedCommission)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
              Paid Commission
            </CardDescription>
            <CardTitle className="text-3xl font-black">
              {currency(stats.paidCommission)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
              Pending Payout
            </CardDescription>
            <CardTitle className="text-3xl font-black">
              {currency(stats.pendingPayout || affiliate.unpaid_earnings)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              size="sm"
              className="w-full rounded-xl"
              disabled={requestingPayout || affiliate.status !== "active"}
              onClick={handleRequestPayout}
            >
              {requestingPayout ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request Payout"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Referral Activity</CardTitle>
            <CardDescription>
              Audit trail for clicks, signups, paid subscriptions, commission, and payout status.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                      No referral events yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  referrals.slice(0, 20).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6 font-medium">
                        {item.event_type || "referral"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{item.plan_slug || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.commission_status || item.status}</Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right font-bold">
                        {currency(item.commission_amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-indigo-600" /> Commission Tier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Current Tier
                </div>
                <div className="mt-1 text-xl font-black">
                  {currentTier?.name || "Starter Affiliate"}
                </div>
                <div className="text-slate-500">
                  {currentTier?.commission_type === "fixed"
                    ? `${currency(currentTier.fixed_commission_amount)} per sale`
                    : `${Number((currentTier?.commission_rate || program?.base_commission_rate || 0.1) * 100).toFixed(0)}% commission`}
                </div>
              </div>
              {nextTier ? (
                <p className="text-slate-600">
                  Next tier: <strong>{nextTier.name}</strong> after{" "}
                  {Number(nextTier.requirement_value || 0) - Number(affiliate.total_referrals || 0)} more
                  paying referrals.
                </p>
              ) : (
                <p className="text-slate-600">You are already on the highest configured tier.</p>
              )}
              <div className="flex items-center gap-2 text-slate-600">
                <Wallet className="h-4 w-4" />
                Payout method: {affiliate.payout_method || "Not set"}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Marketing Assets</CardTitle>
              <CardDescription>Use these angles when promoting Bennie Studio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              {[
                "Promote a professionally managed website from US$2,490/month.",
                "Managed website subscription for small businesses.",
                "Hosting, maintenance, and enquiry paths are managed for the customer.",
                "Custom Website quotes are available for bespoke requirements.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
