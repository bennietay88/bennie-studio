/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "./ui/card";
import {
  Gift,
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronRight,
  MoreVertical,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "./ui/input";

export function SuperAdminAffiliates() {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [program, setProgram] = useState<any>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalAffiliates: 0,
    pendingPayouts: 0,
    totalPaid: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const { count: affCount } = await supabase
        .from("affiliates")
        .select("*", { count: "exact", head: true });

      const { data: sessionData } = await supabase.auth.getSession();
      const unpaidResponse = await fetch("/api/admin/affiliates/unpaid-total", {
        headers: { Authorization: `Bearer ${sessionData.session?.access_token || ""}` },
      });
      if (!unpaidResponse.ok) throw new Error("Unable to load unpaid affiliate earnings");
      const { unpaidTotal } = await unpaidResponse.json();
      const { data: paidSum } = await supabase
        .from("affiliate_payouts")
        .select("amount")
        .eq("status", "processed");

      setStats({
        totalAffiliates: affCount || 0,
        pendingPayouts: unpaidTotal || 0,
        totalPaid: paidSum?.reduce((acc, p) => acc + p.amount, 0) || 0,
      });

      // 2. Fetch Pending Payouts
      const { data: pendingPayouts } = await supabase
        .from("affiliate_payouts")
        .select(
          `
          *,
          affiliates (
            referral_code,
            profiles (email)
          )
        `,
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (pendingPayouts) setPayouts(pendingPayouts);

      const { data: platformProgram } = await supabase
        .from("affiliate_programs")
        .select("*, commission_tiers(*)")
        .eq("is_platform_program", true)
        .maybeSingle();
      setProgram(platformProgram);
      setTiers(
        [...(platformProgram?.commission_tiers || [])].sort(
          (a, b) => Number(a.requirement_value || 0) - Number(b.requirement_value || 0),
        ),
      );
    } catch (error) {
      console.error("Error fetching admin affiliate data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processPayout = async (payoutId: string) => {
    try {
      const { error } = await supabase
        .from("affiliate_payouts")
        .update({
          status: "processed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", payoutId);

      if (error) throw error;
      toast.success("Payout marked as processed");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to process payout: " + error.message);
    }
  };

  const updateTier = (id: string, key: string, value: any) => {
    setTiers((current) =>
      current.map((tier) => (tier.id === id ? { ...tier, [key]: value } : tier)),
    );
  };

  const saveTier = async (tier: any) => {
    try {
      const { error } = await supabase
        .from("commission_tiers")
        .update({
          name: tier.name,
          commission_rate: Number(tier.commission_rate || 0),
          requirement_type: tier.requirement_type || "referral_count",
          requirement_value: Number(tier.requirement_value || 0),
          commission_type: tier.commission_type || "percentage",
          fixed_commission_amount: Number(tier.fixed_commission_amount || 0),
          minimum_referral_count: Number(tier.minimum_referral_count || tier.requirement_value || 0),
          minimum_sales_volume: Number(tier.minimum_sales_volume || 0),
          is_recurring: Boolean(tier.is_recurring),
          commission_duration_months: tier.commission_duration_months
            ? Number(tier.commission_duration_months)
            : null,
        })
        .eq("id", tier.id);

      if (error) throw error;
      toast.success("Affiliate tier saved");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to save tier: " + error.message);
    }
  };

  const createTier = async () => {
    if (!program?.id) {
      toast.error("Platform affiliate program is not available. Run the migration first.");
      return;
    }

    try {
      const { error } = await supabase.from("commission_tiers").insert({
        program_id: program.id,
        name: "New Affiliate Tier",
        commission_rate: 0.1,
        requirement_type: "referral_count",
        requirement_value: 0,
        commission_type: "percentage",
        fixed_commission_amount: 0,
      });
      if (error) throw error;
      toast.success("Affiliate tier created");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to create tier: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-600 mr-2" />
        <span className="text-slate-500 font-medium tracking-wide uppercase text-[10px]">
          Loading Network Data...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Financial & Partners
          </h1>
          <p className="text-slate-500 mt-1">
            Global affiliate management and payout processing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold">
              <Users className="h-4 w-4 text-indigo-500" /> Active Affiliates
            </CardDescription>
            <CardTitle className="text-3xl font-black">
              {stats.totalAffiliates}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-2xl border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold">
              <Clock className="h-4 w-4 text-amber-500" /> Pending Obligations
            </CardDescription>
            <CardTitle className="text-3xl font-black">
              ${stats.pendingPayouts.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-2xl border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Global Paid
              Out
            </CardDescription>
            <CardTitle className="text-3xl font-black">
              ${stats.totalPaid.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="rounded-2xl border-slate-200 overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">
              Platform Affiliate Commission Tiers
            </CardTitle>
            <CardDescription className="text-xs">
              Configure commission tiers for affiliates promoting Bennie Studio website subscription plans.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" className="rounded-lg" onClick={createTier}>
            <Gift className="mr-2 h-3 w-3" /> Add Tier
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3">Tier Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Rate / Fixed</th>
                  <th className="px-5 py-3">Qualification</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tiers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      Run the platform affiliate migration to create default tiers.
                    </td>
                  </tr>
                ) : (
                  tiers.map((tier) => (
                    <tr key={tier.id}>
                      <td className="px-5 py-3">
                        <Input
                          value={tier.name || ""}
                          onChange={(e) => updateTier(tier.id, "name", e.target.value)}
                          className="h-9 min-w-40"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={tier.commission_type || "percentage"}
                          onChange={(e) => updateTier(tier.id, "commission_type", e.target.value)}
                          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                        >
                          <option value="percentage">Percentage</option>
                          <option value="fixed">Fixed</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={tier.commission_rate || 0}
                            onChange={(e) => updateTier(tier.id, "commission_rate", e.target.value)}
                            className="h-9 w-24"
                            title="Percentage rate as decimal, e.g. 0.15 for 15%"
                          />
                          <Input
                            type="number"
                            step="1"
                            value={tier.fixed_commission_amount || 0}
                            onChange={(e) => updateTier(tier.id, "fixed_commission_amount", e.target.value)}
                            className="h-9 w-24"
                            title="Fixed commission amount"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={tier.requirement_type || "referral_count"}
                            onChange={(e) => updateTier(tier.id, "requirement_type", e.target.value)}
                            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                          >
                            <option value="referral_count">Referral count</option>
                            <option value="revenue_generated">Sales volume</option>
                            <option value="total_sales">Total sales</option>
                          </select>
                          <Input
                            type="number"
                            value={tier.requirement_value || 0}
                            onChange={(e) => updateTier(tier.id, "requirement_value", e.target.value)}
                            className="h-9 w-24"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Input
                          type="number"
                          placeholder="Months"
                          value={tier.commission_duration_months || ""}
                          onChange={(e) => updateTier(tier.id, "commission_duration_months", e.target.value)}
                          className="h-9 w-24"
                        />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button size="sm" className="h-9 rounded-lg" onClick={() => saveTier(tier)}>
                          <Save className="mr-2 h-3 w-3" /> Save
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">
              Pending Payout Requests
            </CardTitle>
            <CardDescription className="text-xs">
              Process requested withdrawals from affiliate partners.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-lg h-8">
              <Filter className="h-3 w-3 mr-2" /> Filter
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100 uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-6 py-4">Affiliate</th>
                <th className="px-6 py-4">Request Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payouts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400 italic"
                  >
                    No pending payout requests at this time.
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">
                          {p.affiliates?.referral_code}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {(p.affiliates?.profiles as any)?.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-black">
                      ${p.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-[10px]">
                        {p.payment_method || "Standard"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200"
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        onClick={() => processPayout(p.id)}
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-700 h-8 text-xs px-4"
                      >
                        Approve & Mark Paid
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
