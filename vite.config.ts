import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react(), tailwindcss()],
    // Vercel prebuilt deployments run outside the hosted build environment.
    // Define public browser configuration explicitly so values loaded from
    // .env.production.local are embedded in the Vite bundle.
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        env.VITE_SUPABASE_URL || "",
      ),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY || "",
      ),
    },
    resolve: {
      alias: {
        "@/src": path.resolve(__dirname, "./src"),
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Keep heavy admin/editor/chart dependencies out of the initial public
      // chunk. Routes are already lazy-loaded; these stable vendor boundaries
      // make that split effective in production and improve cache reuse.
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-ui": ["motion", "lucide-react", "sonner"],
            "vendor-charts": ["recharts"],
            "vendor-auth": ["@supabase/supabase-js", "react-helmet-async"],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
    },
  };
});
