import React, { useState, useEffect } from "react";
import { BrainCircuit, Cpu, Zap, Activity, Shield, AlertTriangle, Loader2, CheckCircle2, ChevronRight, Search, Globe, Target, Download, FileText, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import { normalizeWebsiteAuditResult } from "../../lib/websiteAudit";

export function NeuralAuditor() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [auditing, setAuditing] = useState(false);
  const [auditStep, setAuditStep] = useState(0);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("audit_reports")
        .select(`
          *,
          prospect:prospects(*)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentAudits(data || []);
    } catch (error) {
      console.error("Error fetching audits:", error);
    } finally {
      setLoading(false);
    }
  };

  const runAudit = async () => {
    if (!url) {
      toast.error("Please enter a domain URL");
      return;
    }

    try {
      setAuditing(true);
      setAuditStep(1);
      
      setAuditStep(2);

      const domain = url.replace(/^https?:\/\//, "").split("/")[0];
      
      // 1. Check if prospect exists or create a temporary one
      let prospectId;
      const { data: existingProspect } = await supabase
        .from("prospects")
        .select("id")
        .eq("domain", domain)
        .maybeSingle();

      if (existingProspect) {
        prospectId = existingProspect.id;
      } else {
        const { data: newProspect, error: pError } = await supabase
          .from("prospects")
          .insert([{ name: domain.split(".")[0], domain: domain, website_status: "unknown" }])
          .select()
          .single();
        
        if (pError) throw pError;
        prospectId = newProspect.id;
      }

      setAuditStep(3);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Your admin session has expired. Sign in again and retry.");
      }

      const auditResponse = await fetch("/api/admin/website-audit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ url: /^https?:\/\//i.test(url) ? url : `https://${url}` }),
      });
      const auditPayload = await auditResponse.json().catch(() => ({}));
      if (auditResponse.status === 429) {
        const retryAfter = auditResponse.headers.get("Retry-After");
        throw new Error(
          retryAfter
            ? `Audit limit reached for this admin account. Retry in about ${Math.max(1, Math.ceil(Number(retryAfter) / 60))} minute(s).`
            : "Audit limit reached for this admin account. Please retry shortly.",
        );
      }
      if (!auditResponse.ok || !auditPayload?.report) throw new Error(auditPayload?.error || "Website analysis failed");
      const report = normalizeWebsiteAuditResult(auditPayload.report);
      setAuditStep(4);

      // 3. Save report
      const { error: rError } = await supabase
        .from("audit_reports")
        .insert([{
          prospect_id: prospectId,
          score: null,
          report_data: report
        }]);

      if (rError) throw rError;

      // 4. Update prospect
      await supabase
        .from("prospects")
        .update({
          audit_score: null,
          last_audit_at: new Date().toISOString(),
          website_status: "unknown",
          opportunity_level: report.findings.some((finding) => finding.priority === "high") ? "high" : "medium",
        })
        .eq("id", prospectId);

      setAuditing(false);
      setAuditStep(0);
      setUrl("");
      await fetchAudits();
      toast.success(`Website growth review complete. ${report.findings.length} opportunities recorded.`);

    } catch (error: any) {
      console.error("Audit failed:", error);
      toast.error(error.message || "Audit engine failure");
      setAuditing(false);
      setAuditStep(0);
    }
  };

  const handleViewReport = (audit: any) => {
    setSelectedAudit({
      ...audit,
      report_data: normalizeWebsiteAuditResult(audit.report_data),
    });
    setShowReport(true);
  };

  const downloadPDF = () => {
    if (!selectedAudit?.report_data) return;
    const blob = new Blob([JSON.stringify(selectedAudit.report_data, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `website-audit-${selectedAudit.prospect?.domain || "report"}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
    toast.success("Audit report downloaded.");
  };

  const steps = [
    { title: "Initializing Scan", desc: "Preparing website checks..." },
    { title: "Analyzing DOM", desc: "Identifying structural weaknesses..." },
    { title: "Checking Performance", desc: "Measuring core web vitals..." },
    { title: "Reviewing Discoverability", desc: "Identifying observable search and content gaps..." }
  ];

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-6 pt-2 sm:space-y-8 sm:pt-4">
      <div className="flex w-full min-w-0 flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="break-words text-3xl font-black italic uppercase leading-tight tracking-tighter text-slate-900 dark:text-white sm:text-4xl">
            Website <span className="text-indigo-600">Audit</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Deep-tissue analysis of business infrastructure.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchAudits}
          className="rounded-xl border-slate-200"
        >
          Refresh Feed
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.9fr)]">
        <Card className="min-w-0 overflow-hidden rounded-3xl border-none shadow-xl shadow-slate-100 ring-1 ring-slate-100 sm:rounded-[2.5rem]">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30 p-5 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black italic uppercase italic tracking-tight dark:text-white">Active Audit Engine</CardTitle>
                <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scanning local business ecosystems for technical vulnerabilities</CardDescription>
              </div>
              {auditing && <Badge className="animate-pulse bg-indigo-600">ENGINE ACTIVE</Badge>}
            </div>
          </CardHeader>
          <CardContent className="flex min-h-[360px] min-w-0 flex-col items-center justify-center p-5 text-center sm:min-h-[400px] sm:p-8 lg:p-10">
            {auditing ? (
              <div className="space-y-8 w-full max-w-sm">
                <div className="relative mx-auto h-32 w-32">
                   <div className="absolute inset-0 bg-indigo-500/20 blur-3xl animate-pulse rounded-full" />
                   <div className="relative h-full w-full rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white shadow-2xl">
                      <Cpu className="h-12 w-12 animate-spin duration-[3000ms]" />
                   </div>
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black italic uppercase tracking-tight text-slate-900 dark:text-white">{steps[auditStep-1]?.title}</h3>
                   <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">{steps[auditStep-1]?.desc}</p>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                   <div 
                    className="h-full bg-indigo-600 transition-all duration-1000"
                    style={{ width: `${(auditStep / steps.length) * 100}%` }}
                   />
                </div>
              </div>
            ) : (
              <div className="w-full min-w-0 space-y-8 sm:space-y-10">
                <div className="h-24 w-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
                  <BrainCircuit className="h-12 w-12 text-indigo-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black italic uppercase tracking-tight text-slate-900 dark:text-white">System Ready</h3>
                  <p className="text-slate-400 font-bold text-sm max-w-xs mx-auto">Enter a domain or select a prospect to run a structured website audit.</p>
                </div>
                <div className="mx-auto flex w-full max-w-xl min-w-0 flex-col gap-3 sm:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="h-14 w-full min-w-0 rounded-2xl border border-slate-100 bg-slate-50 pl-12 pr-4 font-bold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                  <Button 
                    onClick={runAudit}
                    className="h-14 w-full shrink-0 rounded-2xl bg-slate-900 px-6 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800 sm:w-auto sm:px-8"
                  >
                    Audit Site
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card className="min-w-0 overflow-hidden rounded-3xl border-none shadow-sm ring-1 ring-slate-100 sm:rounded-[2.5rem]">
            <CardHeader className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-300">Recent Vulnerabilities</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               {loading ? (
                 <div className="p-12 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-300" />
                 </div>
               ) : recentAudits.length === 0 ? (
                 <div className="p-12 text-center text-slate-400 font-bold text-[10px] uppercase">No recent scans</div>
               ) : (
                 <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentAudits.map((audit) => (
                      <div key={audit.id} className="group min-w-0 p-5 transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50">
                         <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-[10px] font-black italic uppercase tracking-tight text-slate-900 dark:text-white">
                              {audit.prospect?.name || 'Unknown'}
                            </span>
                            <Badge className="border-none bg-indigo-50 text-[9px] font-black text-indigo-700" variant="outline">
                              {normalizeWebsiteAuditResult(audit.report_data).findings.length} opportunities
                            </Badge>
                         </div>
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {format(new Date(audit.created_at), "MMM d, HH:mm")}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-2 text-[8px] font-black uppercase tracking-widest hover:text-indigo-600 p-0"
                              onClick={() => handleViewReport(audit)}
                            >
                              View Report
                            </Button>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </CardContent>
            <CardFooter className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
               <Button 
                variant="ghost" 
                className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600"
                onClick={() => navigate("/admin/prospect_explorer")}
               >
                 Explore Audit Database
               </Button>
            </CardFooter>
          </Card>

          <Card className="relative min-w-0 overflow-hidden rounded-3xl border-none bg-indigo-600 text-white shadow-sm sm:rounded-[2.5rem]">
             <Target className="absolute -right-4 -bottom-4 h-24 w-24 text-white/10" />
             <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black italic uppercase italic tracking-tight">Outreach Ready</h4>
                  <p className="text-[10px] font-bold text-indigo-100 leading-relaxed uppercase tracking-widest">
                    Review prospects with completed evidence-based website growth reviews.
                  </p>
                </div>
                <Button 
                  className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-black uppercase tracking-widest text-[10px] h-10 rounded-xl"
                  onClick={() => navigate("/admin/outreach_lab")}
                >
                  Review Opportunities
                </Button>
             </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showReport} onOpenChange={setShowReport}>
         <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto rounded-3xl border-none bg-white p-0 sm:rounded-[3rem]">
            {selectedAudit && (
               <div className="flex flex-col h-full">
                  <div className="relative overflow-hidden bg-slate-900 p-6 text-white sm:p-10">
                     <BrainCircuit className="absolute -right-10 -bottom-10 h-64 w-64 text-white/5" />
                     <div className="relative z-10 space-y-6">
                        <div className="flex justify-between items-start">
                           <Badge className="bg-indigo-600 font-black px-4 py-1.5 rounded-full text-[10px] tracking-[0.2em] uppercase">WEBSITE GROWTH REVIEW</Badge>
                           <Button 
                             variant="ghost" 
                             className="text-white/40 hover:text-white"
                             onClick={() => setShowReport(false)}
                           >
                              <X className="h-6 w-6" />
                           </Button>
                        </div>
                        <div className="space-y-2">
                           <h2 className="break-words text-3xl font-black italic uppercase leading-tight tracking-tighter sm:text-5xl">
                              {selectedAudit.prospect?.name || selectedAudit.prospect?.domain || "Unknown Prospect"}
                           </h2>
                           <div className="flex items-center gap-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                              <span className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> {selectedAudit.prospect?.domain}</span>
                              <span className="flex items-center gap-1.5"><Activity className="h-3 w-3" /> {format(new Date(selectedAudit.created_at), "MMMM d, yyyy")}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-8 p-5 sm:space-y-12 sm:p-10 lg:p-12">
                     <div className="rounded-[2.5rem] border border-slate-100 bg-slate-50 p-8">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">What we found</p>
                        <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{selectedAudit.report_data.summary}</h3>
                        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">Consultant observations are kept separate from measured analytics and are never converted into an arbitrary rating.</p>
                     </div>

                     <div className="space-y-6">
                        <div className="flex items-center gap-3">
                           <Shield className="h-5 w-5 text-indigo-600" />
                           <h3 className="text-xl font-black italic uppercase italic tracking-tight">Growth opportunities</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                           {selectedAudit.report_data.findings.map((finding: any) => (
                              <div key={`${finding.category}-${finding.title}`} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                                 <div className="flex items-start justify-between gap-4">
                                    <div>
                                       <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">{finding.category}</p>
                                       <h4 className="mt-1 text-base font-black text-slate-950">{finding.title}</h4>
                                    </div>
                                    <Badge variant="outline" className="uppercase">{finding.priority}</Badge>
                                 </div>
                                 <div className="mt-5 grid gap-4 md:grid-cols-3">
                                    <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">What we found</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{finding.whatWeFound}</p></div>
                                    <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Why it matters</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{finding.whyItMatters}</p></div>
                                    <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Recommended improvement</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{finding.recommendation}</p></div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     <div className="flex flex-col gap-6 rounded-3xl bg-indigo-600 p-6 text-white shadow-2xl shadow-indigo-200 sm:rounded-[2.5rem] sm:p-8 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
                           <div className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                              <Zap className="h-8 w-8 text-white" />
                           </div>
                           <div>
                              <h4 className="text-xl font-semibold tracking-tight">Recommended next step</h4>
                              <p className="text-indigo-100 font-bold text-xs uppercase tracking-widest">Turn the observed findings into a clearer enquiry journey.</p>
                           </div>
                        </div>
                        <Button 
                          onClick={downloadPDF}
                          className="h-14 w-full shrink-0 rounded-2xl bg-white px-6 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 lg:w-auto lg:px-8"
                        >
                           <Download className="h-4 w-4 mr-2" />
                           Download audit data
                        </Button>
                     </div>
                  </div>
               </div>
            )}
         </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
