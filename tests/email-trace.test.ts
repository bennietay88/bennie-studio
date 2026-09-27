import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync("api/index.ts", "utf8");
const env = readFileSync(".env.example", "utf8");

test("direct and scheduled sales emails can be archived to an operator mailbox", () => {
  const matches = api.match(/bcc: process\.env\.SALES_ARCHIVE_EMAIL \|\| undefined/g) || [];
  assert.equal(matches.length, 2);
  assert.match(api, /replyTo: process\.env\.SALES_REPLY_TO/);
});

test("sales archive mailbox is documented as server-only configuration", () => {
  assert.match(env, /SALES_ARCHIVE_EMAIL=/);
  assert.doesNotMatch(env, /VITE_SALES_ARCHIVE_EMAIL/);
});
