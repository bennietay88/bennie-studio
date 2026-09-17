import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Loader2, Shield, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { hasSubscriptionAccess } from "../lib/permissions";

export const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const { user, profile, business, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-40 items-center justify-center rounded-3xl border border-slate-100 bg-white/80 p-8 text-slate-500 shadow-sm"
      >
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          Checking access…
        </div>
      </div>
    );
  }
  if (!user) {
    const redirectTo = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
        replace
        state={{ redirectTo }}
      />
    );
  }

  if (profile?.status === "suspended") {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <Shield className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Account Suspended</h1>
        <p className="text-slate-500 mt-2 max-w-md">
          Your account has been suspended by an administrator. Please contact
          support if you believe this is a mistake.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => navigate("/")}
        >
          Return Home
        </Button>
      </div>
    );
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return (
      <Navigate
        to={profile.role === "super_admin" || profile.role === "platform_staff" ? "/admin" : "/dashboard"}
        replace
      />
    );
  }

  const hasActiveSubscription = hasSubscriptionAccess(profile, business);
  const isTrialExpired = !!business && !hasActiveSubscription;
  const isBillingPage = location.pathname.includes("/billing");

  if (
    isTrialExpired &&
    !isBillingPage &&
    ["business_admin", "staff", "client"].includes(profile?.role || "")
  ) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-950">
        <div className="h-20 w-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-amber-100 dark:shadow-none">
          <Zap className="h-10 w-10 fill-current" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Subscription access paused
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-md text-lg">
          Your account needs an active subscription to continue accessing the
          dashboard and managed website features.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button
            className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
            onClick={() => navigate("/dashboard/billing")}
          >
            Activate Subscription
          </Button>
          <Button
            variant="outline"
            className="h-12 px-8 rounded-xl"
            onClick={() => navigate("/")}
          >
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};