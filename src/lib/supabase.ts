import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials missing. Please check your environment variables.",
  );
}

// Keep the public marketing shell renderable when auth configuration is
// missing. AuthContext guards all network calls when this is false, while
// this valid placeholder prevents Supabase client construction from blanking
// the entire app during a partial deployment.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "public-anon-key-unavailable",
);
