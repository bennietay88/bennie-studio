/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  ArrowRight,
  X,
  Gift,
  TrendingUp,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Mail,
  Lock,
  UserPlus,
  LogIn,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

export default function AffiliateAuthPage() {
  const {
    signInWithEmail,
    signUpWithEmail,
    user,
    error,
    clearError,
    isSigningIn,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignUp, setIsSignUp] = useState(
    location.pathname.includes("signup"),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // If already logged in, redirect to wherever they were going or dashboard
  React.useEffect(() => {
    if (user) {
      const requested = (location.state as any)?.redirectTo;
      const from = typeof requested === "string" && requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
      navigate(from);
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      if (!agreedToTerms) {
        toast.error("Please agree to the Affiliate Partners Terms of Service");
        return;
      }
      await signUpWithEmail(email, password, "affiliate");
    } else {
      await signInWithEmail(email, password);
    }
  };

  return (
    <div className="brand-public min-h-screen bg-[#f8f8f5] flex flex-col text-[#15191f] lg:flex-row">
      {/* Left Side: Branding & Info */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-[#101c36] p-7 text-white sm:p-10 lg:w-5/12 lg:p-16">
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-indigo-500 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-emerald-500 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 space-y-12">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1741ed]">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              Partner Portal
            </span>
          </Link>

          <div className="space-y-6">
            <h2 className="text-3xl font-bold leading-tight tracking-tight lg:text-5xl">
              Introduce helpful websites, <br />
              <span className="text-[#b9caff]">Build referral relationships.</span>
            </h2>
            <p className="max-w-md text-base leading-8 text-slate-200">
              Apply to refer businesses to Bennie Studio. Commission eligibility and rates depend on the approved partner agreement.
            </p>
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shadow-inner">
                <TrendingUp className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <p className="font-bold text-slate-100">Tiered Commissions</p>
                <p className="text-sm text-slate-400">
                  The more you refer, the more you earn per sale.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shadow-inner">
                <Zap className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-slate-100">Quick Application</p>
                <p className="text-sm text-slate-400">
                  Apply in minutes and start promoting once approved.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shadow-inner">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-slate-100">Transparent Tracking</p>
                <p className="text-sm text-slate-400">
                  View recorded referrals and eligible commissions in your partner dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-12 border-t border-white/10">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Partner Network. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="flex items-center justify-center bg-[#f8f8f5] p-5 sm:p-10 lg:w-7/12 lg:p-16">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-lg rounded-2xl border border-[#dbe1ea] bg-white p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,.3)] sm:p-9"
        >
          <div className="space-y-2">
            <Badge
              variant="outline"
              className="rounded-lg border border-[#dbe1ea] bg-[#eef3ff] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1741c9]"
            >
              {isSignUp ? "New Partner" : "Existing Partner"}
            </Badge>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-[#15191f]">
              {isSignUp ? "Create Partner Account" : "Partner Sign In"}
            </h1>
            <p className="text-sm leading-7 text-[#526071]">
              {isSignUp
                ? "Start your journey as an official partner today."
                : "Manage your referrals and view your latest earnings."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-lg border-[#dbe1ea] bg-[#f8faff] pl-10 text-[#15191f] focus:ring-2 focus:ring-[#1741ed]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Password
                  </Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 rounded-lg border-[#dbe1ea] bg-[#f8faff] pl-10 text-[#15191f] focus:ring-2 focus:ring-[#1741ed]"
                  />
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <input
                      type="checkbox"
                      id="agreed"
                      required
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    <Label
                      htmlFor="agreed"
                      className="text-xs text-slate-500 leading-relaxed cursor-pointer no-select"
                    >
                      I agree to the{" "}
                      <Link to="/terms" target="_blank" rel="noreferrer" className="font-bold text-[#1741c9] underline">Partner Terms & Conditions</Link>
                      . I understand that commissions and payout timing depend on the current partner terms and eligibility checks.
                    </Label>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="min-h-12 w-full rounded-lg bg-[#1741ed] px-5 py-3 text-base font-bold text-white hover:bg-[#1035c2]"
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <>
                  <Zap className="mr-2 h-5 w-5 animate-pulse" />
                  Processing...
                </>
              ) : (
                <>
                  {isSignUp ? (
                    <UserPlus className="mr-2 h-5 w-5" />
                  ) : (
                    <LogIn className="mr-2 h-5 w-5" />
                  )}
                  {isSignUp
                    ? "Launch My Partnership"
                    : "Access Partner Dashboard"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-slate-500 text-sm">
              {isSignUp
                ? "Already have a partner account?"
                : "Want to join our network?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="ml-1 font-bold text-[#1741c9] hover:underline"
              >
                {isSignUp ? "Sign In" : "Create Account"}
              </button>
            </p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800"
              >
                <div className="flex flex-col gap-1">
                  <span>{error}</span>
                  {error.toLowerCase().includes("already registered") &&
                    isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(false);
                          clearError();
                        }}
                        className="text-[10px] font-bold underline text-left uppercase tracking-widest"
                      >
                        Sign In Now →
                      </button>
                    )}
                </div>
                <button
                  onClick={clearError}
                  className="shrink-0 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
