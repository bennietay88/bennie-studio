export type SupabaseEnvironmentState = {
  missing: string[];
  invalid: string[];
  configured: boolean;
  url: string;
  anonKey: string;
  serviceKey: string;
};

const PLACEHOLDER_VALUE = /(TODO|CHANGEME|REPLACE[_ -]?ME|YOUR[_ -]?(KEY|VALUE)|EXAMPLE)/i;

function configuredValue(value: string | undefined): string {
  const normalized = String(value || "").trim();
  return PLACEHOLDER_VALUE.test(normalized) ? "" : normalized;
}

export function inspectServerSupabaseEnvironment(
  env: Record<string, string | undefined>,
): SupabaseEnvironmentState {
  const url = configuredValue(env.VITE_SUPABASE_URL);
  const anonKey = configuredValue(env.VITE_SUPABASE_ANON_KEY);
  const serviceKey = configuredValue(env.SUPABASE_SERVICE_ROLE_KEY);
  const values = {
    VITE_SUPABASE_URL: url,
    VITE_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  };
  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  const invalid: string[] = [];

  if (url) {
    try {
      const parsed = new URL(url);
      const localHttp = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
      const invalidProtocol = !["https:", "http:"].includes(parsed.protocol);
      const insecureRemoteUrl = parsed.protocol === "http:" && !localHttp;
      const hasEmbeddedCredentialsOrPath = Boolean(
        parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/",
      );
      if (invalidProtocol || insecureRemoteUrl || !parsed.hostname || hasEmbeddedCredentialsOrPath) {
        invalid.push("VITE_SUPABASE_URL");
      }
    } catch {
      invalid.push("VITE_SUPABASE_URL");
    }
  }

  return {
    missing,
    invalid,
    configured: missing.length === 0 && invalid.length === 0,
    url,
    anonKey,
    serviceKey,
  };
}

export const SUPABASE_UNCONFIGURED_URL = "https://supabase-unconfigured.invalid";
export const SUPABASE_UNCONFIGURED_KEY = "supabase-unconfigured";
