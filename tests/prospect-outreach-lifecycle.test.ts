import assert from "node:assert/strict";
import test from "node:test";
import { prospectStageLabel } from "../src/lib/prospectOutreachLifecycle.js";
import { noReplyArchiveDeadline } from "../server/prospectLifecycle.js";
test("outreach label derives from confirmed stage evidence rather than elapsed days", () => {
  const base = {cold: [], stage1: [], stage2: [], stage3: [], outreach_status: "not_started"};
  const sent = [{id:"sent"}];
  assert.equal(prospectStageLabel(base), "New");
  assert.equal(prospectStageLabel({...base, cold:sent}), "Introduction sent");
  assert.equal(prospectStageLabel({...base, cold:sent, stage1:sent}), "Day 3 completed");
  assert.equal(prospectStageLabel({...base, cold:sent, stage1:sent, stage2:sent}), "Day 8 completed");
  assert.equal(prospectStageLabel({...base, cold:sent, stage1:sent, stage2:sent, stage3:sent}), "Day 15 completed");
  assert.equal(prospectStageLabel({...base, outreach_status:"contacted"}), "History unavailable");
  assert.equal(noReplyArchiveDeadline("2026-11-15T10:00:00Z"), "2026-11-18T10:00:00.000Z");
});
