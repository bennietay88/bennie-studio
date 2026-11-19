import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync("api/index.ts", "utf8");
const env = readFileSync(".env.example", "utf8");

test("sales emails do not send archive BCC copies", () => {
  assert.doesNotMatch(api, /\bbcc\s*:/i);
  assert.doesNotMatch(api, /SALES_ARCHIVE_EMAIL/);
  assert.match(api, /replyTo: process\.env\.SALES_REPLY_TO/);
});

test("sales archive mailbox is not configurable", () => {
  assert.doesNotMatch(env, /SALES_ARCHIVE_EMAIL/);
  assert.doesNotMatch(env, /VITE_SALES_ARCHIVE_EMAIL/);
});
