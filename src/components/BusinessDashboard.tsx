import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";

const OnboardingFlow = React.lazy(() =>
  import("./OnboardingFlow").then((m) => ({ default: m.OnboardingFlow })),
);

export const BusinessDashboard = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { profile, loading } = useAuth();
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  React.useEffect(() => {
    // Keep billing and support reachable before payment. The onboarding
    // handoff endpoint intentionally requires confirmed billing, so showing
    // the modal on every customer route creates a payment/onboarding deadlock.
    const isDashboardEntry = location.pathname === "/dashboard" || location.pathname === "/dashboard/";
    if (profile && profile.onboardingCompleted === false && isDashboardEntry) {
      setShowOnboarding(true);
    } else if (!isDashboardEntry) {
      setShowOnboarding(false);
    }
  }, [profile?.onboardingCompleted, location.pathname]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );

  return (
    <>
      {showOnboarding && (
        <React.Suspense fallback={null}>
          <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
        </React.Suspense>
      )}
      {children}
    </>
  );
};
