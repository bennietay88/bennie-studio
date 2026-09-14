/**
 * Release gates for the OTC/MRC launch foundation.
 *
 * These defaults are deliberately safe: the current public one-time package
 * catalogue remains unchanged until an administrator explicitly enables the
 * corresponding setting in Supabase. Internal AI is never exposed to customers
 * by this flag set.
 */
export type LaunchFlags = {
  otc_mrc_catalogue: boolean;
  internal_ai_content_engine: boolean;
  analytics_v2: boolean;
  customer_ai_controls: boolean;
  ai_credit_topups_enabled: boolean;
};

export const DEFAULT_LAUNCH_FLAGS: LaunchFlags = {
  otc_mrc_catalogue: false,
  internal_ai_content_engine: false,
  analytics_v2: false,
  customer_ai_controls: false,
  ai_credit_topups_enabled: false,
};

export function normalizeLaunchFlags(value: unknown): LaunchFlags {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    otc_mrc_catalogue: input.otc_mrc_catalogue === true,
    internal_ai_content_engine: input.internal_ai_content_engine === true,
    analytics_v2: input.analytics_v2 === true,
    // Kept false unless explicitly introduced in a future customer-facing release.
    customer_ai_controls: input.customer_ai_controls === true,
    ai_credit_topups_enabled: input.ai_credit_topups_enabled === true,
  };
}

export const isLaunchFlagEnabled = (flags: LaunchFlags, key: keyof LaunchFlags) => flags[key] === true;
