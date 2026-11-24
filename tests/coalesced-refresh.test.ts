import test from "node:test";
import assert from "node:assert/strict";
import { createCoalescedRefresh } from "../server/coalescedRefresh.ts";

test("concurrent normal refreshes reuse one load", async () => {
  const refresh = createCoalescedRefresh<number>();
  let calls = 0;
  let release!: (value: number) => void;
  const gate = new Promise<number>((resolve) => { release = resolve; });
  const load = () => { calls++; return gate; };
  const first = refresh(false, load);
  const second = refresh(false, load);
  await Promise.resolve();
  assert.equal(calls, 1);
  release(42);
  assert.deepEqual(await Promise.all([first, second]), [42, 42]);
  assert.equal(await refresh(false, async () => 43), 43);
});

test("forced refresh waits and obtains fresh data", async () => {
  const refresh = createCoalescedRefresh<string>();
  let release!: (value: string) => void;
  const gate = new Promise<string>((resolve) => { release = resolve; });
  const first = refresh(false, () => gate);
  let calls = 0;
  const forced = refresh(true, async () => { calls++; return "new"; });
  await Promise.resolve();
  assert.equal(calls, 0);
  release("old");
  assert.equal(await first, "old");
  assert.equal(await forced, "new");
  assert.equal(calls, 1);
});

test("a failed load is not cached and a forced refresh can recover", async () => {
  const refresh = createCoalescedRefresh<number>();
  const failed = refresh(false, async () => { throw new Error("temporary"); });
  const retry = refresh(true, async () => 7);
  await assert.rejects(failed, /temporary/);
  assert.equal(await retry, 7);
  assert.equal(await refresh(false, async () => 8), 8);
});
