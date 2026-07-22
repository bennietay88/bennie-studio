import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@/src": path.resolve(__dirname, "./src"),
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("motion")) return "vendor-motion";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("@base-ui")) return "vendor-ui";
            if (
              id.includes("@google/genai") ||
              id.includes("@google/generative-ai") ||
              id.includes("openai")
            ) {
              return "vendor-ai";
            }
            if (id.includes("react-markdown")) return "vendor-markdown";
            if (id.includes("date-fns")) return "vendor-date";
            if (
              id.includes("/node_modules/react/") ||
              id.includes("/node_modules/react-dom/") ||
              id.includes("/node_modules/react-router-dom/")
            ) {
              return "vendor-react";
            }
            return undefined;
          },
        },
      },
    },
  };
});
