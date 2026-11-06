import assert from "node:assert/strict";
import { test } from "node:test";
import { buildProspectFollowUpPlan, normalizeFollowUpDays } from "../server/prospectFollowUps.js";

test("default 3-day and 7-day follow-up reminders are distinct and in order", () => {
  const now = new Date("2026-10-16T00:00:00.000Z");
  const reminders = buildProspectFollowUpPlan("2026-10-16T09:00:00.000Z", [7, 3, 7], now);
  assert.deepEqual(reminders, [
    { day: 3, dueAt: "2026-10-19T09:00:00.000Z" },
    { day: 7, dueAt: "2026-10-23T09:00:00.000Z" },
  ]);
});

test("custom reminder offsets remain possible up to three reminders", () => {
  assert.deepEqual(normalizeFollowUpDays([30, 1, 14]), [1, 14, 30]);
  const plan = buildProspectFollowUpPlan("2026-10-16T00:00:00.000Z", [14, 30], new Date("2026-10-15T00:00:00.000Z"));
  assert.equal(plan[0].dueAt, "2026-10-30T00:00:00.000Z");
  assert.equal(plan[1].dueAt, "2026-11-15T00:00:00.000Z");
});

test("invalid, overly long and already-expired plans are rejected", () => {
  assert.throws(() => normalizeFollowUpDays([]));
  assert.throws(() => normalizeFollowUpDays([0, 3]));
  assert.throws(() => normalizeFollowUpDays([366]));
  assert.throws(() => normalizeFollowUpDays(Array.from({ length: 13 }, (_, i) => i + 1)));
  assert.throws(() => buildProspectFollowUpPlan("2026-10-01T09:00:00.000Z", [3], new Date("2026-10-16T09:00:00.000Z")));
});
