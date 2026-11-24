/**
 * Share concurrent refreshes inside one warm process, without extending TTLs.
 * Forced refreshes run after an existing refresh, never use its stale result.
 */
export function createCoalescedRefresh<T>() {
  let pending: Promise<T> | undefined;
  return async (force: boolean, load: () => Promise<T>): Promise<T> => {
    while (pending) {
      if (!force) return pending;
      try { await pending; } catch { /* a forced refresh must still retry */ }
    }
    const current = Promise.resolve().then(load);
    pending = current;
    try { return await current; }
    finally { if (pending === current) pending = undefined; }
  };
}
