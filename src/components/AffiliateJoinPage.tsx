/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Gift,
  Globe,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/contexts/AuthContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { generateId } from "@/src/lib/utils";
import { motion } from "motion/react";

const defaultProgram = {
  is_enabled: true,
  base_commission_rate: 0.1,
  cookie_duration_days: 30,
  payout_minimum: 50,
};

export default function AffiliateJoinPage() {
  const { businessId } = useParams<{ businessId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [program, setProgram] = useState<any>(defaultProgram);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("");

  useEffect(() => {
    fetchProgramDetails();
  }, [businessId, user?.id]);

  const fetchProgramDetails = async () => {
    setLoading(true);
    try {
      const query = supabase.from("affiliate_programs").select("*");
      const { data: progData } = businessId
        ? await query.eq("business_id", businessId).maybeSingle()
        : await query.eq("is_platform_program", true).maybeSingle();

      setProgram(progData || defaultProgram);

      if (user?.id) {
        const existingQuery = supabase
          .from("affiliates")
          .select("*")
          .eq("uid", user.id);
        const { data: existing } = businessId
          ? await existingQuery.eq("business_id", businessId).maybeSingle()
          : await existingQuery.is("business_id", null).maybeSingle();

        if (existing) {
          toast.info("You already have an affiliate account.");
          navigate(`/dashboard/affiliate/dashboard?affiliate=${existing.id}`);
        }
      }
    } catch (err) {
      console.error("Error fetching affiliate program details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      toast.error("Please login or create an account to join the affiliate program.");
      navigate("/affiliate/signup", {
        state: { redirectTo: window.location.pathname },
      });
      return;
    }

    if (program?.is_enabled === false || program?.isEnabled === false) {
      toast.error("This affiliate program is currently inactive.");
      return;
    }

    setJoining(true);
    try {
      const code =
        referralCode.trim() || `BENNIE-${generateId().slice(0, 8).toUpperCase()}`;
      const applicationId = generateId();

      const { error } = await supabase.from("affiliates").insert({
        id: applicationId,
        uid: user.id,
        business_id: businessId || null,
        referral_code: code.toUpperCase().replace(/\s/g, ""),
        status: "pending",
        payout_method: payoutMethod || null,
        total_earnings: 0,
        unpaid_earnings: 0,
        total_referrals: 0,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Affiliate application submitted for approval.");
      navigate(`/dashboard/affiliate/dashboard?affiliate=${applicationId}`);
    } catch (err) {
      console.error("Error joining affiliate program:", err);
      toast.error("Failed to apply. The referral code might already be taken.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
        Loading affiliate program...
      </div>
    );
  }

  if (program?.is_enabled === false || program?.isEnabled === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-md space-y-6 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Program Not Available</CardTitle>
          <CardDescription>
            The affiliate program is currently not accepting applications.
          </CardDescription>
          <Button variant="outline" className="w-full rounded-full" onClick={() => navigate("/")}>
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid w-full max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-2"
      >
        <div className="space-y-8">
          <div className="space-y-4">
            <Badge className="rounded-full bg-indigo-50 px-4 py-1 text-indigo-700 hover:bg-indigo-50">
              Bennie Studio Affiliate Program
            </Badge>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
              Promote Our Website Subscription Platform and Earn Commission
            </h1>
            <p className="text-base leading-relaxed text-slate-600 md:text-xl">
              Join the affiliate program, share your referral link, and earn commission
              when businesses subscribe to our managed website plans.
            </p>
          </div>

          <div className="space-y-5">
            {[
              [Gift, "Promote Bennie Studio", "Refer businesses to our managed website subscription plans."],
              [TrendingUp, "Commission tiers", "Superadmin-managed tiers reward affiliates as sales volume grows."],
              [ShieldCheck, "Tracked journey", "Clicks, signups, paying customers, commissions, and payouts are tracked."],
            ].map(([Icon, title, description]: any) => (
              <div key={title} className="flex items-start gap-4">
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <Icon className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{title}</h3>
                  <p className="text-slate-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden rounded-3xl border-none bg-white/90 shadow-2xl">
          <CardHeader className="bg-slate-950 p-8 text-white">
            <CardTitle className="text-2xl">Apply to Become an Affiliate</CardTitle>
            <CardDescription className="text-slate-300">
              Applications are reviewed before commissions become active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-8">
            {!user ? (
              <div className="flex flex-col items-center space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-center">
                <UserPlus className="h-10 w-10 text-indigo-600" />
                <div>
                  <h4 className="font-bold text-slate-900">Account Required</h4>
                  <p className="text-sm text-slate-600">
                    Create an affiliate account before submitting your application.
                  </p>
                </div>
                <Button
                  className="h-12 w-full rounded-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => navigate("/affiliate/signup", { state: { redirectTo: window.location.pathname } })}
                >
                  Login / Sign Up to Continue
                </Button>
              </div>
            ) : (
              <form onSubmit={handleJoin} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Display Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={user.email || ""} disabled className="h-12 border-slate-200 bg-slate-50 pl-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Custom Referral Code (Optional)
                  </Label>
                  <Input
                    placeholder="e.g. BENNIEPARTNER"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                    className="h-12 border-slate-200"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Your link will look like: {window.location.origin}/?ref={referralCode || "AUTO"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Payout Method (Optional)
                  </Label>
                  <Input
                    placeholder="Bank transfer, PayPal, Wise, etc."
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    className="h-12 border-slate-200"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                  I agree to promote Bennie Studio ethically and avoid self-referrals.
                </div>

                <Button
                  type="submit"
                  className="h-14 w-full rounded-2xl bg-indigo-600 text-base font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
                  disabled={joining}
                >
                  {joining ? "Submitting..." : "Apply to Join"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-center border-t border-slate-100 bg-slate-50 p-6">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Globe className="h-3 w-3" />
              <span>Promote Bennie Studio managed website subscriptions</span>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
