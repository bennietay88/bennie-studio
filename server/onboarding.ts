export const resolveOnboardingPlan = (input: {
  storedPlan?: string | null;
  verifiedProposalPlan?: string | null;
}) => {
  const plan = String(input.verifiedProposalPlan || input.storedPlan || "").trim();
  if (!plan) throw new Error("PRODUCT_NOT_RESOLVED");
  return plan;
};
