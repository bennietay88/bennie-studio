export const PRIMARY_MANAGED_PLAN_ID = "business";

export const CORE_VERTICALS = [
  {
    id: "clinics",
    label: "Clinics and wellness providers",
    offer: "Appointment-focused website with treatment pages, doctor/team trust, reviews, FAQs, and WhatsApp or booking CTAs.",
    proofNeeded: ["Real reviews", "Practitioner/team information", "Treatment/service list", "Clinic photos", "Location and opening hours"],
    primaryCta: "Book Appointment",
  },
  {
    id: "home-services",
    label: "Renovation and home services",
    offer: "Quote-request website with service areas, project proof, before/after sections, FAQs, and WhatsApp quotation prompts.",
    proofNeeded: ["Project photos", "Service areas", "Warranty or process reassurance", "Real customer reviews", "Quote requirements"],
    primaryCta: "Request Quote",
  },
  {
    id: "beauty-salons",
    label: "Beauty salons and aesthetic services",
    offer: "Booking-focused website with service menus, treatment proof, review-powered trust, gallery sections, and WhatsApp booking flow.",
    proofNeeded: ["Service menu", "Approved customer images", "Real reviews", "Treatment photos", "Promotion or package details"],
    primaryCta: "Book by WhatsApp",
  },
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
  headline: "Start with Growth unless you only need a one-page website.",
  description:
    "Growth is the default managed website plan because it gives most service businesses the minimum useful structure: Home, Services, Contact, review-powered trust, WhatsApp or quote flow, and monthly improvement support.",
};
