import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTemplateGraph,
  generateFunnelInsights,
  nextStepForSubmission,
  slugifyFunnel,
  summarizeFunnelAnalytics,
  type FunnelConnection,
  type FunnelEvent,
  type FunnelStep,
} from "../src/lib/funnelEngine";

test("funnel templates create one connected graph with one entry step", () => {
  const businessId = "00000000-0000-4000-8000-000000000001";
  const funnelId = "00000000-0000-4000-8000-000000000002";
  const graph = buildTemplateGraph("appointment-booking", businessId, funnelId);

  assert.equal(graph.steps.length, 4);
  assert.equal(graph.connections.length, 3);
  assert.equal(graph.steps.filter((step) => step.is_entry).length, 1);
  assert.equal(graph.steps[0].step_type, "landing");
  assert.equal(graph.steps.at(-1)?.step_type, "confirmation");
  assert.equal(graph.connections[0].source_step_id, graph.steps[0].id);
  assert.equal(graph.connections[0].target_step_id, graph.steps[1].id);
});

test("funnel slugs stay route-safe", () => {
  assert.equal(slugifyFunnel(" Invisalign Consultation – KL! "), "invisalign-consultation-kl");
  assert.equal(slugifyFunnel(""), "funnel");
});

test("conditional routing respects form rules and score thresholds before fallback", () => {
  const source = "00000000-0000-4000-8000-000000000010";
  const high = "00000000-0000-4000-8000-000000000011";
  const budget = "00000000-0000-4000-8000-000000000012";
  const fallback = "00000000-0000-4000-8000-000000000013";
  const base = {
    id: "",
    funnel_id: "00000000-0000-4000-8000-000000000099",
    business_id: "00000000-0000-4000-8000-000000000098",
    source_step_id: source,
    label: null,
    priority: 0,
  };
  const edges: FunnelConnection[] = [
    { ...base, id: "1", target_step_id: high, condition_type: "score", condition_config: { min: 60 }, priority: 0 },
    { ...base, id: "2", target_step_id: budget, condition_type: "field", condition_config: { field: "budget", operator: "gt", value: 5000 }, priority: 1 },
    { ...base, id: "3", target_step_id: fallback, condition_type: "always", condition_config: {}, priority: 2 },
  ];

  assert.equal(nextStepForSubmission(edges, source, { budget: 1000 }, 72), high);
  assert.equal(nextStepForSubmission(edges, source, { budget: 9000 }, 20), budget);
  assert.equal(nextStepForSubmission(edges, source, { budget: 1000 }, 20), fallback);
});

test("analytics calculate step conversion, attribution, revenue and funnel outcomes", () => {
  const step = {
    id: "00000000-0000-4000-8000-000000000020",
    funnel_id: "00000000-0000-4000-8000-000000000021",
    business_id: "00000000-0000-4000-8000-000000000022",
    step_type: "lead_form",
    name: "Lead form",
    slug: "lead",
    position_x: 100,
    position_y: 100,
    is_entry: true,
    status: "published",
    page_content: {},
    settings: {},
    sort_order: 0,
  } as FunnelStep;
  const events: FunnelEvent[] = [
    { id: "e1", funnel_id: step.funnel_id, step_id: step.id, session_id: "s1", event_type: "step_view", source: "Google Ads", device: "Mobile" },
    { id: "e2", funnel_id: step.funnel_id, step_id: step.id, session_id: "s2", event_type: "step_view", source: "Google Ads", device: "Desktop" },
    { id: "e3", funnel_id: step.funnel_id, step_id: step.id, session_id: "s1", lead_id: "l1", event_type: "form_submitted", source: "Google Ads", device: "Mobile" },
    { id: "e4", funnel_id: step.funnel_id, step_id: step.id, session_id: "s1", lead_id: "l1", event_type: "purchase_completed", revenue: 250, currency: "USD", source: "Google Ads", device: "Mobile" },
  ];
  const summary = summarizeFunnelAnalytics(events, [step]);

  assert.equal(summary.visitors, 2);
  assert.equal(summary.leads, 1);
  assert.equal(summary.purchases, 1);
  assert.equal(summary.revenue, 250);
  assert.equal(summary.averageOrderValue, 250);
  assert.equal(summary.byStep[step.id].views, 2);
  assert.equal(summary.byStep[step.id].conversions, 1);
  assert.equal(summary.bySource[0].key, "Google Ads");
});

test("intelligence stays evidence-based when traffic is too small", () => {
  const summary = {
    visitors: 4,
    leads: 1,
    appointments: 0,
    checkoutStarts: 0,
    purchases: 0,
    revenue: 0,
    conversionRate: 25,
    averageOrderValue: 0,
    byStep: {},
    bySource: [],
    byDevice: [],
  };
  const insights = generateFunnelInsights(summary, []);
  assert.equal(insights[0].confidence, "low");
  assert.match(insights[0].observation, /enough traffic/i);
});
