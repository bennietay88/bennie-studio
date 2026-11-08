import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const front = readFileSync(new URL("../src/components/SuperAdmin/ProspectExplorer.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../api/index.ts", import.meta.url), "utf8");
const server = readFileSync(new URL("../server/salesOperations.ts", import.meta.url), "utf8");

test("contacted prospects open follow-up draft, never a generic first email or new audit", () => {
  const start = front.indexOf("const preparePreviewAndEmail =");
  const end = front.indexOf("const convertProspect =", start);
  const route = front.slice(start, end);
  assert.match(route, /await openOutreachComposer\(prospect\)/);
  assert.match(front, /chooseProspectFollowUp\(prospect, history.messages \|\| \[\]\)/);
  assert.match(front, /chooseProspectFollowUpTemplate\(next.stage, hasExistingWebsite, asset\?\.kind\)/);
  assert.match(front, /Review Day /);
});

test("backend verifies stage history and does not restart the 3/5/7 sequence", () => {
  assert.match(server, /OUTREACH_FOLLOW_UP_STAGE_NOT_DUE/);
  assert.match(server, /if \(followUpStage \|\| input.channel !== "email"/);
  assert.match(server, /followUpStage === 1 \? 5 : followUpStage === 2 \? 7 : 3/);
  assert.match(server, /Superseded by manually sent follow-up/);
  assert.match(api, /templateId: z.string\(\).trim\(\).max\(80\).regex\(\/\^\[a-z\]\[a-z0-9_-\]\*\$\/i\)/);
  assert.match(api, /provider_message_id,provider_payload/);
});

test("short secured report URLs work as follow-up assets", () => {
  assert.match(server, /const shortReview = \/\^\\\/review/);
  assert.match(front, /A-Za-z0-9_-/);
});
