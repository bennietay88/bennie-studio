import { DeliveryMeasurements, DeliveryScorecard, ProjectMargin, ServiceReviewQueue } from "./DeliveryMeasurements";
import { useEffect, useMemo, useState } from "react";
import { Briefcase, CalendarDays, CheckCircle2, Loader2, Plus, Search, Settings } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

const STAGES = [
  ["new_customer", "New customer", 5],
  ["onboarding_incomplete", "Onboarding incomplete", 10],
  ["ready_for_build", "Ready for build", 20],
  ["in_production", "In production", 45],
  ["internal_review", "Internal review", 65],
  ["customer_review", "Customer review", 75],
  ["changes_requested", "Changes requested", 80],
  ["approved", "Approved", 88],
  ["domain_setup", "Domain setup", 95],
  ["live", "Live", 100],
  ["maintenance", "Maintenance", 100],
] as const;

const LEGACY_STAGE_MAP: Record<string, [string, number]> = {
  pending: ["New customer", 5], discovery: ["Onboarding incomplete", 10], design: ["Ready for build", 20],
  development: ["In production", 45], qc: ["Internal review", 65], client_review: ["Customer review", 75], launch_prep: ["Domain setup", 95],
};
const labelFor = (status: string) => STAGES.find(([id]) => id === status)?.[1] || LEGACY_STAGE_MAP[status]?.[0] || status?.replace(/_/g, " ");
const progressFor = (status: string) => STAGES.find(([id]) => id === status)?.[2] || LEGACY_STAGE_MAP[status]?.[1] || 0;

const INTERNAL_REVIEW_ITEMS = [
  {
    key: "internalCreativeReviewApproved",
    label: "Creative direction approved",
    detail: "Message, hierarchy, imagery and visual direction have received an internal pass.",
  },
  {
    key: "responsiveQaApproved",
    label: "Responsive QA passed",
    detail: "Desktop, tablet and mobile behaviour have been checked before customer review.",
  },
] as const;

const blankProject = {
  id: "",
  business_id: "",
  title: "",
  type: "waas",
  package_name: "managed-website",
  status: "new_customer",
  priority: "medium",
  assigned_to: "",
  target_launch_date: "",
  admin_notes: "",
};

export function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [reviewWebsite, setReviewWebsite] = useState<any | null>(null);
  const [reviewChecklist, setReviewChecklist] = useState<Record<string, boolean>>({});
  const [reviewSaving, setReviewSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [projectsRes, businessesRes, staffRes] = await Promise.all([
      supabase.from("projects").select("*, businesses(name, subdomain), assignee:profiles!projects_assigned_to_fkey(full_name, email)").order("updated_at", { ascending: false }),
      supabase.from("businesses").select("id, name, plan").order("name"),
      supabase.from("profiles").select("id, full_name, email, role").in("role", ["super_admin", "platform_staff"]),
    ]);
    if (projectsRes.error) toast.error("Projects could not load. Apply the latest operations migration.");
    setProjects(projectsRes.data || []);
    setBusinesses(businessesRes.data || []);
    setStaff(staffRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visibleProjects = useMemo(() => projects.filter((project) => !query || [project.title, project.businesses?.name, project.status].filter(Boolean).some((value) => String(value).toLowerCase().includes(query.toLowerCase()))), [projects, query]);

  const openNew = () => {
    setReviewWebsite(null);
    setReviewChecklist({});
    setEditing({ ...blankProject });
  };

  const projectWebsite = async (project: any, columns: string): Promise<{data:any;error:any}> => {
    const query = supabase.from("websites").select(columns).eq("business_id", project.business_id);
    return (project.website_id ? query.eq("id", project.website_id) : query.order("updated_at", { ascending: false })).limit(1).maybeSingle();
  };

  const openEdit = async (project: any) => {
    setEditing({
      ...blankProject,
      ...project,
      assigned_to: project.assigned_to || "",
      target_launch_date: project.target_launch_date || "",
    });
    setReviewWebsite(null);
    setReviewChecklist({});
    const { data: website } = await projectWebsite(project,"id,seo,updated_at");
    if (website) {
      setReviewWebsite(website);
      setReviewChecklist({
        internalCreativeReviewApproved: Boolean(website.seo?.deliveryQuality?.internalCreativeReviewApproved),
        responsiveQaApproved: Boolean(website.seo?.deliveryQuality?.responsiveQaApproved),
      });
    }
  };

  const validateProjectStage = async (project: any, status: string) => {
    const productionStages = ["in_production", "internal_review", "customer_review", "changes_requested", "approved", "domain_setup", "live"];
    if (productionStages.includes(status) && !project.assigned_to) {
      toast.error("Assign an internal owner before moving this project into production.");
      return false;
    }
    if (productionStages.includes(status) && !project.target_launch_date) {
      toast.error("Set a target launch date before moving this project into production.");
      return false;
    }
    if (status === "customer_review" && !["internal_review", "changes_requested", "customer_review"].includes(String(project.status || ""))) {
      toast.error("Complete Internal Review before sending the website to the customer.");
      return false;
    }
    if (status === "customer_review") {
      const { data: website, error: websiteError } = await projectWebsite(project,"id,seo");
      const deliveryQuality = website?.seo?.deliveryQuality || {};
      if (websiteError || !website || !deliveryQuality.internalCreativeReviewApproved || !deliveryQuality.responsiveQaApproved) {
        toast.error("Customer review blocked: complete the creative and responsive internal review checklist first.");
        return false;
      }
    }
    if (status === "approved" && !["customer_review", "changes_requested", "approved"].includes(String(project.status || ""))) {
      toast.error("Customer review must happen before the project can be marked approved.");
      return false;
    }
    if (status === "live") {
      const { data: website, error: websiteError } = await projectWebsite(project,"id,status,seo,updated_at");
      if (websiteError) {
        toast.error("Could not verify website launch readiness.");
        return false;
      }
      const deliveryQuality = website?.seo?.deliveryQuality || {};
      const launchGate = website?.seo?.launchGate || {};
      const missing = [
        !deliveryQuality.internalCreativeReviewApproved ? "internal creative review" : "",
        !deliveryQuality.responsiveQaApproved ? "responsive QA" : "",
        !deliveryQuality.customerApprovalRecorded ? "customer approval" : "",
        launchGate.ready !== true ? "recorded launch gate" : "",
      ].filter(Boolean);
      if (!website || missing.length) {
        toast.error(`Launch blocked: complete ${missing.join(", ") || "website readiness"} first.`);
        return false;
      }
    }
    return true;
  };

  const saveProject = async () => {
    if (!editing?.business_id || !editing?.title.trim()) return toast.error("Customer and project title are required");
    setSaving(true);
    if (!(await validateProjectStage(editing, String(editing.status || "")))) {
      setSaving(false);
      return;
    }
    const payload = {
      business_id: editing.business_id,
      title: editing.title.trim(),
      type: editing.type,
      package_name: editing.package_name,
      status: editing.status,
      priority: editing.priority,
      assigned_to: editing.assigned_to || null,
      target_launch_date: editing.target_launch_date || null,
      admin_notes: editing.admin_notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (editing.id && reviewWebsite?.id) {
      setReviewSaving(true);
      const { data: freshWebsite, error: freshWebsiteError } = await supabase
        .from("websites")
        .select("id,seo")
        .eq("id", reviewWebsite.id)
        .maybeSingle();
      if (freshWebsiteError || !freshWebsite) {
        setReviewSaving(false);
        setSaving(false);
        return toast.error("Could not refresh the latest review evidence.");
      }
      const nextSeo = {
        ...(freshWebsite.seo || {}),
        deliveryQuality: {
          ...(freshWebsite.seo?.deliveryQuality || {}),
          ...reviewChecklist,
          lastReviewedAt: new Date().toISOString(),
        },
      };
      const { error: reviewError } = await supabase
        .from("websites")
        .update({ seo: nextSeo, updated_at: new Date().toISOString() })
        .eq("id", reviewWebsite.id);
      setReviewSaving(false);
      if (reviewError) {
        setSaving(false);
        return toast.error(reviewError.message);
      }
    }

    const result = editing.id
      ? await supabase.from("projects").update(payload).eq("id", editing.id)
      : await supabase.from("projects").insert(payload);
    setSaving(false);
    if (result.error) return toast.error(result.error.message);
    toast.success(editing.id ? "Production project and review evidence updated" : "Production project created");
    setEditing(null);
    load();
  };

  const moveProject = async (project: any, status: string) => {
    const productionStages = ["in_production", "internal_review", "customer_review", "changes_requested", "approved", "domain_setup", "live"];
    if (productionStages.includes(status) && !project.assigned_to) {
      toast.error("Assign an internal owner before moving this project into production.");
      return;
    }
    if (productionStages.includes(status) && !project.target_launch_date) {
      toast.error("Set a target launch date before moving this project into production.");
      return;
    }
    if (status === "customer_review" && !["internal_review", "changes_requested", "customer_review"].includes(String(project.status || ""))) {
      toast.error("Complete Internal Review before sending the website to the customer.");
      return;
    }
    if (status === "customer_review") {
      const { data: website, error: websiteError } = await projectWebsite(project,"id,seo");
      const deliveryQuality = website?.seo?.deliveryQuality || {};
      if (websiteError || !website || !deliveryQuality.internalCreativeReviewApproved || !deliveryQuality.responsiveQaApproved) {
        toast.error("Customer review blocked: complete the creative and responsive internal review checklist first.");
        return;
      }
    }
    if (status === "approved" && !["customer_review", "changes_requested", "approved"].includes(String(project.status || ""))) {
      toast.error("Customer review must happen before the project can be marked approved.");
      return;
    }
    if (status === "live") {
      const { data: website, error: websiteError } = await projectWebsite(project,"id,status,seo,updated_at");
      if (websiteError) {
        toast.error("Could not verify website launch readiness.");
        return;
      }
      const deliveryQuality = website?.seo?.deliveryQuality || {};
      const launchGate = website?.seo?.launchGate || {};
      const missing = [
        !deliveryQuality.internalCreativeReviewApproved ? "internal creative review" : "",
        !deliveryQuality.responsiveQaApproved ? "responsive QA" : "",
        !deliveryQuality.customerApprovalRecorded ? "customer approval" : "",
        launchGate.ready !== true ? "recorded launch gate" : "",
      ].filter(Boolean);
      if (!website || missing.length) {
        toast.error(`Launch blocked: complete ${missing.join(", ") || "website readiness"} first.`);
        return;
      }
    }

    const { error } = await supabase
      .from("projects")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", project.id);
    if (error) return toast.error(error.message);
    setProjects((rows) => rows.map((row) => row.id === project.id ? { ...row, status } : row));
    toast.success(`Project moved to ${labelFor(status)}`);
  };

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-4xl font-black tracking-tight text-slate-950">Production Workflow</h1><p className="mt-1 text-sm font-semibold text-slate-500">Move every customer website from brief to launch with clear ownership and deadlines.</p></div><Button onClick={openNew} className="rounded-xl bg-indigo-600"><Plus className="mr-2 h-4 w-4"/>New Project</Button></div>
      <DeliveryScorecard/>
      <ServiceReviewQueue/>
      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer, project, or stage..." className="h-11 rounded-xl pl-10"/></div>
      {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600"/></div> : <div className="space-y-4">{visibleProjects.map((project) => <Card key={project.id} className="rounded-2xl border-slate-200"><CardContent className="space-y-5 p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-950">{project.title || project.businesses?.name}</p><Badge variant="outline">{project.brief_ready_at && project.status==="internal_review" ? "Draft ready for review" : labelFor(project.status)}</Badge><Badge className={project.priority === "high" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}>{project.priority || "medium"}</Badge></div><p className="mt-1 text-xs font-semibold text-slate-500">{project.businesses?.name} · Owner: {project.assignee?.full_name || project.assignee?.email || "Unassigned"}</p></div><div className="w-full max-w-sm"><div className="mb-2 flex justify-between text-xs font-bold text-slate-500"><span>{labelFor(project.status)}</span><span>{progressFor(project.status)}%</span></div><Progress value={progressFor(project.status)} className="h-2"/></div><Button variant="outline" onClick={() => openEdit(project)} className="rounded-xl"><Settings className="mr-2 h-4 w-4"/>Configure</Button></div><div className="flex flex-wrap gap-2">{STAGES.map(([id, label]) => <Button key={id} size="sm" variant={project.status === id ? "default" : "outline"} onClick={() => moveProject(project, id)} className="rounded-xl text-xs">{label}</Button>)}</div>{project.delivery_exception && <p role="status">{project.delivery_exception}</p>}{project.target_launch_date && <p className="flex items-center gap-2 text-xs font-semibold text-slate-500"><CalendarDays className="h-4 w-4"/>Target launch: {new Date(`${project.target_launch_date}T00:00:00`).toLocaleDateString()}</p>}</CardContent></Card>)}{!visibleProjects.length && <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center"><Briefcase className="mx-auto h-10 w-10 text-slate-300"/><p className="mt-3 font-bold text-slate-600">No production projects found.</p></div>}</div>}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}><DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-3xl"><DialogHeader><DialogTitle>{editing?.id ? "Configure Production Project" : "Create Production Project"}</DialogTitle><DialogDescription>Set the customer, owner, delivery stage, launch target, and blockers.</DialogDescription></DialogHeader>{editing && <div className="grid gap-4 py-3 sm:grid-cols-2"><Field label="Customer"><Select value={editing.business_id} onValueChange={(value) => { const business = businesses.find((item) => item.id === value); setEditing({ ...editing, business_id: value, package_name: business?.plan || editing.package_name, title: editing.title || `${business?.name || "Customer"} Managed Website` }); }}><SelectTrigger><SelectValue placeholder="Select customer"/></SelectTrigger><SelectContent>{businesses.map((business) => <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Project owner"><Select value={editing.assigned_to || "unassigned"} onValueChange={(value) => setEditing({ ...editing, assigned_to: value === "unassigned" ? "" : value })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{staff.map((member) => <SelectItem key={member.id} value={member.id}>{member.full_name || member.email}</SelectItem>)}</SelectContent></Select></Field><div className="sm:col-span-2"><Field label="Project title"><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })}/></Field></div><Field label="Stage"><Select value={editing.status} onValueChange={(value) => setEditing({ ...editing, status: value })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{STAGES.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select></Field><Field label="Priority"><Select value={editing.priority} onValueChange={(value) => setEditing({ ...editing, priority: value })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></Field><Field label="Plan / package"><Input value={editing.package_name} onChange={(e) => setEditing({ ...editing, package_name: e.target.value })}/></Field><Field label="Target launch"><Input type="date" value={editing.target_launch_date} onChange={(e) => setEditing({ ...editing, target_launch_date: e.target.value })}/></Field>{editing.id && reviewWebsite && <div className="sm:col-span-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
  <div className="flex items-start justify-between gap-3">
    <div>
      <p className="text-sm font-black text-slate-950">Internal review checklist</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">Complete the two high-value checks before sending this website to the customer.</p>
    </div>
    <Badge className="bg-white text-indigo-700 hover:bg-white">{Object.values(reviewChecklist).filter(Boolean).length}/{INTERNAL_REVIEW_ITEMS.length}</Badge>
  </div>
  <div className="mt-3 space-y-2">
    {INTERNAL_REVIEW_ITEMS.map((item) => {
      const checked = Boolean(reviewChecklist[item.key]);
      return <button key={item.key} type="button" aria-pressed={checked} onClick={() => setReviewChecklist((current) => ({ ...current, [item.key]: !checked }))} className="flex w-full items-start gap-3 rounded-xl border border-white bg-white/80 p-3 text-left transition hover:border-indigo-300">
        <span className={"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full " + (checked ? "bg-emerald-500 text-white" : "border border-slate-300 text-transparent")}><CheckCircle2 className="h-4 w-4" /></span>
        <span><span className="block text-sm font-bold text-slate-900">{item.label}</span><span className="mt-0.5 block text-xs font-medium leading-5 text-slate-500">{item.detail}</span></span>
      </button>;
    })}
  </div>
</div>}
{editing.id && <div className="grid gap-2 sm:col-span-2"><p className="text-sm">Observed customer wait: {editing.observed_customer_wait_minutes == null ? "Unmeasured" : Math.round(editing.observed_customer_wait_minutes)+" min"} · Domain wait: {editing.observed_domain_wait_minutes == null ? "Unmeasured" : Math.round(editing.observed_domain_wait_minutes)+" min"}</p><DeliveryMeasurements key={editing.id} projectId={editing.id}/><ProjectMargin projectId={editing.id}/></div>}
<div className="sm:col-span-2"><Field label="Blockers and internal notes"><Textarea value={editing.admin_notes} onChange={(e) => setEditing({ ...editing, admin_notes: e.target.value })} className="min-h-28"/></Field></div></div>}<DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveProject} disabled={saving || reviewSaving} className="bg-indigo-600">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save Project</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
