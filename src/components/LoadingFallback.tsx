/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingFallbackProps {
  message?: string;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message = "Loading…",
}) => {
  const websiteBoot = message.toLowerCase().includes("loading website");

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        websiteBoot
          ? "flex min-h-screen w-full items-center justify-center bg-white p-6 text-slate-600"
          : "relative flex min-h-40 w-full items-center justify-center bg-transparent p-6 text-slate-500"
      }
    >
      <div className="fixed inset-x-0 top-0 z-[9999] h-0.5 overflow-hidden bg-slate-100" aria-hidden="true">
        <div className="h-full w-1/3 animate-[loading-bar_1s_ease-in-out_infinite] rounded-full bg-indigo-600" />
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm font-semibold shadow-sm backdrop-blur">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" aria-hidden="true" />
        <span>{message}</span>
      </div>
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-130%); }
          100% { transform: translateX(430%); }
        }
      `}</style>
    </div>
  );
};