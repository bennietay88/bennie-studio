import assert from "node:assert/strict";
import test from "node:test";
import { buildAvailableSalesCallSlots, isAllowedSalesCallSlot } from "../server/salesCallSlots.ts";

test("accepts only the published weekday Malaysia call times", () => {
  assert.equal(isAllowedSalesCallSlot(new Date("2026-08-31T02:00:00.000Z")), true); // Monday 10:00 MYT
  assert.equal(isAllowedSalesCallSlot(new Date("2026-08-31T03:00:00.000Z")), false);
  assert.equal(isAllowedSalesCallSlot(new Date("2026-08-30T02:00:00.000Z")), false); // Sunday
  assert.equal(isAllowedSalesCallSlot(new Date("2026-08-31T02:00:30.000Z")), false);
});

test("availability excludes occupied starts and stays within the configured schedule", () => {
  const occupied = ["2026-08-31T02:00:00.000Z"];
  const slots = buildAvailableSalesCallSlots(new Date("2026-08-29T00:00:00.000Z"), occupied, 6);
  assert.equal(slots.includes(occupied[0]), false);
  assert.equal(slots.length, 6);
  assert.equal(slots.every((slot) => isAllowedSalesCallSlot(new Date(slot))), true);
});
