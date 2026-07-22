import React from "react";
import { CheckCircle2, CircleX } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function CheckoutStatusPage({ status }: { status: "success" | "cancel" }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get("session_id");
  const successful = status === "success";
  const [verification, setVerification] = React.useState<"checking" | "confirmed" | "failed">(successful ? "checking" : "failed");
  const [message, setMessage] = React.useState("");
  React.useEffect(() => {
    if (!successful) return;
    if (!sessionId) {
      setVerification("failed");
      setMessage("Checkout confirmation reference is missing.");
      return;
    }
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in to verify this checkout.");
      const response = await fetch(`/api/checkout-session/status?session_id=${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.status !== "complete") throw new Error(payload.error || "Checkout is not complete yet.");
      if (active) {
        setVerification("confirmed");
        localStorage.removeItem("bt_checkout_intent");
      }
    }).catch((error) => {
      if (active) { setVerification("failed"); setMessage(error.message || "Checkout could not be verified."); }
    });
    return () => { active = false; };
  }, [sessionId, successful]);
  const confirmed = successful && verification === "confirmed";
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        {confirmed ? <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /> : <CircleX className="mx-auto h-14 w-14 text-amber-500" />}
        <h1 className="mt-5 text-3xl font-black text-slate-950">{verification === "checking" ? "Confirming checkout" : confirmed ? "Checkout confirmed" : successful ? "Confirmation needs attention" : "Checkout cancelled"}</h1>
        <p className="mx-auto mt-3 max-w-md font-semibold leading-7 text-slate-600">
          {verification === "checking" ? "Please wait while the checkout session is verified securely." : confirmed ? "Your checkout is complete. Continue to onboarding while the payment webhook activates your plan." : successful ? message : "No payment was taken. Your plan selection is saved so you can retry when ready."}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-500" to={confirmed ? "/dashboard/onboarding" : "/pricing"}>{confirmed ? "Continue Setup" : "Return to Pricing"}</Link>
          {!successful && <Link className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 hover:bg-slate-50" to="/dashboard">Go to Dashboard</Link>}
        </div>
        {successful && verification === "failed" && <p className="mt-5 text-xs font-bold text-amber-700">Your plan selection is retained. Contact support if Stripe charged you but activation does not complete.</p>}
      </section>
    </main>
  );
}
