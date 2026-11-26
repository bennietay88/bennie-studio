import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "sonner";

const work = {
  draft_review: "Draft review",
  review_handoff: "Customer review handoff",
  revision: "Revisions",
  launch: "Launch verification",
  customer_wait: "Customer wait",
  domain_wait: "Domain wait",
  generation: "Machine generation",
  automated_qa: "Automated QA",
};
export function DeliveryMeasurements({ projectId }: { projectId: string }) {
  const [category, setCategory] = useState("draft_review");
  const [minutes, setMinutes] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setBusy(true);
    supabase
      .from("delivery_work_totals")
      .select("minutes,exception")
      .eq("project_id", projectId)
      .eq("category", category)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setMinutes(String(data?.minutes ?? ""));
        setReason(data?.exception || "");
        setBusy(false);
        setError(error?.message || "");
      });
    return () => {
      active = false;
    };
  }, [projectId, category]);
  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from("delivery_work_totals")
      .upsert(
        {
          project_id: projectId,
          category,
          minutes: Number(minutes),
          exception: reason.trim() || null,
        },
        { onConflict: "project_id,category" },
      );
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Cumulative time saved.");
  }
  return (
    <details className="rounded-xl border p-3">
      <summary>Delivery time and exceptions</summary>
      <div className="grid gap-2 py-2">
        <label>
          Activity{" "}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {Object.entries(work).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Total minutes for this project and activity
          <Input
            type="number"
            min="0"
            max="100000"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="Unmeasured"
          />
        </label>
        <label>
          Exception or cause of delay
          <Input
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <Button
          type="button"
          disabled={
            busy ||
            !!error ||
            !minutes ||
            Number(minutes) < 0 ||
            Number(minutes) > 100000
          }
          onClick={save}
        >
          Save activity total
        </Button>
      </div>
    </details>
  );
}

export function ServiceReviewQueue() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  async function load() {
    const { data, error } = await supabase
      .from("delivery_tasks")
      .select("id,metadata,due_at,businesses(name)")
      .eq("source", "retention")
      .eq("status", "queued")
      .order("due_at")
      .limit(50);
    setError(error?.message || "");
    setRows(data || []);
  }
  useEffect(() => {
    void load();
  }, []);
  async function complete(id: string) {
    setWorking(true);
    const { error } = await supabase
      .from("delivery_tasks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "queued");
    if (error) toast.error(error.message);
    else await load();
    setWorking(false);
  }
  return (
    <details className="rounded-xl border p-4">
      <summary>Customer retention and service follow-ups</summary>
      {error && <p role="alert">{error}</p>}
      {!error && !rows.length && <p>No queued reviews.</p>}
      {rows.map((row) => (
        <div
          className="flex items-center justify-between gap-3 border-b py-2"
          key={row.id}
        >
          <div>
            <strong>
              {row.businesses?.name} ·{" "}
              {row.metadata.month
                ? "Month " + row.metadata.month
                : row.metadata.period}
            </strong>
            <p>{row.metadata.action}</p>
          </div>
          <Button size="sm" disabled={working} onClick={() => complete(row.id)}>
            Complete follow-up
          </Button>
        </div>
      ))}
    </details>
  );
}

type MetricRow = Record<string, string | number | null>;
function MetricTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: MetricRow[];
  columns: Record<string, string>;
}) {
  return (
    <section>
      <h3 className="font-semibold">{title}</h3>
      {!rows.length ? (
        <p>No eligible observations yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {Object.values(columns).map((label) => (
                  <th key={label} className="p-1">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {Object.keys(columns).map((key) => (
                    <td className="p-1" key={key}>
                      {row[key] ?? "Unknown"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
export function DeliveryScorecard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  async function load() {
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/delivery-business-metrics", {
        headers: { Authorization: `Bearer ${data.session?.access_token}` },
      });
      if (!res.ok)
        throw new Error(
          res.status === 403
            ? "Super-admin access required."
            : "Metrics unavailable.",
        );
      setData(await res.json());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Metrics unavailable.");
    }
  }
  const p = data?.pilot;
  return (
    <details
      className="rounded-xl border p-4"
      onToggle={(e) => {
        if (e.currentTarget.open) void load();
      }}
    >
      <summary>Delivery pilot and retention scorecard</summary>
      {error && <p role="alert">{error}</p>}
      {p && (
        <div className="grid gap-4 pt-3">
          <p>
            {p.intake}/20 paid builds enrolled · {p.onTime} internal one-business-day
            draft reviews · {p.reviewed} reviewed · {p.fullyTimed} fully
            timed launches · {p.averageMinutes ?? "Unknown"} average staff
            minutes · {p.under45} within 45 minutes · {p.repeatRevisions} with
            repeat revisions · {p.exceptions} with recorded exceptions.
          </p>
          <MetricTable
            title="Paid retention by service anniversary · track month 24"
            rows={data.retention}
            columns={{
              cohort: "Starting month",
              plan: "Starting plan",
              month_number: "Month",
              eligible: "Eligible",
              retained: "Paying",
              percent: "Retained %",
            }}
          />
          <MetricTable
            title="Completed previews with a full 30-day window"
            rows={data.preview}
            columns={{
              cohort: "Preview month",
              eligible: "Previews",
              converted: "Paid",
              percent: "Converted %",
            }}
          />
          <MetricTable
            title="Customer-confirmed value this quarter"
            rows={data.value}
            columns={{
              plan: "Plan",
              accounts: "Active accounts",
              verified: "Route verified",
              outcome: "Qualified, booked or won",
            }}
          />
          <MetricTable
            title="Reconciled contribution by plan and currency"
            rows={p.margins}
            columns={{
              month: "Month",
              delivery_plan: "Plan",
              phase: "Phase",
              currency: "Currency",
              accounts: "Project records",
              revenue: "Net revenue",
              contribution: "Contribution",
            }}
          />
          <MetricTable
            title="Billing events"
            rows={data.billing}
            columns={{
              month: "Month",
              event_type: "Event",
              accounts: "Accounts",
            }}
          />
          <MetricTable
            title="Downgrades"
            rows={p.downgrades}
            columns={{ month: "Month", downgrades: "Accounts" }}
          />
        </div>
      )}
    </details>
  );
}

const amounts = {
  net_revenue: "Net revenue received",
  labour_minutes: "Recorded labour minutes",
  hourly_cost: "Loaded hourly labour cost",
  direct_cost: "Direct costs including hosting and AI",
};
export function ProjectMargin({ projectId }: { projectId: string }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [phase, setPhase] = useState("setup");
  const [currency, setCurrency] = useState("USD");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setBusy(true);
    supabase
      .from("delivery_margin_inputs")
      .select("*")
      .eq("project_id", projectId)
      .eq("month", month + "-01")
      .eq("phase", phase)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setFields(
          Object.fromEntries(
            Object.keys(amounts).map((key) => [key, String(data?.[key] ?? "")]),
          ),
        );
        setCurrency(data?.currency || "USD");
        setError(error?.message || "");
        setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, month, phase]);
  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from("delivery_margin_inputs")
      .upsert(
        {
          project_id: projectId,
          month: month + "-01",
          phase,
          currency,
          ...fields,
        },
        { onConflict: "project_id,month,phase" },
      );
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Reconciled contribution inputs saved.");
  }
  return (
    <details className="rounded-xl border p-3">
      <summary>Reconcile delivery margin</summary>
      <div className="grid gap-2 py-2 sm:grid-cols-2">
        <label>
          Month
          <Input
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
            }}
          />
        </label>
        <label>
          Phase{" "}
          <select value={phase} onChange={(e) => setPhase(e.target.value)}>
            <option value="setup">Initial build</option>
            <option value="service">Recurring service</option>
          </select>
        </label>
        <label>
          Currency
          <Input
            value={currency}
            maxLength={3}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          />
        </label>
        {Object.entries(amounts).map(([key, title]) => (
          <label key={key}>
            {title}
            <Input
              type="number"
              step="any"
              value={fields[key] ?? ""}
              onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
            />
          </label>
        ))}
        {error && <p role="alert">{error}</p>}
        <Button
          type="button"
          disabled={
            busy ||
            !!error ||
            !/^[A-Z]{3}$/.test(currency) ||
            Object.keys(amounts).some(
              (key) =>
                !fields[key] ||
                (key !== "net_revenue" && Number(fields[key]) < 0),
            )
          }
          onClick={save}
        >
          Save reconciled figures
        </Button>
      </div>
    </details>
  );
}
