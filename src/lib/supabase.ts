import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase credentials missing. Public pages will continue to render, but authenticated features are unavailable in this deployment.",
  );
}

// createClient throws synchronously when the URL/key are empty. That prevents
// React from mounting at all and produces a completely blank page on preview
// deployments that do not inherit production environment variables. Use an
// inert client configuration so public routes remain renderable; AuthProvider
// short-circuits authenticated behavior while configuration is missing.
const safeSupabaseUrl = supabaseUrl || "https://preview-placeholder.supabase.co";
const safeSupabaseAnonKey = supabaseAnonKey || "preview-placeholder-anon-key";

export const supabase = createClient(safeSupabaseUrl, safeSupabaseAnonKey, {
  auth: {
    persistSession: isSupabaseConfigured,
    autoRefreshToken: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured,
  },
});
