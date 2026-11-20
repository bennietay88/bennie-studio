import React from "react";
import { Activity, BarChart3, CheckCircle2, FileWarning, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import { supabase } from "../../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";

type Json = Record<string, any>;
type Metric = {label:string;value:string|number;hint?:string};
const formatNumber = (value:unknown) => value == null ? "N/A" : Number(value).toLocaleString("en-US");
const m = (label:string,value:string|number,hint?:string):Metric => ({label,value,hint});
function MetricPanel({label,value,hint}:Metric) {
  return <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
    <p className="text-base font-semibold text-[#475569]">{label}</p>
    <p className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">{value}</p>
    {hint&&<p className="mt-2 text-base leading-relaxed text-[#475569]">{hint}</p>}
  </div>;
}
async function request(path:string,options:RequestInit={}) {
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)throw new Error("Sign in with a Sales administrator account.");
  const response=await fetch(path,{...options,headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token,...(options.headers||{})}});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body.error||"The operation was unsuccessful.");
  return body;
}
function Breakdown({title,rows}:{title:string;rows:any[]}) {
  return <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm"><CardHeader><CardTitle className="text-xl">{title}</CardTitle></CardHeader><CardContent>
    {!rows?.length?<p className="text-base text-[#475569]">No attributable records.</p>:
      <div className="overflow-x-auto"><table className="w-full text-base">
        <thead><tr className="border-b text-left text-sm text-[#475569]"><th className="py-3">Group</th><th>Sent</th><th>Delivered</th><th>Human replies</th><th>Reply rate</th></tr></thead>
        <tbody>{rows.map(row=><tr key={row.key} className="border-b border-[#E2E8F0]">
          <td className="py-3 pr-4 font-semibold">{row.key}</td><td>{row.sent}</td>
          <td>{row.delivered}</td><td>{row.replied}</td><td>{row.replyRate==null?"N/A":row.replyRate+"%"}</td>
        </tr>)}</tbody></table></div>}
  </CardContent></Card>;
}
const actionCategories=new Set(["duplicate_candidate","closed_contact","suppressed_contact","superseded_by_reply"]);
export function OutreachCompletionWorkbench() {
  const [report,setReport]=React.useState<Json|null>(null);
  const [review,setReview]=React.useState<Json|null>(null);
  const [busy,setBusy]=React.useState(false);
  const [error,setError]=React.useState("");
  const [filters,setFilters]=React.useState({from:"",to:"",country:"",industry:"",tier:"",websiteStatus:"",provider:"",template:"",campaign:""});
  const [view,setView]=React.useState("funnel");
  const [scorePreview,setScorePreview]=React.useState<Json|null>(null);
  const [scoreOffset,setScoreOffset]=React.useState(0);
  const [selectedTasks,setSelectedTasks]=React.useState<string[]>([]);
  const [taskPreview,setTaskPreview]=React.useState<Json|null>(null);
  const [website,setWebsite]=React.useState({prospectId:"",websiteStatus:"unknown",sourceUrl:"",method:"Manual website/search-engine verification",finding:"",confidence:"medium",verifiedAt:new Date().toISOString(),reviewedEvidence:false});
  const [experiment,setExperiment]=React.useState({name:"",hypothesis:"",segment:"all",primaryMetric:"human_reply",
    variantA:{subject:"",body:""},variantB:{subject:"",body:""}});
  const [selectedExperiment,setSelectedExperiment]=React.useState("");
  const [assignmentProspects,setAssignmentProspects]=React.useState("");
  const [milestone,setMilestone]=React.useState({prospectId:"",eventType:"qualified_conversation",notes:"",amount:"",currency:"USD"});
  const [invoice,setInvoice]=React.useState({prospectId:"",invoiceId:""});
  const load=React.useCallback(async()=>{
    setBusy(true);setError("");
    try {
      const search=new URLSearchParams();
      for(const [key,value] of Object.entries(filters)){
        if(!value)continue;
        search.set(key,key==="from"?value+"T00:00:00.000Z":key==="to"?value+"T23:59:59.999Z":value);
      }
      const payload=await request("/api/admin/outreach-completion/report?"+search.toString());
      setReport(payload.report);setReview(payload.taskReview);setSelectedTasks([]);setTaskPreview(null);
    } catch (err:any){setError(err?.message||"Could not load outreach reporting.");}
    finally{setBusy(false);}
  },[filters]);
  React.useEffect(()=>{void load();},[load]);
  const post=async(path:string,body:Json,after?:()=>void)=>{
    setBusy(true);
    try {
      const result=await request(path,{method:"POST",body:JSON.stringify(body)});
      toast.success(result?.dryRun?"Dry run complete; no records changed.":"Operation completed.");
      after?.();
      return result;
    }catch(e:any){toast.error(e?.message||"Operation failed.");return null;}
    finally{setBusy(false);}
  };
  const metrics=report?.metrics||{};
  const cohorts=(report?.cohorts||[]) as any[];
  const breakdowns=report?.breakdowns||{};
  const summary=review?.summary||{};
  const tabs=["funnel","cohorts","segments","work queue","qualification","experiments","revenue"] as const;
  return <section className="mx-auto w-full max-w-[1280px] space-y-7 bg-[#F8FAFC] px-6 py-8 text-base leading-[1.55] text-[#0F172A] lg:px-12">
    <header className="grid items-end gap-6 lg:grid-cols-[1fr_0.8fr]">
      <div><p className="text-base font-semibold text-[#1D4ED8]">Revenue operations · verified evidence</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight lg:text-4xl">Outreach performance and completion</h2></div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p className="max-w-md text-base leading-relaxed text-[#475569]">Full-cohort reporting, controlled research, campaign tests, task reconciliation and recorded commercial milestones.</p>
        <Button variant="outline" disabled={busy} onClick={()=>void load()}><RefreshCcw className="mr-2 h-4 w-4"/>Refresh</Button>
      </div>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {([["from","From"],["to","To"],["country","Country"],["industry","Industry"],["campaign","Campaign"]] as const).map(([key,label])=>
        <label key={key} className="space-y-2 text-base font-semibold text-[#475569]">{label}
          <Input type={key==="from"||key==="to"?"date":"text"} value={filters[key]} onChange={e=>setFilters(old=>({...old,[key]:e.target.value}))} placeholder={label}/>
        </label>)}
      {([["tier","Qualification tier"],["websiteStatus","Website status"],["provider","Provider"],["template","Template ID"]] as const).map(([key,label])=>
        <label key={key} className="space-y-2 text-base font-semibold text-[#475569]">{label}
          <Input value={filters[key]} onChange={e=>setFilters(old=>({...old,[key]:e.target.value}))} placeholder={label}/>
        </label>)}
      <div className="flex items-end"><Button variant="outline" className="w-full" onClick={()=>setFilters({from:"",to:"",country:"",industry:"",tier:"",websiteStatus:"",provider:"",template:"",campaign:""})}>Reset filters</Button></div>
    </div>
    {error&&<div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-base text-amber-900">
      <FileWarning className="mr-2 inline h-5 w-5"/>{error}
      <p className="mt-2 text-base">Completion migration must be installed before reporting. Historical data will not change automatically.</p>
    </div>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricPanel {...m("Prospects",formatNumber(metrics.prospects),"Filtered records")}/>
      <MetricPanel {...m("Evidence-scored v2",formatNumber(metrics.scoredV2),"Missing facts score zero")}/>
      <MetricPanel {...m("Contact eligible",formatNumber(metrics.contactEligible),"Documented opt-in and reviewed jurisdiction")}/>
      <MetricPanel {...m("Unique contacted",formatNumber(metrics.uniqueContacted),"Distinct linked prospects")}/>
      <MetricPanel {...m("Provider accepted",formatNumber(metrics.accepted),"Not inbox delivery")}/>
      <MetricPanel {...m("Confirmed delivered",formatNumber(metrics.confirmedDelivery),"Receiving-server acceptance only")}/>
      <MetricPanel {...m("Delivery unconfirmed",formatNumber(metrics.unconfirmed),"Do not count as failed")}/>
      <MetricPanel {...m("Linked human replies",formatNumber(metrics.linkedHumanReplyMessages),metrics.linkedHumanReplyRate==null?"Rate unavailable":metrics.linkedHumanReplyRate+"% of sent messages")}/>
      <MetricPanel {...m("Automated replies",formatNumber(metrics.automaticReplies),"Excluded from positive reply rate")}/>
      <MetricPanel {...m("Bounce / complaints",formatNumber(metrics.bounced)+" / "+formatNumber(metrics.complaints))}/>
      <MetricPanel {...m("Recorded consultations",formatNumber(metrics.bookedConsultations))}/>
      <MetricPanel {...m("Open / overdue tasks",formatNumber(metrics.openTasks)+" / "+formatNumber(metrics.overdueTasks))}/>
    </div>
    <div className="flex flex-wrap gap-2">{tabs.map(tab=><Button key={tab} variant={view===tab?"default":"outline"}
      className={view===tab?"bg-[#1D4ED8] text-white hover:bg-[#2563EB]":""} size="sm" onClick={()=>setView(tab)}>{tab.replace(/^\w/,letter=>letter.toUpperCase())}</Button>)}</div>
    {view==="funnel"&&<div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-xl"><BarChart3 className="h-5 w-5"/>Recorded customer-acquisition milestones</CardTitle></CardHeader>
        <CardContent><div className="h-80"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={report?.funnel||[]} layout="vertical" margin={{left:25,right:15}}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis dataKey="stage" type="category" width={145} tick={{fontSize:12}}/><Tooltip/><Bar dataKey="count" fill="#1D4ED8" radius={[0,5,5,0]}/></BarChart>
        </ResponsiveContainer></div>
        <p className="mt-3 text-base leading-relaxed text-[#475569]">Milestones are dated independently; this is not proof of causal funnel conversion.</p></CardContent>
      </Card>
      <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm"><CardHeader><CardTitle className="text-xl">Verified commercial results</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <MetricPanel {...m("Recorded conversions",formatNumber(metrics.convertedBusinesses))}/>
          <MetricPanel {...m("Provider-verified invoices",formatNumber(metrics.paymentVerified))}/>
          {Object.entries(metrics.verifiedRevenueByCurrency||{}).map(([currency,value])=><MetricPanel key={currency} {...m(currency+" verified revenue",formatNumber(value))}/>)}
          <p className="text-base leading-relaxed text-[#475569]">No sale is inferred from email opens, proposals or CRM labels. Currencies remain separate.</p>
        </CardContent></Card>
    </div>}
    {view==="cohorts"&&<Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm"><CardHeader><CardTitle className="text-xl">Weekly verified outreach cohorts</CardTitle></CardHeader><CardContent>
      <div className="h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={cohorts}>
        <CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="key" tick={{fontSize:12}}/><YAxis allowDecimals={false}/><Tooltip/>
        <Line type="monotone" dataKey="sent" stroke="#1D4ED8" name="Sent" strokeWidth={2}/>
        <Line type="monotone" dataKey="delivered" stroke="#059669" name="Confirmed delivered" strokeWidth={2}/>
        <Line type="monotone" dataKey="replied" stroke="#d97706" name="Linked human replies" strokeWidth={2}/>
      </LineChart></ResponsiveContainer></div>
      <div className="mt-4 overflow-x-auto"><table className="min-w-full text-base"><thead><tr className="border-b text-left text-sm text-[#475569]"><th className="py-3">Week</th><th>Sent</th><th>Delivered</th><th>Replies</th><th>Bookings</th><th>Proposals</th><th>Verified invoices</th></tr></thead><tbody>
        {cohorts.map(w=><tr key={w.key} className="border-b border-[#E2E8F0]"><td className="py-3 font-semibold">{w.key}</td><td>{w.sent}</td><td>{w.delivered}</td><td>{w.replied}</td><td>{w.meetings}</td><td>{w.proposals}</td><td>{w.verifiedPayments}</td></tr>)}
      </tbody></table></div></CardContent></Card>}
    {view==="segments"&&<div className="grid gap-4 xl:grid-cols-2">
      {Object.entries(breakdowns).map(([name,rows])=><Breakdown key={name} title={name.replace(/^\w/,l=>l.toUpperCase())} rows={rows as any[]}/>)}
    </div>}
    {view==="work queue"&&<div className="space-y-4">
      <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm"><CardHeader><CardTitle className="text-xl">Historical task reconciliation · operator approval only</CardTitle></CardHeader><CardContent>
        <p className="text-base leading-relaxed text-[#475569]">{formatNumber(summary.open)} open tasks, {formatNumber(summary.overdue)} overdue. No old tasks were automatically removed.</p>
        <div className="mt-3 flex flex-wrap gap-2">{Object.entries(summary.byCategory||{}).map(([key,value])=><Badge key={key} variant="outline" className="text-sm">{key.replaceAll("_"," ")}: {String(value)}</Badge>)}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={busy||!selectedTasks.length} variant="outline" onClick={async()=>{
            const result=await post("/api/admin/outreach-completion/tasks/reconcile",{dryRun:true,taskIds:selectedTasks});
            if(result)setTaskPreview(result);
          }}>Dry-run selected ({selectedTasks.length})</Button>
          <Button disabled={busy||!taskPreview||taskPreview.reviewed?.length!==selectedTasks.length} className="bg-[#1D4ED8] text-white hover:bg-[#2563EB]"
            onClick={async()=>{
              if(!window.confirm("Dismiss the selected, eligible historical tasks? This action is audited and does not delete email history."))return;
              const result=await post("/api/admin/outreach-completion/tasks/reconcile",{dryRun:false,taskIds:selectedTasks});
              if(result)void load();
            }}>Confirm reviewed dismissal</Button>
        </div>
        <div className="mt-5 max-h-[550px] overflow-auto"><table className="min-w-full text-base"><thead><tr className="border-b text-left"><th className="py-2">Review</th><th>Task</th><th>Classification</th><th>Due date</th></tr></thead><tbody>
          {(review?.items||[]).map((task:any)=><tr key={task.id} className="border-b border-[#E2E8F0]">
            <td className="py-3"><input aria-label={"Select task "+task.title} type="checkbox" disabled={!actionCategories.has(task.category)} checked={selectedTasks.includes(task.id)}
              onChange={e=>{setTaskPreview(null);setSelectedTasks(old=>e.target.checked?[...old,task.id].slice(0,50):old.filter(id=>id!==task.id));}}/></td>
            <td className="py-3 pr-4 font-medium">{task.title}</td>
            <td>{task.category.replaceAll("_"," ")}</td><td>{task.dueAt?new Date(task.dueAt).toLocaleDateString():"N/A"}</td>
          </tr>)}
        </tbody></table></div>
      </CardContent></Card>
    </div>}
    {view==="qualification"&&<div className="grid gap-4 xl:grid-cols-2">
      <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm"><CardHeader><CardTitle className="text-xl">Historical evidence-based scoring</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-base text-[#475569]">Recalculate up to 100 prospects per batch. Unknown information stays at zero; scoring never implies permission to contact.</p>
        <label className="block text-base font-medium">Offset
          <Input type="number" min={0} value={scoreOffset} onChange={e=>setScoreOffset(Math.max(0,Number(e.target.value)||0))}/></label>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={async()=>{
            const result=await post("/api/admin/outreach-completion/rescore",{dryRun:true,offset:scoreOffset,limit:50,onlyUnscored:true});
            if(result)setScorePreview(result);
          }}>Preview next 50</Button>
          <Button disabled={busy||!scorePreview||scorePreview.offset!==scoreOffset} className="bg-[#1D4ED8] text-white hover:bg-[#2563EB]"
            onClick={async()=>{
              if(!window.confirm("Write evidence-based v2 scores for this batch? Missing evidence scores zero."))return;
              const result=await post("/api/admin/outreach-completion/rescore",{dryRun:false,offset:scoreOffset,limit:50,onlyUnscored:true});
              if(result){setScoreOffset(scoreOffset+50);setScorePreview(null);void load();}
            }}>Save reviewed batch</Button>
        </div>
        {scorePreview&&<div className="max-h-72 overflow-auto rounded-xl border border-[#E2E8F0] p-3">
          {(scorePreview.preview||[]).map((row:any)=><p key={row.id} className="border-b py-2 text-base">{row.name} — {row.score}/100, {row.category}, {row.nextAction}</p>)}
          {!scorePreview.preview?.length&&<p className="text-base text-[#475569]">No records in this batch.</p>}
        </div>}
      </CardContent></Card>
      <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm"><CardHeader><CardTitle className="text-xl">Operator-confirmed website verification</CardTitle></CardHeader><CardContent className="space-y-3">
        <p className="text-base text-[#475569]">Provide a genuine public source, date, finding and method. A missing domain does not prove no website.</p>
        <Input placeholder="Prospect UUID" value={website.prospectId} onChange={e=>setWebsite(old=>({...old,prospectId:e.target.value}))}/>
        <select aria-label="Website status" className="w-full rounded-xl border border-[#E2E8F0] bg-white p-3 text-base"
          value={website.websiteStatus} onChange={e=>setWebsite(old=>({...old,websiteStatus:e.target.value}))}>
          {["unknown","no_website","weak","average","strong"].map(v=><option key={v} value={v}>{v.replaceAll("_"," ")}</option>)}
        </select>
        <Input placeholder="Evidence URL (https://...)" value={website.sourceUrl} onChange={e=>setWebsite(old=>({...old,sourceUrl:e.target.value}))}/>
        <Input placeholder="Research method" value={website.method} onChange={e=>setWebsite(old=>({...old,method:e.target.value}))}/>
        <Textarea placeholder="Detailed, verified finding" value={website.finding} onChange={e=>setWebsite(old=>({...old,finding:e.target.value}))}/>
        <label className="block text-base font-medium">Confidence
          <select className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white p-3"
            value={website.confidence} onChange={e=>setWebsite(old=>({...old,confidence:e.target.value}))}>
            {["low","medium","high"].map(v=><option key={v} value={v}>{v}</option>)}</select>
        </label>
        <label className="flex gap-3 text-base leading-relaxed"><input type="checkbox" checked={website.reviewedEvidence} onChange={e=>setWebsite(old=>({...old,reviewedEvidence:e.target.checked}))}/>
          I personally reviewed this evidence and did not infer website status from a missing domain.</label>
        <Button disabled={busy||!website.reviewedEvidence} className="w-full bg-[#1D4ED8] text-white hover:bg-[#2563EB]"
          onClick={async()=>{
            const result=await post("/api/admin/outreach-completion/website-evidence",website);
            if(result){toast.success("Website evidence recorded.");void load();}
          }}>Save verified evidence</Button>
      </CardContent></Card>
    </div>}
    {view==="experiments"&&<div className="grid gap-4 xl:grid-cols-2">
      <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm"><CardHeader><CardTitle className="text-xl">Create an A/B copy experiment</CardTitle></CardHeader><CardContent className="space-y-3">
        <p className="text-base text-[#475569]">No emails are sent. Experiment drafts and assignments are for later operator-controlled messaging.</p>
        <Input placeholder="Experiment name" value={experiment.name} onChange={e=>setExperiment(old=>({...old,name:e.target.value}))}/>
        <Textarea placeholder="Hypothesis" value={experiment.hypothesis} onChange={e=>setExperiment(old=>({...old,hypothesis:e.target.value}))}/>
        <Input placeholder="Target segment" value={experiment.segment} onChange={e=>setExperiment(old=>({...old,segment:e.target.value}))}/>
        {(["variantA","variantB"] as const).map(v=><div key={v} className="space-y-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="text-base font-semibold">{v==="variantA"?"Variant A":"Variant B"}</p>
          <Input placeholder="Subject" value={experiment[v].subject} onChange={e=>setExperiment(old=>({...old,[v]:{...old[v],subject:e.target.value}}))}/>
          <Textarea placeholder="Body" value={experiment[v].body} onChange={e=>setExperiment(old=>({...old,[v]:{...old[v],body:e.target.value}}))}/>
        </div>)}
        <Button className="w-full bg-[#1D4ED8] text-white hover:bg-[#2563EB]" disabled={busy} onClick={async()=>{
          const result=await post("/api/admin/outreach-completion/experiments",experiment);
          if(result)void load();
        }}>Save draft A/B test</Button>
      </CardContent></Card>
      <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm"><CardHeader><CardTitle className="text-xl">Assignments and measured results</CardTitle></CardHeader><CardContent className="space-y-3">
        <select aria-label="Experiment" className="w-full rounded-xl border border-[#E2E8F0] bg-white p-3 text-base"
          value={selectedExperiment} onChange={e=>setSelectedExperiment(e.target.value)}>
          <option value="">Select experiment</option>
          {(report?.experiments||[]).map((exp:any)=><option key={exp.id} value={exp.id}>{exp.name} ({exp.status})</option>)}
        </select>
        <Textarea placeholder="Prospect UUIDs, one per line" value={assignmentProspects} onChange={e=>setAssignmentProspects(e.target.value)}/>
        <Button variant="outline" disabled={busy||!selectedExperiment} onClick={async()=>{
          const ids=assignmentProspects.split(/[\s,]+/).map(x=>x.trim()).filter(Boolean).slice(0,100);
          const result=await post("/api/admin/outreach-completion/experiments/"+encodeURIComponent(selectedExperiment)+"/assign",{prospectIds:ids});
          if(result)void load();
        }}>Assign variants, no sending</Button>
        {(report?.experiments||[]).map((exp:any)=><div key={exp.id} className="rounded-xl border border-[#E2E8F0] p-4">
          <p className="font-semibold">{exp.name}</p>
          <p className="mt-1 text-base text-[#475569]">{exp.note}</p>
          {exp.variants?.map((v:any)=><p key={v.variant} className="mt-2 text-base">Variant {v.variant}: {v.assigned} assigned · {v.sent} sent · {v.humanReplies} human replies</p>)}
        </div>)}
      </CardContent></Card>
    </div>}
    {view==="revenue"&&<div className="grid gap-4 xl:grid-cols-2">
      <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm"><CardHeader><CardTitle className="text-xl">Record an evidence-backed sales milestone</CardTitle></CardHeader><CardContent className="space-y-3">
        <p className="text-base text-[#475569]">Manual milestone records are audited and never treated as provider-verified payment.</p>
        <Input placeholder="Prospect UUID" value={milestone.prospectId} onChange={e=>setMilestone(old=>({...old,prospectId:e.target.value}))}/>
        <select aria-label="Milestone type" className="w-full rounded-xl border border-[#E2E8F0] bg-white p-3"
          value={milestone.eventType} onChange={e=>setMilestone(old=>({...old,eventType:e.target.value}))}>
          {["qualified_conversation","meeting_confirmed","proposal_sent","proposal_accepted","customer_won","customer_lost"].map(v=><option value={v} key={v}>{v.replaceAll("_"," ")}</option>)}
        </select>
        <Textarea placeholder="Specific evidence and explanation" value={milestone.notes} onChange={e=>setMilestone(old=>({...old,notes:e.target.value}))}/>
        <div className="grid grid-cols-2 gap-3"><Input placeholder="Amount, optional" type="number" min="0" value={milestone.amount} onChange={e=>setMilestone(old=>({...old,amount:e.target.value}))}/>
          <Input placeholder="Currency" value={milestone.currency} onChange={e=>setMilestone(old=>({...old,currency:e.target.value.toUpperCase()}))}/></div>
        <Button className="w-full bg-[#1D4ED8] text-white hover:bg-[#2563EB]" disabled={busy} onClick={async()=>{
          if(!window.confirm("Record this manually verified milestone without claiming a paid customer?"))return;
          const result=await post("/api/admin/outreach-completion/attribution",{
            prospectId:milestone.prospectId,eventType:milestone.eventType,notes:milestone.notes,
            occurredAt:new Date().toISOString(),
            ...(milestone.amount?{amount:Number(milestone.amount),currency:milestone.currency}:{})
          });
          if(result)void load();
        }}>Record milestone</Button>
      </CardContent></Card>
      <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm"><CardHeader><CardTitle className="text-xl">Reconcile an actual Stripe payment</CardTitle></CardHeader><CardContent className="space-y-3">
        <p className="text-base leading-relaxed text-[#475569]">The server retrieves the Stripe invoice, checks it was paid, and matches the customer to the converted business. No sales can be fabricated manually.</p>
        <Input placeholder="Converted prospect UUID" value={invoice.prospectId} onChange={e=>setInvoice(old=>({...old,prospectId:e.target.value}))}/>
        <Input placeholder="Stripe invoice ID: in_..." value={invoice.invoiceId} onChange={e=>setInvoice(old=>({...old,invoiceId:e.target.value}))}/>
        <Button variant="outline" disabled={busy} onClick={async()=>{
          const result=await post("/api/admin/outreach-completion/reconcile-stripe-invoice",invoice);
          if(result)void load();
        }}>Verify invoice in Stripe</Button>
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="font-semibold">Verified amounts by currency</p>
          {Object.entries(metrics.verifiedRevenueByCurrency||{}).map(([currency,value])=><p key={currency} className="mt-2 text-base">{currency}: {formatNumber(value)}</p>)}
          {!Object.keys(metrics.verifiedRevenueByCurrency||{}).length&&<p className="mt-2 text-base text-[#475569]">No confirmed paid invoices have been linked yet.</p>}
        </div>
      </CardContent></Card>
    </div>}
    <footer className="space-y-2 border-t border-[#E2E8F0] pt-4 text-base leading-relaxed text-[#475569]">
      {(report?.caveats||[]).map((caveat:string)=><p key={caveat} className="flex gap-2"><CheckCircle2 aria-hidden className="mt-1 h-4 w-4 shrink-0 text-[#1D4ED8]"/>{caveat}</p>)}
      <p>This administrative workspace uses the site's cool slate canvas, bordered white cards, royal-blue primary actions and readable 16px body typography.</p>
    </footer>
  </section>;
}
