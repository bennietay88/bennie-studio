export function shouldRetryLazyChunkLoad(input: { navigationStarted: boolean; retryUsed: boolean }) {
  return !input.navigationStarted && !input.retryUsed;
}
