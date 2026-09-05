export const PUBLIC_PROMISE =
  "Turn your reviews and business information into a professionally managed website designed to help visitors WhatsApp, call, book or request a quote.";

export const SUPPORTING_POSITIONING = [
  "Done-for-you website service",
  "Professionally managed",
  "No website builder to learn",
  "Hosting and maintenance included",
  "Built around the customer's services, reviews and business information",
  "Progress tracking and update requests through the customer portal",
];

export const FREE_PREVIEW_LIMITS = [
  "Homepage concept",
  "Hero section",
  "Basic service summary",
  "Review-powered trust section",
  "Primary CTA",
  "Mobile preview",
  "Preview watermark",
];

export const SUBSCRIPTION_DELIVERY_FLOW = [
  "Review managed website plans",
  "Create a limited website preview",
  "Select a subscription plan",
  "Create an account or log in",
  "Create the business record",
  "Complete Stripe checkout before production work begins",
  "Confirm payment or valid payment method",
  "Submit onboarding details, services, reviews, contacts, images, and domain information",
  "Generate a website draft",
  "Administrator reviews and improves the draft",
  "Customer tracks progress and submits consolidated feedback",
  "Administrator makes agreed revisions",
  "Customer approves the website",
  "Website is published and custom domain is connected",
  "Subscription support and update allowances begin",
];

export const WORDPRESS_PROJECT_STATUSES = [
  "new_enquiry",
  "qualified",
  "consultation_scheduled",
  "preparing_quotation",
  "quotation_sent",
  "awaiting_decision",
  "accepted",
  "deposit_paid",
  "onboarding",
  "design",
  "development",
  "customer_review",
  "final_revisions",
  "final_payment",
  "launched",
  "maintenance",
  "lost",
] as const;

export const WORDPRESS_PROJECT_STATUS_LABELS: Record<(typeof WORDPRESS_PROJECT_STATUSES)[number], string> = {
  new_enquiry: "New enquiry",
  qualified: "Qualified",
  consultation_scheduled: "Consultation scheduled",
  preparing_quotation: "Preparing quotation",
  quotation_sent: "Quotation sent",
  awaiting_decision: "Awaiting decision",
  accepted: "Accepted",
  deposit_paid: "Deposit paid",
  onboarding: "Onboarding",
  design: "Design",
  development: "Development",
  customer_review: "Customer review",
  final_revisions: "Final revisions",
  final_payment: "Final payment",
  launched: "Launched",
  maintenance: "Maintenance",
  lost: "Lost",
};
