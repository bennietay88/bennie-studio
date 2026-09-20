import test from "node:test";
import assert from "node:assert/strict";
import {
  DELIVERY_STANDARD_VERSION,
  PLAN_DELIVERY_STANDARDS,
  evaluateWorldClassLaunchGate,
} from "../src/constants/deliveryStandards.ts";

const baseWebsite: any = {
  id: "w1",
  businessId: "b1",
  status: "draft",
  updatedAt: Date.now(),
  theme: {
    primaryColor: "#111111",
    secondaryColor: "#ffffff",
    fontFamily: "Inter",
    style: "modern",
    footer: { contactEmail: "hello@example.com", contactPhone: "+60123456789", socialLinks: [] },
  },
  seo: {
    title: "Example Business | Service",
    description: "Professional service information and enquiry options.",
    deliveryStandardVersion: DELIVERY_STANDARD_VERSION,
  },
  pages: [
    {
      id: "home",
      title: "Home",
      slug: "",
      sections: [
        { id: "hero", type: "hero", isVisible: true, content: { headline: "A clear service for local customers", ctaText: "Request a Quote" } },
        { id: "services", type: "services", isVisible: true, content: { items: [{ title: "Service", description: "Useful service detail" }] } },
        { id: "contact", type: "contact", isVisible: true, content: { phone: "+60123456789" } },
      ],
    },
  ],
};

test("all public managed plans publish concrete delivery boundaries", () => {
  for (const slug of ["managed-website", "website-growth", "growth-partner"] as const) {
    const standard = PLAN_DELIVERY_STANDARDS[slug];
    assert.ok(standard.pages);
    assert.ok(standard.revisions);
    assert.match(standard.targetFirstDraft, /business days/i);
    assert.match(standard.targetUpdateTurnaround, /business day/i);
  }
});

test("launch gate blocks generated work until human and customer checks are complete", () => {
  const blocked = evaluateWorldClassLaunchGate({
    website: baseWebsite,
    buttonIssues: [],
    designProductionReady: true,
    internalCreativeReviewApproved: false,
    responsiveQaApproved: false,
    productionQualityPassed: false,
    customerApprovalRecorded: false,
  });
  assert.equal(blocked.ready, false);
  assert.ok(blocked.blockers.some((item) => /Internal creative review/i.test(item)));
  assert.ok(blocked.blockers.some((item) => /Responsive QA/i.test(item)));
  assert.ok(blocked.blockers.some((item) => /Customer approval/i.test(item)));
  assert.ok(blocked.blockers.some((item) => /Production quality budget/i.test(item)));
});

test("launch gate passes a clean, reviewed and customer-approved website", () => {
  const ready = evaluateWorldClassLaunchGate({
    website: baseWebsite,
    buttonIssues: [],
    designProductionReady: true,
    internalCreativeReviewApproved: true,
    responsiveQaApproved: true,
    productionQualityPassed: true,
    customerApprovalRecorded: true,
  });
  assert.equal(ready.ready, true);
  assert.deepEqual(ready.blockers, []);
});


test("appointment and managed lead-capture sections satisfy the contact launch gate", () => {
  const appointmentWebsite = structuredClone(baseWebsite);
  appointmentWebsite.theme.footer.contactEmail = "";
  appointmentWebsite.theme.footer.contactPhone = "";
  appointmentWebsite.seo.phone = "";
  appointmentWebsite.pages[0].sections = [
    { id: "hero", type: "hero", isVisible: true, content: { headline: "Book your next visit", ctaText: "Book Appointment" } },
    { id: "services", type: "services", isVisible: true, content: { items: [{ title: "Consultation", description: "Appointment service" }] } },
    { id: "booking", type: "appointment", isVisible: true, content: { title: "Reserve your time" } },
  ];
  const ready = evaluateWorldClassLaunchGate({
    website: appointmentWebsite,
    buttonIssues: [],
    designProductionReady: true,
    internalCreativeReviewApproved: true,
    responsiveQaApproved: true,
    productionQualityPassed: true,
    customerApprovalRecorded: true,
  });
  assert.equal(ready.ready, true);
  assert.equal(
    ready.blockers.some((item) => /contact or lead-capture/i.test(item)),
    false,
  );
});
