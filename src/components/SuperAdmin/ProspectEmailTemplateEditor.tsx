import React from "react";
import { Check, Copy, Eye, RefreshCw, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import {
  getEditableProspectTemplate,
  PORTFOLIO_URL,
  PROSPECT_EMAIL_TEMPLATE_DEFINITIONS,
  renderProspectEmailTemplate,
  validateProspectEmailTemplate,
} from "../../lib/prospectOutreachTemplates";
import type { ProspectEmailTemplate, ProspectEmailTemplateKey, ProspectEmailOverrides } from "../../lib/prospectOutreachTemplates";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

const EXAMPLE = {
  first_name: "Alex",
  business_name: "Example Service Company",
  asset_url: "https://app.bennietay.com/p/s_a1B2c3D4e5F6g7H8i9J0",
  portfolio_url: PORTFOLIO_URL,
  specific_observation: "I help service businesses make their websites clearer and easier for customers to enquire through.",
};

async function requestTemplates(method: "GET" | "PATCH", payload?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Admin session expired. Sign in again.");
  const response = await fetch("/api/admin/sales-automation/templates", {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Template request failed.");
  return result;
}

export function ProspectEmailTemplateEditor() {
  const [selected, setSelected] = React.useState<ProspectEmailTemplateKey>("intro");
  const [overrides, setOverrides] = React.useState<ProspectEmailOverrides>({});
  const [draft, setDraft] = React.useState<ProspectEmailTemplate>(
    getEditableProspectTemplate("intro"),
  );
  const [updatedAt, setUpdatedAt] = React.useState("");
  const [sequenceStatus, setSequenceStatus] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const definition = PROSPECT_EMAIL_TEMPLATE_DEFINITIONS.find((item) => item.id === selected)!;
  const saved = getEditableProspectTemplate(selected, overrides);
  const modified = draft.subject !== saved.subject || draft.body !== saved.body;
  const problem = validateProspectEmailTemplate(selected, draft);
  const isCustomized = Boolean(overrides[selected]);

  const preview = React.useMemo(() => renderProspectEmailTemplate(selected, EXAMPLE, {
    ...overrides,
    [selected]: draft,
  }), [selected, draft, overrides]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestTemplates("GET");
      setOverrides(data.overrides || {});
      setUpdatedAt(data.updatedAt || "");
      setSequenceStatus(data.status || "");
      setDraft(getEditableProspectTemplate(selected, data.overrides || {}));
    } catch (error: any) {
      toast.error(error.message || "Unable to load templates.");
    } finally {
      setLoading(false);
    }
  }, [selected]);

  React.useEffect(() => { void refresh(); }, []); // Load once, not whenever the selected variant changes.

  const selectTemplate = (id: ProspectEmailTemplateKey) => {
    if (modified && !window.confirm("Discard unsaved template changes?")) return;
    setSelected(id);
    setDraft(getEditableProspectTemplate(id, overrides));
  };

  const save = async () => {
    if (problem) return toast.error(problem);
    if (!modified) return;
    setSaving(true);
    try {
      const next = { ...overrides };
      // Resetting to the shipped version deletes the override rather than pinning it.
      if (draft.subject === definition.defaultTemplate.subject && draft.body === definition.defaultTemplate.body) {
        delete next[selected];
      } else next[selected] = { ...draft };
      const result = await requestTemplates("PATCH", { expectedUpdatedAt: updatedAt, overrides: next });
      setOverrides(result.overrides || next);
      setUpdatedAt(result.updatedAt);
      toast.success("Template saved. Future drafts and due emails will use this text.");
    } catch (error: any) {
      toast.error(error.message || "Unable to save template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-3xl border-slate-200">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">Prospect email templates</CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Edit the actual subjects and messages sent by Bennie Studio. Choose a variant, change the copy,
              check its preview, then save. A prospect-specific design or verified review is selected automatically.
            </p>
          </div>
          <Button variant="outline" onClick={() => {
            if (modified && !window.confirm("Discard unsaved changes and reload?")) return;
            void refresh();
          }} disabled={loading || saving} className="rounded-xl">
            <RefreshCw className="mr-2 h-4 w-4" /> Reload
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Day 0 · Day 3 · Day 5 · Day 8</Badge>
          <Badge variant="outline">9 editable variants</Badge>
          <Badge variant="outline">Sequence: {sequenceStatus || "Loading"}</Badge>
        </div>
        <p className="text-xs leading-5 text-slate-500">
          Changes affect future first-email drafts and emails when they become due. Previously sent messages stay unchanged.
          This editor never starts, pauses or schedules outreach.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading email templates…</p> : (
          <div className="grid gap-5 xl:grid-cols-[minmax(220px,0.65fr)_minmax(0,1.45fr)]">
            <div className="space-y-2" aria-label="Email template variants">
              {PROSPECT_EMAIL_TEMPLATE_DEFINITIONS.map((item) => (
                <button key={item.id} type="button" onClick={() => selectTemplate(item.id)}
                  className={"w-full rounded-2xl border px-4 py-3 text-left transition-colors " +
                    (selected === item.id ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:bg-slate-50")}>
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-indigo-600">{item.stage}</span>
                  <span className="mt-1 block text-sm font-bold text-slate-900">{item.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{overrides[item.id] ? "Customized" : "Default"}</span>
                </button>
              ))}
            </div>
            <div className="min-w-0 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">{definition.label}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{definition.description}</p>
                </div>
                <Badge variant="outline">{modified ? "Unsaved changes" : isCustomized ? "Saved customization" : "Default copy"}</Badge>
              </div>
              <div className="space-y-2">
                <label htmlFor="prospect-template-subject" className="text-sm font-bold text-slate-700">Subject line</label>
                <Input id="prospect-template-subject" className="rounded-xl" value={draft.subject}
                  onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} maxLength={160} />
              </div>
              <div className="space-y-2">
                <label htmlFor="prospect-template-message" className="text-sm font-bold text-slate-700">Email message</label>
                <Textarea id="prospect-template-message" className="min-h-[320px] rounded-xl font-mono text-[13px] leading-6"
                  value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
                  maxLength={8000} />
                <p className="text-xs leading-5 text-slate-500">
                  Variables: <code>{"{{first_name}}"}</code>, <code>{"{{business_name}}"}</code>,
                  <code>{"{{portfolio_url}}"}</code>, <code>{"{{asset_url}}"}</code>.
                  {" "}<code>{"{{specific_observation}}"}</code> is available for the first email.
                  {" "}Design and review templates must include the asset URL; portfolio templates must include the portfolio URL.
                </p>
                {problem && <p className="text-sm font-semibold text-rose-700">{problem}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void save()} disabled={saving || !modified || Boolean(problem)} className="rounded-xl bg-indigo-600 text-white">
                  {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save template
                </Button>
                <Button variant="outline" className="rounded-xl" disabled={saving}
                  onClick={() => setDraft({ ...definition.defaultTemplate })}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Restore default
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => {
                  void navigator.clipboard.writeText("Subject: " + preview.subject + "\n\n" + preview.body_text)
                    .then(() => toast.success("Preview copied.")).catch(() => toast.error("Could not copy preview."));
                }}>
                  <Copy className="mr-2 h-4 w-4" /> Copy preview
                </Button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <Eye className="h-4 w-4" /> Recipient preview (example data only)
                  {!problem && <Check className="ml-auto h-4 w-4 text-emerald-600" />}
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-500">To: Alex · Example Service Company</p>
                <p className="mt-1 break-words text-sm font-black text-slate-950">Subject: {preview.subject}</p>
                <div className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-white p-4 text-sm leading-7 text-slate-800">
                  {preview.body_text}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  This preview does not send an email. Verified preview/audit links are substituted only for eligible prospects.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
