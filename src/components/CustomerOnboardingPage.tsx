import React from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingFlow } from "./OnboardingFlow";

/**
 * The customer onboarding route uses the same persisted wizard that creates
 * the business website and hands the completed brief to the delivery queue.
 * Keeping a second browser-only checklist here caused customer and admin
 * progress to disagree.
 */
export function CustomerOnboardingPage() {
  const navigate = useNavigate();

  return (
    <OnboardingFlow
      onComplete={() => navigate("/dashboard/my-website", { replace: true })}
    />
  );
}
