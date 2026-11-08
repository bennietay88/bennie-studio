import assert from "node:assert/strict";
import test from "node:test";
import { shouldRetryLazyChunkLoad } from "../src/lib/lazyChunkRecovery.ts";

test("lazy chunk recovery retries once when the current document is still active", () => {
  assert.equal(shouldRetryLazyChunkLoad({ navigationStarted: false, retryUsed: false }), true);
});

test("lazy chunk recovery does not replace a document that is already navigating", () => {
  assert.equal(shouldRetryLazyChunkLoad({ navigationStarted: true, retryUsed: false }), false);
});

test("lazy chunk recovery does not loop after the single retry was used", () => {
  assert.equal(shouldRetryLazyChunkLoad({ navigationStarted: false, retryUsed: true }), false);
});
