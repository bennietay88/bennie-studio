import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";

export function EnquiryOutcome({ leadId }: { leadId: string }) {
  const [outcome, setOutcome] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("MYR");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    supabase
      .from("enquiry_outcomes")
      .select("*")
      .eq("lead_id", leadId)
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError("Confirmed outcome could not be loaded.");
        setOutcome(data?.outcome || "");
        setValue(String(data?.job_value ?? ""));
        setCurrency(data?.currency || "MYR");
        setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [leadId]);
  async function confirm(next: string) {
    if (value && (!Number.isFinite(Number(value)) || Number(value) < 0))
      return toast.error("Enter a valid job value.");
    if (!/^[A-Z]{3}$/.test(currency))
      return toast.error("Use a three-letter currency code.");
    setBusy(true);
    const { error } = await supabase.from("enquiry_outcomes").upsert(
      {
        lead_id: leadId,
        month: new Date().toISOString().slice(0, 7) + "-01",
        outcome: next,
        job_value: next === "won" && value ? Number(value) : null,
        currency,
      },
      { onConflict: "lead_id,month" },
    );
    setBusy(false);
    if (error) return toast.error(error.message);
    setOutcome(next);
    toast.success("Outcome confirmed for this month.");
  }
  return (
    <fieldset
      disabled={busy || !!error}
      className="space-y-2 rounded-xl border p-3"
    >
      <legend className="font-semibold">Owner-confirmed enquiry outcome</legend>
      {error && <p role="alert">{error}</p>}
      <div className="flex gap-2">
        <label>
          Optional won job value
          <Input
            type="number"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <label>
          Currency
          <Input
            maxLength={3}
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {["qualified", "booked", "won", "unsuitable"].map((item) => (
          <Button
            key={item}
            size="sm"
            variant={outcome === item ? "default" : "outline"}
            onClick={() => confirm(item)}
          >
            {item}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

export function MonthlyCheckin({ businessId }: { businessId: string }) {
  const current = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(current);
  const [priority, setPriority] = useState("");
  const [baseline, setBaseline] = useState("");
  const [offline, setOffline] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setBusy(true);
    supabase
      .from("owner_monthly_checkins")
      .select("*")
      .eq("business_id", businessId)
      .eq("month", month + "-01")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setError(error ? "Check-in unavailable." : "");
        setPriority(data?.priority || "");
        setBaseline(data?.baseline || "");
        setOffline(String(data?.offline_qualified ?? ""));
        setVerified(!!data?.route_verified);
        setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [businessId, month]);
  async function save() {
    setBusy(true);
    const { error } = await supabase.from("owner_monthly_checkins").upsert(
      {
        business_id: businessId,
        month: month + "-01",
        priority: priority.trim(),
        baseline: baseline.trim() || null,
        offline_qualified: offline === "" ? null : Number(offline),
        route_verified: verified,
      },
      { onConflict: "business_id,month" },
    );
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Monthly check-in saved.");
  }
  return (
    <details className="rounded-xl border bg-white p-4 text-slate-900">
      <summary className="cursor-pointer font-semibold">
        Monthly business check-in
      </summary>
      <form
        className="mt-3 grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label>
          Month
          <Input
            required
            type="month"
            max={current}
            value={month}
            onChange={(e) => {
              if (e.target.value && e.target.value <= current)
                setMonth(e.target.value);
            }}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <fieldset disabled={busy || !!error} className="grid gap-3">
          <label>
            Which jobs would you like more of?
            <Input
              required
              maxLength={500}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
          </label>
          <label>
            Starting point or quarterly comparison
            <Input
              maxLength={500}
              value={baseline}
              onChange={(e) => setBaseline(e.target.value)}
            />
          </label>
          <label>
            Qualified phone or WhatsApp enquiries missing from the CRM
            <Input
              min="0"
              max="100000"
              type="number"
              value={offline}
              onChange={(e) => setOffline(e.target.value)}
              placeholder="Leave blank if unknown"
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
            />{" "}
            I received a test enquiry through my website this month.
          </label>
          <Button type="submit" disabled={!priority.trim()}>
            Save check-in
          </Button>
        </fieldset>
      </form>
    </details>
  );
}
