import assert from "node:assert/strict";
import test from "node:test";
import { chooseProspectFollowUp, chooseProspectFollowUpTemplate, isStagedFollowUpTemplate } from "../src/lib/prospectFollowUpComposer.js";

const first = { direction: "outbound", channel: "email", status: "sent", sent_at: "2026-11-05T00:26:03.848Z" };
const prospect = { outreach_status: "contacted", website_status: "unknown", domain: null };

test("real Nashville prospect history selects a no-site Day 3 follow-up", () => {
  const next = chooseProspectFollowUp(prospect, [first], new Date("2026-11-08T07:31:00Z"));
  assert.equal(next.kind, "follow_up");
  assert.equal(next.stage, 1);
  assert.equal(chooseProspectFollowUpTemplate(1, false), "day3_portfolio_no_site");
  assert.equal(chooseProspectFollowUpTemplate(1, true, "audit"), "day3_audit");
  assert.equal(chooseProspectFollowUpTemplate(2, false), "day8_no_site");
  assert.equal(chooseProspectFollowUpTemplate(3, false), "day15_no_site");
  assert.equal(chooseProspectFollowUpTemplate(1, "unknown"), "day3_neutral");
  assert.equal(chooseProspectFollowUpTemplate(2, "unknown"), "day8_neutral");
});

test("3/2/3 intervals and sequence cap use only confirmed sends", () => {
  assert.equal(chooseProspectFollowUp(prospect, [], new Date("2026-11-08")).kind, "intro");
  assert.equal(chooseProspectFollowUp(prospect, [first], new Date("2026-11-06")).kind, "wait");
  const day3 = { ...first, sent_at: "2026-11-08T00:27:00Z" };
  assert.equal(chooseProspectFollowUp(prospect, [first, day3], new Date("2026-11-10T00:28:00Z")).stage, 2);
  const day8 = { ...first, sent_at: "2026-11-10T00:28:00Z" };
  assert.equal(chooseProspectFollowUp(prospect, [first, day3, day8], new Date("2026-11-13T00:29:00Z")).stage, 3);
  const day15 = { ...first, sent_at: "2026-11-13T00:29:00Z" };
  assert.equal(chooseProspectFollowUp(prospect, [first, day3, day8, day15], new Date("2026-11-30")).kind, "stop");
});

test("replies, closed records and queued stage sends cannot cause duplicate outreach", () => {
  assert.equal(chooseProspectFollowUp(prospect, [first, { direction: "inbound" }], new Date("2026-11-10")).kind, "stop");
  assert.equal(chooseProspectFollowUp({outreach_status:"lost"}, [first], new Date("2026-11-10")).kind, "stop");
  assert.equal(chooseProspectFollowUp(prospect, [first, {direction:"outbound",status:"queued", provider_payload:{directStage:1}}],new Date("2026-11-10")).kind,"stop");
  assert.equal(chooseProspectFollowUp(prospect, [first, {direction:"outbound",status:"draft",provider_payload:{directStage:1}}],new Date("2026-11-10")).kind,"follow_up");
  assert.equal(isStagedFollowUpTemplate("day3_portfolio_no_site"), true);
  assert.equal(isStagedFollowUpTemplate("general-introduction"), false);
});
