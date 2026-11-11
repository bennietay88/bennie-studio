import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AgencyCopyDirector } from "./components/AgencyCopyDirector";
import { AgencyMotionDirector } from "./components/AgencyMotionDirector";
import { AgencyVisualDirector } from "./components/AgencyVisualDirector";

import { initClientObservability } from "./lib/observability";
import { MotionConfig } from "motion/react";

const staleAssetReloadKey = "bennie-vite-preload-reload-at";
window.addEventListener("vite:preloadError", (event: Event) => {
  event.preventDefault();
  const now = Date.now();
  const lastReload = Number(sessionStorage.getItem(staleAssetReloadKey) || 0);
  if (now - lastReload < 60_000) return;
  sessionStorage.setItem(staleAssetReloadKey, String(now));
  window.location.reload();
});

const referralCode = new URLSearchParams(window.location.search).get("ref");
if (referralCode) localStorage.setItem("ref_platform", referralCode);

initClientObservability();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <MotionConfig reducedMotion="user">

          <AgencyVisualDirector />
          <AgencyCopyDirector />
          <AgencyMotionDirector />
          <App />
        </MotionConfig>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);