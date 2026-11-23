import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, X, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";

export default function LoginPage({
  initialSignUp = false,
}: {
  initialSignUp?: boolean;
}) {
  const {
    signInWithEmail,
    signUpWithEmail,
    user,
    error,
    clearError,
    isSigningIn,
    profile,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignUp, setIsSignUp] = React.useState(initialSignUp);
  const [email, setEmail] = React.useState(() => new URLSearchParams(location.search).get("email") || "");
  const [password, setPassword] = React.useState("");
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);

  React.useEffect(() => {
    if (user && profile) {
      const params = new URLSearchParams(location.search);
      const queryRedirect = params.get("redirectTo");
      const stateRedirect = (location.state as any)?.redirectTo;
      const requestedRedirect =
        typeof queryRedirect === "string" && queryRedirect.startsWith("/") && !queryRedirect.startsWith("//")
          ? queryRedirect
          : typeof stateRedirect === "string" && stateRedirect.startsWith("/") && !stateRedirect.startsWith("//")
            ? stateRedirect
            : "";
      const defaultPath =
        profile?.role === "super_admin" || profile?.role === "platform_staff"
          ? "/admin"
          : "/dashboard";
      const target = requestedRedirect || defaultPath;
      navigate(target, { replace: true });
    }
  }, [user, profile?.role, navigate, location.search, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      if (!agreedToTerms) {
        toast.error("Please agree to the Terms of Service and Privacy Policy");
        return;
      }

      // Handle Platform Referral
      const refCode = localStorage.getItem("ref_platform");
      if (refCode) {
        // We'll pass this through cookies or session or just handle it post-signup in a hook
      }

      await signUpWithEmail(email, password);
    } else {
      await signInWithEmail(email, password);
    }
  };

  return (
    <div className="brand-public min-h-screen bg-[#f8f8f5] flex items-center justify-center px-5 py-14 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full rounded-2xl border border-[#dbe1ea] bg-white p-6 space-y-7 sm:p-10"
      >
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#1741ed] text-lg font-bold text-white">
              B
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-[#15191f]">
              {isSignUp ? "Create your Bennie Studio account" : "Welcome back"}
            </h1>
            <p className="text-sm leading-7 text-[#526071]">
              {isSignUp
                ? "Start with a free website preview, then choose the right managed service."
                : "Sign in to manage your website, leads, and account."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid={isSignUp ? "signup-form" : "signin-form"}>
          {user && (
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 mb-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-widest">
                <AlertTriangle className="h-4 w-4" /> Session Detected
              </div>
              <p className="text-xs text-amber-700">
                You are currently signed in as{" "}
                <span className="font-bold">{user.email}</span>. Sign out to use a different account.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full bg-white border-amber-200 text-amber-700 hover:bg-amber-100 h-9 rounded-xl font-bold"
                onClick={async () => {
                  const { error } = await supabase.auth.signOut();
                  if (!error) {
                    window.location.reload();
                  }
                }}
              >
                Sign out of this account
              </Button>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="auth-email" className="text-sm font-semibold text-[#273247]">
              Email Address
            </label>
            <Input
              id="auth-email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="auth-email"
              className="h-12 rounded-lg border-[#dbe1ea] bg-[#f8faff] focus:bg-white"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="auth-password" className="text-sm font-semibold text-[#273247]">
                Password
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs font-bold text-[#1741c9] hover:underline"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <Input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="auth-password"
              className="h-12 rounded-lg border-[#dbe1ea] bg-[#f8faff] focus:bg-white"
            />
          </div>

          {isSignUp && (
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-colors hover:border-indigo-100">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                data-testid="auth-terms"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#5746e8] focus:ring-indigo-600 cursor-pointer"
              />
              <label
                htmlFor="terms"
                className="text-xs text-slate-600 leading-relaxed cursor-pointer select-none"
              >
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => navigate("/terms")}
                  className="text-[#1741c9] font-bold hover:underline"
                >
                  Terms of Service
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() => navigate("/privacy")}
                  className="text-[#1741c9] font-bold hover:underline"
                >
                  Privacy Policy
                </button>
                . I understand that website drafts and changes are reviewed before publication.
              </label>
            </div>
          )}

          <Button
            type="submit"
            data-testid="auth-submit"
            className="min-h-12 w-full rounded-lg bg-[#1741ed] px-6 py-3 text-base font-bold text-white hover:bg-[#1035c2]"
            isLoading={isSigningIn}
          >
            {isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <div className="space-y-4">
          <p className="text-center text-sm text-slate-500">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[#1741c9] font-bold hover:underline"
            >
              {isSignUp ? "Sign In" : "Create One"}
            </button>
          </p>

          {!isSignUp && (
            <p className="text-center text-xs text-slate-400 leading-relaxed">
              By signing in, you agree to our{" "}
              <button
                onClick={() => navigate("/terms")}
                className="text-[#1741c9] font-bold hover:underline"
              >
                Terms
              </button>{" "}
              and{" "}
              <button
                onClick={() => navigate("/privacy")}
                className="text-[#1741c9] font-bold hover:underline"
              >
                Privacy Policy
              </button>
              .
            </p>
          )}
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
                <span className="text-left">{error}</span>
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
                className="shrink-0 p-1 hover:bg-red-100 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-4 text-center">
          <button
            onClick={() => navigate("/")}
            className="mx-auto flex items-center justify-center gap-2 text-sm font-bold text-[#1741c9] transition-colors hover:text-[#1035c2]"
          >
            <ArrowRight className="h-4 w-4 rotate-180" /> Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
