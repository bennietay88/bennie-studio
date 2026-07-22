import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { FileText, Search, MoreVertical, Clock, MessageSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { formatDate, cn } from "../../lib/utils";
import { WORDPRESS_PROJECT_STATUSES, WORDPRESS_PROJECT_STATUS_LABELS } from "../../constants/salesFlow";

export function CustomApplications() {
  const [wordpressLeads, setWordpressLeads] = useState<any[]>([]);
  const [legacyApplications, setLegacyApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const [{ data: wpData, error: wpError }, { data: legacyData, error: legacyError }] = await Promise.all([
        supabase.from("wordpress_project_leads").select("*").order("created_at", { ascending: false }),
        supabase.from("custom_website_applications").select("*").order("created_at", { ascending: false }),
      ]);

      if (wpError) throw wpError;
      if (legacyError && !legacyError.message.includes("custom_website_applications")) {
        console.warn("Legacy applications could not be loaded:", legacyError.message);
      }

      setWordpressLeads(wpData || []);
      setLegacyApplications(legacyError ? [] : legacyData || []);
    } catch (error: any) {
      console.error("Error fetching custom applications:", error);
      toast.error(error?.message || "Failed to load custom applications");
      setWordpressLeads([]);
      setLegacyApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const updateWordPressStatus = async (id: string, pipeline_status: string) => {
    try {
      const { error } = await supabase
        .from("wordpress_project_leads")
        .update({ pipeline_status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success(`WordPress lead moved to ${labelFor(pipeline_status)}`);
      fetchApplications();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update WordPress lead");
    }
  };

  const getLegacyBusinessName = (app: any) =>
    app.business_name ||
    app.requirements?.businessName ||
    app.requirements?.business_name ||
    app.requirements?.company ||
    "Unnamed application";

  const filteredWordPressLeads = wordpressLeads.filter((lead) => {
    const query = searchQuery.toLowerCase();
    return (
      lead.company_name?.toLowerCase().includes(query) ||
      lead.contact_name?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.business_type?.toLowerCase().includes(query)
    );
  });

  const filteredLegacyApps = legacyApplications.filter((app) => {
    const query = searchQuery.toLowerCase();
    return (
      getLegacyBusinessName(app).toLowerCase().includes(query) ||
      app.package_name?.toLowerCase().includes(query) ||
      app.profiles?.email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">
          WordPress <span className="text-indigo-600">Project Pipeline</span>
        </h1>
        <p className="mt-2 text-sm font-bold uppercase tracking-tight text-slate-400">
          Review quotation requests, prepare scope, track deposits, delivery, handover, and maintenance.
        </p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by company, contact, email, or business type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 rounded-2xl border-slate-200 bg-white pl-10"
          />
        </div>
        <Button variant="outline" onClick={fetchApplications} className="h-12 rounded-2xl border-slate-200 px-6">
          Refresh
        </Button>
      </div>

      <Card className="overflow-hidden rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/50">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="py-6 pl-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Lead</TableHead>
              <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Scope</TableHead>
              <TableHead className="py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Pipeline</TableHead>
              <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Submitted</TableHead>
              <TableHead className="py-6 pr-8 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <Clock className="mx-auto h-8 w-8 animate-spin text-indigo-400" />
                  <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Loading pipeline...</p>
                </TableCell>
              </TableRow>
            ) : filteredWordPressLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <FileText className="mx-auto h-8 w-8 text-slate-200" />
                  <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">No WordPress quotation requests found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredWordPressLeads.map((lead) => (
                <TableRow key={lead.id} className="group border-slate-50 hover:bg-slate-50/50">
                  <TableCell className="py-6 pl-8">
                    <div className="flex flex-col">
                      <span className="font-black tracking-tight text-slate-900">{lead.company_name}</span>
                      <span className="text-xs font-bold text-slate-400">{lead.contact_name} · {lead.email}</span>
                      <span className="text-xs font-bold text-slate-400">{lead.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs space-y-1">
                      <p className="text-sm font-bold text-slate-700">{lead.business_type}</p>
                      <p className="line-clamp-2 text-xs font-semibold text-slate-500">{lead.required_pages}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{lead.indicative_budget || "Budget not stated"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn("rounded-full border-none px-3 py-1 text-[8px] font-black uppercase tracking-widest shadow-sm", badgeClass(lead.pipeline_status))}>
                      {labelFor(lead.pipeline_status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-slate-500">{formatDate(lead.created_at)}</TableCell>
                  <TableCell className="py-6 pr-8 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 rounded-xl border border-transparent p-0 hover:border-slate-100 hover:bg-white">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="max-h-96 w-72 overflow-auto rounded-2xl border-slate-100 p-2 shadow-2xl">
                        <DropdownMenuLabel className="p-3 text-[10px] font-black uppercase text-slate-400">Move Pipeline</DropdownMenuLabel>
                        {WORDPRESS_PROJECT_STATUSES.map((status) => (
                          <DropdownMenuItem key={status} onClick={() => updateWordPressStatus(lead.id, status)} className="rounded-xl p-3">
                            {WORDPRESS_PROJECT_STATUS_LABELS[status]}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem onClick={() => { window.location.href = `mailto:${lead.email}`; }} className="rounded-xl p-3">
                          <MessageSquare className="mr-3 h-4 w-4 text-indigo-500" /> Contact prospect
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {filteredLegacyApps.length > 0 && (
        <Card className="rounded-[2rem] border-slate-100 p-6">
          <h2 className="text-lg font-black text-slate-900">Legacy Custom Applications</h2>
          <div className="mt-4 grid gap-3">
            {filteredLegacyApps.map((app) => (
              <div key={app.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="font-black text-slate-900">{getLegacyBusinessName(app)}</p>
                <p className="text-xs font-bold text-slate-500">{app.package_name || app.package_id || "Custom website"} · {app.status}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function labelFor(status: string) {
  return WORDPRESS_PROJECT_STATUS_LABELS[status as keyof typeof WORDPRESS_PROJECT_STATUS_LABELS] || status.replace(/_/g, " ");
}

function badgeClass(status: string) {
  if (["accepted", "deposit_paid", "launched", "maintenance"].includes(status)) return "bg-emerald-500 text-white";
  if (["lost"].includes(status)) return "bg-rose-500 text-white";
  if (["quotation_sent", "awaiting_decision", "final_payment"].includes(status)) return "bg-amber-500 text-white";
  if (["design", "development", "customer_review", "final_revisions"].includes(status)) return "bg-blue-600 text-white";
  return "bg-indigo-600 text-white";
}
