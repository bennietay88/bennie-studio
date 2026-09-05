export const PRIMARY_MANAGED_PLAN_ID = "business";

export const CORE_VERTICALS = [
  { id: "cleaning", label: "Cleaning companies", offer: "Cleaning quote website with service scope, coverage, real reviews and a structured enquiry path.", proofNeeded: ["Service list", "Areas served", "Real reviews", "Team photos"], primaryCta: "Request a Cleaning Quote" },
  { id: "education", label: "Tuition and education centres", offer: "Programme and trial-class website with teacher profiles, schedules and parent enquiries.", proofNeeded: ["Programmes", "Teacher profiles", "Schedules", "Approved parent reviews"], primaryCta: "Ask About a Trial Class" },
  { id: "accounting", label: "Accounting and bookkeeping firms", offer: "Consultation website with client fit, service scope, verified credentials and an initial enquiry path.", proofNeeded: ["Services", "Client types", "Verified credentials", "Approved testimonials"], primaryCta: "Request a Consultation" },
] as const;

export const MONTHLY_MANAGED_SERVICE_RITUAL = [
  "Review enquiry and lead activity",
  "Check whether WhatsApp, call, booking, and quote CTAs are still clear",
  "Turn new reviews or customer proof into better website copy",
  "Recommend one practical website improvement",
  "Use the plan update allowance for agreed content or section changes",
  "Record what changed so the customer sees ongoing value",
] as const;

export const GROWTH_PLAN_POSITIONING = {
  headline: "Choose the basic plan that fits your current stage.",
  description:
    "Business is the recommended basic plan for most service businesses because it includes the essential pages, trust sections, enquiry paths, hosting, and monthly update support.",
};
