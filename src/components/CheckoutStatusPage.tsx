import React from "react";
import { CheckCircle2, CircleX, Loader2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type VerificationState = "checking" | "confirmed" | "failed" | "claiming";

export function CheckoutStatusPage({ status }: { status: "success" | "cancel" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get("session_id");
  const publicOrder = params.get("public_order") === "1";
  const directCheckout = params.get("direct_checkout") === "1";
  const previewId = params.get("preview_id") || "";
  const successful = status === "success";
  const [verification, setVerification] = React.useState<VerificationState>(successful ? "checking" : "failed");
  const [message, setMessage] = React.useState("");
  const [claimToken, setClaimToken] = React.useState("");
  const [checkoutEmail, setCheckoutEmail] = React.useState("");
  const [signedIn, setSignedIn] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(Boolean(session));
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    if (!successful) return;
    if (!sessionId) {
      setVerification("failed");
      setMessage("Checkout confirmation reference is missing.");
      return;
    }

    let active = true;

    if (publicOrder) {
      if (!previewId) {
        setVerification("failed");
        setMessage("Checkout confirmation reference is missing.");
        return;
      }
      fetch(`/api/public/preview-checkout/status?session_id=${encodeURIComponent(sessionId)}&preview_id=${encodeURIComponent(previewId)}`, {
        cache: "no-store",
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || payload.complete !== true || !payload.claimToken) {
            throw new Error(payload.error || "Checkout is not complete yet.");
          }
          if (!active) return;
          setClaimToken(payload.claimToken);
          setCheckoutEmail(payload.email || "");
          try { sessionStorage.setItem("bt_preview_claim_token", payload.claimToken); } catch { /* optional */ }
          setVerification("confirmed");
        })
        .catch((error) => {
          if (active) {
            setVerification("failed");
            setMessage(error.message || "Checkout could not be verified.");
          }
        });
      return () => { active = false; };
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in to verify this checkout.");
      const response = await fetch(`/api/checkout-session/status?session_id=${encodeURIComponent(sessionId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.status !== "complete") throw new Error(payload.error || "Checkout is not complete yet.");
      if (active) {
        setVerification("confirmed");
        localStorage.removeItem("bt_checkout_intent");
      }
    }).catch((error) => {
      if (active) {
        setVerification("failed");
        setMessage(error.message || "Checkout could not be verified.");
      }
    });

    return () => { active = false; };
  }, [previewId, publicOrder, sessionId, successful]);

  const activatePaidWebsite = React.useCallback(async () => {
    const token = claimToken || (() => {
      try { return sessionStorage.getItem("bt_preview_claim_token") || ""; } catch { return ""; }
    })();
    if (!token) {
      setVerification("failed");
      setMessage("Account activation token is missing. Reopen the payment confirmation page.");
      return;
    }
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return;

    setVerification("claiming");
    try {
      const response = await fetch("/api/preview-checkout/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ claimToken: token }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success !== true) throw new Error(payload.error || "Account activation failed.");
      try {
        sessionStorage.removeItem("bt_preview_claim_token");
        localStorage.removeItem("bt_checkout_intent");
      } catch { /* storage cleanup is best effort */ }
      navigate(payload.redirectTo || "/dashboard/onboarding", { replace: true });
    } catch (error: any) {
      setVerification("failed");
      setMessage(error.message || "Account activation could not be completed.");
    }
  }, [claimToken, navigate]);

  React.useEffect(() => {
    if (!publicOrder || !successful || verification !== "confirmed" || !signedIn || !claimToken) return;
    void activatePaidWebsite();
  }, [activatePaidWebsite, claimToken, publicOrder, signedIn, successful, verification]);

  const confirmed = successful && verification === "confirmed";
  const claiming = verification === "claiming";
  const redirectBack = `${location.pathname}${location.search}`;
  const signupHref = `/signup?redirectTo=${encodeURIComponent(redirectBack)}`;
  const signinHref = `/login?redirectTo=${encodeURIComponent(redirectBack)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        {verification === "checking" || claiming
          ? <Loader2 className="mx-auto h-14 w-14 animate-spin text-indigo-500" />
          : confirmed
            ? <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            : <CircleX className="mx-auto h-14 w-14 text-amber-500" />}

        <h1 className="mt-5 text-3xl font-black text-slate-950">
          {verification === "checking"
            ? "Confirming checkout"
            : claiming
              ? "Activating your account"
              : confirmed
                ? publicOrder ? "Payment confirmed" : "Checkout confirmed"
                : successful ? "Confirmation needs attention" : "Checkout cancelled"}
        </h1>

        <p className="mx-auto mt-3 max-w-md font-semibold leading-7 text-slate-600">
          {verification === "checking"
            ? "Please wait while the payment is verified securely."
            : claiming
              ? "Your paid website is being connected to your Bennie Studio account."
              : confirmed && publicOrder
                ? `Your payment is complete. Activate an account with ${checkoutEmail || "the checkout email"} to continue with onboarding.`
                : confirmed
                  ? "Your checkout is complete. Continue to onboarding while the payment webhook activates your plan."
                  : successful
                    ? message
                    : "No payment was taken. Your plan selection is saved so you can retry when ready."}
        </p>

        {confirmed ? (
          <div className="mt-7 rounded-2xl bg-slate-50 p-5 text-left">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-indigo-600">Your managed project starts here</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["1", "Activate your portal", "Use the checkout email so the paid order connects to the correct account."],
                ["2", "Complete the business brief", "Confirm services, brand assets, contacts, domain and approval details."],
                ["3", "Bennie Studio reviews the build", "The website goes through managed creative review, responsive checks and launch QA."],
                ["4", "Approve and launch", "You review the finished website, request agreed changes and approve it before publication."],
              ].map(([step, title, copy]) => (
                <div key={step} className="border-t border-slate-200 pt-3">
                  <p className="text-xs font-black text-indigo-600">0{step}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {confirmed && publicOrder && !signedIn ? (
            <>
              <Link className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-500" to={signupHref}>
                Activate my account
              </Link>
              <Link className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 hover:bg-slate-50" to={signinHref}>
                I already have an account
              </Link>
            </>
          ) : confirmed && !publicOrder ? (
            <Link className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-500" to="/dashboard/onboarding">
              Continue Setup
            </Link>
          ) : !successful ? (
            <Link className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-500" to="/preview-order">
              Return to order
            </Link>
          ) : verification === "failed" ? (
            <Link className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 hover:bg-slate-50" to={publicOrder && !directCheckout ? "/preview-order" : "/pricing"}>
              Return
            </Link>
          ) : null}
        </div>

        {successful && verification === "failed" ? (
          <p className="mt-5 text-xs font-bold text-amber-700">
            If Stripe charged you, do not pay again. Your payment can be reconciled from the checkout reference.
          </p>
        ) : null}
      </section>
    </main>
  );
}
