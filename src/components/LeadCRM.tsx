/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import {
  Users,
  Mail,
  Phone,
  Calendar,
  Trash2,
  MessageSquare,
  Search,
  Filter,
  Plus,
  X,
  Loader2,
  Globe,
  Clock,
  Activity,
  ExternalLink,
  Copy,
  Flame,
  Target,
  Zap,
  Lock,
} from "lucide-react";
import { EnquiryOutcome } from "./CustomerOutcomes";
import { Lead, LeadRemark } from "../types";
import { format } from "date-fns";
import { formatDate, generateId, cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "./ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { buildMonthlyLeadEngineReport, getLeadAutomationPlan, normalizeLeadStatus } from "../constants/leadAutomation";
import { useFeatures } from "../hooks/useFeatures";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export function LeadCRM() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { isMarketingCapabilityEnabled } = useFeatures();
  const followUpEnabled = isMarketingCapabilityEnabled("leadFollowUp");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadHistory, setLeadHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [saving, setSaving] = useState(false);
  const [remarks, setRemarks] = useState<LeadRemark[]>([]);
  const [newRemark, setNewRemark] = useState("");
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [submittingRemark, setSubmittingRemark] = useState(false);

  const calculateScore = (history: any[]) => {
    if (!history || history.length === 0) return 10;
    const uniquePages = new Set(history.map((h) => h.page_path)).size;
    const totalViews = history.length;
    let score = uniquePages * 15 + totalViews * 5;
    return Math.min(score, 100);
  };

  const fetchRemarks = async (leadId: string) => {
    setLoadingRemarks(true);
    try {
      const { data, error } = await supabase
        .from("lead_remarks")
        .select("*, profiles(full_name, avatar_url)")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRemarks(data || []);
    } catch (err) {
      console.error("Error fetching remarks:", err);
    } finally {
      setLoadingRemarks(false);
    }
  };

  const handleAddRemark = async () => {
    if (!selectedLead || !newRemark.trim() || !profile) return;
    setSubmittingRemark(true);
    try {
      const { data, error } = await supabase
        .from("lead_remarks")
        .insert([
          {
            lead_id: selectedLead.id,
            profile_id: profile.uid,
            remark: newRemark.trim(),
          },
        ])
        .select("*, profiles(full_name, avatar_url)")
        .single();

      if (error) throw error;
      setRemarks([data, ...remarks]);
      setNewRemark("");
      toast.success("Remark added");
    } catch (err) {
      console.error("Error adding remark:", err);
      toast.error("Failed to add remark");
    } finally {
      setSubmittingRemark(false);
    }
  };

  useEffect(() => {
    if (selectedLead) {
      fetchRemarks(selectedLead.id);
    } else {
      setRemarks([]);
    }
  }, [selectedLead?.id]);

  useEffect(() => {
    if (!profile?.businessId) {
      setLoading(false);
      return;
    }

    const fetchLeads = async () => {
      try {
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .eq("business_id", profile.businessId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setLeads(data.map(mapLead));
      } catch (err) {
        console.error("Error fetching leads:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();

    const channel = supabase
      .channel("lead-crm-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
          filter: `business_id=eq.${profile.businessId}`,
        },
        () => fetchLeads(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.businessId]);

  const mapLead = (dbLead: any): Lead => ({
    id: dbLead.id,
    businessId: dbLead.business_id,
    name: dbLead.name,
    email: dbLead.email,
    phone: dbLead.phone,
    message: dbLead.message,
    status: normalizeLeadStatus(dbLead.status),
    visitorId: dbLead.visitor_id,
    source: dbLead.source,
    score: dbLead.score,
    notes: dbLead.notes,
    rawFields: dbLead.raw_fields || {},
    automationScore: dbLead.automation_score ?? dbLead.raw_fields?.leadAutomation?.score,
    automationNextAction: dbLead.automation_next_action ?? dbLead.raw_fields?.leadAutomation?.nextAction,
    automationTemperature: dbLead.automation_temperature ?? dbLead.raw_fields?.leadAutomation?.temperature,
    lastFollowUpAt: dbLead.last_follow_up_at ? new Date(dbLead.last_follow_up_at).getTime() : undefined,
    nextFollowUpAt: dbLead.next_follow_up_at ? new Date(dbLead.next_follow_up_at).getTime() : undefined,
    lastActiveAt: dbLead.last_active_at ? new Date(dbLead.last_active_at).getTime() : undefined,
    createdAt: new Date(dbLead.created_at).getTime(),
  });

  const updateStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus })
        .eq("id", leadId);
      if (error) throw error;

      if (newStatus === "closed") {
        await handleAffiliateConversion(leadId);
      }
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Failed to update status");
    }
  };

  const handleAffiliateConversion = async (leadId: string) => {
    try {
      // 1. Find if there's a referral for this lead
      const { data: referral } = await supabase
        .from("affiliate_referrals")
        .select("*, affiliates(*)")
        .eq("lead_id", leadId)
        .eq("status", "pending")
        .maybeSingle();

      if (!referral) return;

      const affiliate = referral.affiliates;
      const businessId = affiliate.business_id;

      // 2. Fetch program settings
      const { data: program } = await supabase
        .from("affiliate_programs")
        .select("*")
        .eq("business_id", businessId)
        .single();

      if (!program || !program.is_enabled) return;

      // 3. Fetch tiers
      const { data: tiers } = await supabase
        .from("commission_tiers")
        .select("*")
        .eq("program_id", program.id)
        .order("requirement_value", { ascending: false });

      // 4. Calculate commission
      let commissionRate = program.base_commission_rate;

      // Check for applicable tier based on total sales/referrals
      if (tiers && tiers.length > 0) {
        for (const tier of tiers) {
          let meetsRequirement = false;
          if (
            tier.requirement_type === "referral_count" &&
            affiliate.total_referrals >= tier.requirement_value
          ) {
            meetsRequirement = true;
          } else if (
            tier.requirement_type === "revenue_generated" &&
            affiliate.total_earnings >= tier.requirement_value
          ) {
            meetsRequirement = true;
          }

          if (meetsRequirement) {
            commissionRate = tier.commission_rate;
            break; // Found highest applicable tier due to ordering
          }
        }
      }

      // 5. Update referral and affiliate stats
      const saleAmount = 100; // Placeholder: In a real app, this would be the actual transaction value
      const commissionAmount = saleAmount * commissionRate;

      await supabase
        .from("affiliate_referrals")
        .update({
          status: "converted",
          sale_amount: saleAmount,
          commission_amount: commissionAmount,
        })
        .eq("id", referral.id);

      await supabase
        .from("affiliates")
        .update({
          total_earnings: affiliate.total_earnings + commissionAmount,
          unpaid_earnings: affiliate.unpaid_earnings + commissionAmount,
          total_referrals: affiliate.total_referrals + 1,
        })
        .eq("id", affiliate.id);
    } catch (err) {
      console.error("Affiliate conversion processing failed:", err);
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      const { error } = await supabase.from("leads").delete().eq("id", leadId);
      if (error) throw error;
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      if (selectedLead?.id === leadId) setSelectedLead(null);
      toast.success("Lead deleted successfully");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete lead");
    }
  };

  const handleAddLead = async () => {
    if (!profile?.businessId || !newLead.name || !newLead.email) return;
    setSaving(true);
    try {
      const response = await fetch("/api/leads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: profile.businessId,
          ...newLead,
          source: "manual_entry"
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add lead");
      }

      setShowAddModal(false);
      setNewLead({ name: "", email: "", phone: "", message: "" });
      toast.success("Lead added successfully");
    } catch (error: any) {
      console.error("Add lead failed:", error);
      toast.error(error.message || "Failed to add lead");
    } finally {
      setSaving(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const leadEngineReport = buildMonthlyLeadEngineReport(leads);
  const selectedLeadAutomation = followUpEnabled && selectedLead ? getLeadAutomationPlan(selectedLead, leadHistory) : null;

  const copyText = async (text: string, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch (err) {
      console.error("Clipboard failed:", err);
      toast.error("Copy failed");
    }
  };

  const saveAutomationSnapshot = async (lead: Lead, plan = getLeadAutomationPlan(lead, leadHistory), action = "automation_snapshot") => {
    if (!followUpEnabled) {
      toast.error("Lead follow-up tools are not included in this business plan.");
      return;
    }

    const payload = {
      leadAutomation: {
        score: plan.score,
        temperature: plan.temperature,
        nextAction: plan.nextAction,
        recommendedStatus: plan.recommendedStatus,
        urgencyReason: plan.urgencyReason,
        savedAt: new Date().toISOString(),
        action,
      },
    };
    const nextFollowUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const updatePayloads = [
      {
        score: plan.score,
        automation_score: plan.score,
        automation_temperature: plan.temperature,
        automation_next_action: plan.nextAction,
        next_follow_up_at: nextFollowUpAt,
        raw_fields: { ...(lead.rawFields || {}), ...payload },
      },
      {
        score: plan.score,
        raw_fields: { ...(lead.rawFields || {}), ...payload },
      },
      {
        score: plan.score,
      },
    ];

    let saved = false;
    for (const updatePayload of updatePayloads) {
      const { error } = await supabase.from("leads").update(updatePayload).eq("id", lead.id);
      if (!error) {
        saved = true;
        break;
      }
      const message = error.message.toLowerCase();
      if (!message.includes("column") && !message.includes("schema cache") && !message.includes("raw_fields")) {
        throw error;
      }
    }

    if (saved) {
      const { error: eventError } = await supabase.from("lead_follow_up_events").insert({
        business_id: lead.businessId,
        lead_id: lead.id,
        profile_id: profile?.uid || null,
        channel: lead.phone ? "whatsapp" : "email",
        event_type: action,
        script: lead.phone ? plan.whatsappOpen : plan.followUpNextDay,
        status: "queued",
        scheduled_at: nextFollowUpAt,
        metadata: {
          score: plan.score,
          temperature: plan.temperature,
          nextAction: plan.nextAction,
        },
      });
      if (eventError && !eventError.message.includes("lead_follow_up_events")) {
        console.warn("Follow-up event persistence failed:", eventError.message);
      }
      setLeads((current) => current.map((item) => item.id === lead.id ? {
        ...item,
        score: plan.score,
        automationScore: plan.score,
        automationTemperature: plan.temperature,
        automationNextAction: plan.nextAction,
        nextFollowUpAt: new Date(nextFollowUpAt).getTime(),
        rawFields: { ...(item.rawFields || {}), ...payload },
      } : item));
      if (selectedLead?.id === lead.id) {
        setSelectedLead((current) => current ? {
          ...current,
          score: plan.score,
          automationScore: plan.score,
          automationTemperature: plan.temperature,
          automationNextAction: plan.nextAction,
          nextFollowUpAt: new Date(nextFollowUpAt).getTime(),
          rawFields: { ...(current.rawFields || {}), ...payload },
        } : current);
      }
      toast.success("Automation plan saved to lead.");
    }
  };

  const exportLeadsCsv = () => {
    const rows = [
      ["Name", "Email", "Phone", "Status", "Source", "Message", "Created At"],
      ...filteredLeads.map((lead) => [
        lead.name,
        lead.email,
        lead.phone || "",
        lead.status || "",
        lead.source || "",
        lead.message || "",
        lead.createdAt ? new Date(lead.createdAt).toISOString() : "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bennie-leads.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Lead CSV exported.");
  };

  useEffect(() => {
    if (!selectedLead || !selectedLead.visitorId) {
      setLeadHistory([]);
      return;
    }

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const { data, error } = await supabase
          .from("page_views")
          .select("*")
          .eq("visitor_id", selectedLead.visitorId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        setLeadHistory(data || []);
      } catch (err) {
        console.error("Error fetching lead history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [selectedLead?.id]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "contacted": return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
      case "qualified": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "meeting": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "engaged": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "closed": return "bg-green-600 text-white border-none";
      default: return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-8 pt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 font-black text-[10px] uppercase py-1 mb-2 tracking-widest">
            Revenue Pipeline
          </Badge>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Lead Manager.</h1>
          <p className="text-slate-500 mt-1 font-bold text-xs uppercase tracking-tight">
            Managing {leads.length} potential growth opportunities
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search prospects..."
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-indigo-100 outline-none w-64 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-indigo-100 shadow-sm transition-all"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Pipeline: All</option>
            <option value="new">New Entry</option>
            <option value="contacted">In Discussion</option>
            <option value="qualified">Qualified</option>
            <option value="meeting">Meeting</option>
            <option value="engaged">Engaged</option>
            <option value="closed">Closed</option>
          </select>
          <Button
            onClick={() => setShowAddModal(true)}
            className="h-11 gap-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200"
          >
            <Plus className="h-4 w-4" /> Add Prospect
          </Button>
          <Button
            variant="outline"
            onClick={exportLeadsCsv}
            className="h-11 gap-2 rounded-xl border-slate-200 bg-white font-black uppercase text-[10px] tracking-widest"
          >
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["New", leads.filter((lead) => lead.status === "new").length],
          ["Hot Leads", leadEngineReport.hot],
          ["Closed", leads.filter((lead) => lead.status === "closed").length],
          ["Needs Follow-up", leads.filter((lead) => ["new", "contacted"].includes(lead.status || "")).length],
        ].map(([label, value]) => (
          <Card key={label} className="rounded-2xl border-slate-100">
            <CardContent className="p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
              <p className="mt-2 text-3xl font-black italic text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[2rem] border-emerald-100 bg-emerald-50/60">
        <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-700" />
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Recurring lead engine</p>
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Automation queue for monthly revenue retention</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{leadEngineReport.nextRecurringRevenueAction}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Hot", leadEngineReport.hot],
              ["Warm", leadEngineReport.warm],
              ["Conv.", `${leadEngineReport.conversionRate}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white p-4 text-center shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <motion.div
        variants={fadeInUp}
        className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-indigo-100/20 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <th className="px-10 py-6 border-b border-slate-100">Prospect</th>
                <th className="px-10 py-6 border-b border-slate-100">Metadata</th>
                <th className="px-10 py-6 border-b border-slate-100 text-center">Status</th>
                <th className="px-10 py-6 border-b border-slate-100">Entry Date</th>
                <th className="px-10 py-6 border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLeads.map((lead) => (
                (() => {
                  const automation = getLeadAutomationPlan(lead);
                  return (
                <tr
                  key={lead.id}
                  className="hover:bg-indigo-50/30 transition-all group"
                >
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className="h-14 w-14 shrink-0 rounded-2xl bg-slate-950 flex items-center justify-center text-indigo-400 font-black text-xl shadow-lg group-hover:scale-105 transition-transform">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div
                        className="cursor-pointer min-w-0"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <p className="font-black text-slate-900 text-sm uppercase tracking-tight truncate">
                          {lead.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[8px] font-bold uppercase py-0 px-2 text-slate-400 border-slate-200">
                            {lead.source || "Organic"}
                          </Badge>
                          <Badge className={cn(
                            "text-[8px] font-black uppercase py-0 px-2 border",
                            automation.temperature === "Hot" ? "bg-rose-50 text-rose-700 border-rose-100" :
                              automation.temperature === "Warm" ? "bg-amber-50 text-amber-700 border-amber-100" :
                                "bg-slate-50 text-slate-500 border-slate-100",
                          )}>
                            {automation.temperature} {automation.score}
                          </Badge>
                          <span className="text-[10px] font-medium text-slate-400 truncate max-w-[150px]">
                            {lead.message || "Implicit enquiry"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <Mail className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <Phone className="h-3.5 w-3.5 text-indigo-400" />
                          {lead.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <Badge
                      className={cn(
                        "rounded-full px-4 py-1 text-[9px] font-black uppercase tracking-widest border",
                        getStatusBadge(lead.status)
                      )}
                    >
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 italic">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(lead.createdAt), "MMM dd, yyyy")}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      {lead.phone && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`, '_blank')}
                          className="h-9 w-9 p-0 rounded-xl text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 shadow-sm"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                      <select
                        className="text-[9px] font-black uppercase tracking-widest border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-600 focus:ring-4 focus:ring-indigo-100 outline-none transition-all shadow-sm"
                        value={lead.status}
                        onChange={(e) =>
                          updateStatus(lead.id, e.target.value as any)
                        }
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="meeting">Meeting</option>
                        <option value="engaged">Engaged</option>
                        <option value="closed">Closed</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLead(lead.id)}
                        className="h-9 w-9 p-0 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                  );
                })()
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200">
                        <Users className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 uppercase italic">Inquiry Matrix Empty</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Synthesizing traffic vectors...
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* View Lead Modal */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Lead Insights</h3>
                    <p className="text-xs text-slate-500 font-medium">Detailed view and activity history</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl hover:bg-slate-100"
                  onClick={() => setSelectedLead(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <Tabs defaultValue="details" className="w-full">
                <div className="px-8 bg-slate-50/50 border-b border-slate-100">
                  <TabsList className="bg-transparent border-none p-0 gap-8">
                    <TabsTrigger 
                      value="details" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-0 py-4 text-sm font-bold"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger 
                      value="notes" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-0 py-4 text-sm font-bold gap-2"
                    >
                      Team Remarks
                      {remarks.length > 0 && (
                        <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md text-[10px]">
                          {remarks.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="automation"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-0 py-4 text-sm font-bold gap-2"
                    >
                      Automation
                    </TabsTrigger>
                    <TabsTrigger 
                      value="history" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-0 py-4 text-sm font-bold gap-2"
                    >
                      History Remarks
                      {leadHistory.length > 0 && (
                        <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md text-[10px]">
                          {leadHistory.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-8 h-[500px]">
                  <TabsContent value="details" className="mt-0 h-full overflow-y-auto">
                    <EnquiryOutcome key={selectedLead.id} leadId={selectedLead.id}/>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="h-20 w-20 rounded-3xl bg-indigo-100 flex items-center justify-center text-indigo-700 text-3xl font-black shadow-inner">
                            {selectedLead.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-1">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                              {selectedLead.name}
                            </h2>
                            <div className="flex items-center gap-2">
                              <select 
                                value={selectedLead.status}
                                onChange={(e) => updateStatus(selectedLead.id, e.target.value as any)}
                                className="text-[10px] font-bold uppercase tracking-widest bg-white border border-slate-200 rounded-full px-3 py-1 outline-none focus:ring-2 focus:ring-indigo-100"
                              >
                                <option value="new">New Lead</option>
                                <option value="contacted">Contacted</option>
                                <option value="qualified">Qualified</option>
                                <option value="engaged">Engaged</option>
                                <option value="meeting">Meeting Set</option>
                                <option value="closed">Closed / Won</option>
                              </select>
                              <span className="text-xs text-slate-400 font-medium flex items-center gap-1 ml-2">
                                <Calendar className="h-3 w-3" /> Received {formatDate(selectedLead.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="inline-flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Interest Score</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full transition-all duration-1000",
                                    calculateScore(leadHistory) > 70 ? "bg-emerald-500" : calculateScore(leadHistory) > 30 ? "bg-amber-500" : "bg-indigo-500"
                                  )}
                                  style={{ width: `${calculateScore(leadHistory)}%` }}
                                />
                              </div>
                              <span className="text-lg font-black text-slate-900">{calculateScore(leadHistory)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                          <p className="text-sm text-slate-900 font-bold truncate">{selectedLead.email}</p>
                        </div>
                        <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                          <p className="text-sm text-slate-900 font-bold">{selectedLead.phone || "None"}</p>
                        </div>
                        <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source</p>
                          <p className="text-sm text-slate-900 font-bold flex items-center gap-1.5">
                            <Globe className="h-3 w-3 text-indigo-500" />
                            {selectedLead.source || "Direct"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Original Inquiry</p>
                        <div className="bg-slate-900 text-slate-100 p-6 rounded-[2rem] border border-slate-800 leading-relaxed font-medium text-sm shadow-xl relative overflow-hidden">
                          <MessageSquare className="absolute -right-4 -bottom-4 h-24 w-24 text-white/5 rotate-12" />
                          {selectedLead.message || "No initial message."}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="automation" className="mt-0 h-full">
                    {!followUpEnabled && (
                      <div className="flex h-full items-center justify-center p-6">
                        <div className="max-w-md rounded-[2rem] border border-slate-200 bg-slate-50 p-6 text-center">
                          <Lock className="mx-auto h-8 w-8 text-slate-400" />
                          <h4 className="mt-4 text-lg font-black text-slate-950">Follow-up tools unavailable</h4>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            This business plan does not include Marketing Pro follow-up tooling. The lead inbox and core CRM remain available.
                          </p>
                        </div>
                      </div>
                    )}
                    {followUpEnabled && selectedLeadAutomation && (
                      <ScrollArea className="h-full pr-4">
                        <div className="space-y-5">
                          <div className="grid gap-3 sm:grid-cols-3">
                            {[
                              ["Lead Score", selectedLeadAutomation.score],
                              ["Temperature", selectedLeadAutomation.temperature],
                              ["Next Status", selectedLeadAutomation.recommendedStatus],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                                <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
                              </div>
                            ))}
                          </div>

                          <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5">
                            <div className="flex items-start gap-3">
                              <Flame className="mt-1 h-5 w-5 text-emerald-700" />
                              <div>
                                <p className="text-sm font-black text-slate-950">{selectedLeadAutomation.nextAction}</p>
                                <p className="mt-2 text-xs font-bold leading-5 text-emerald-800">{selectedLeadAutomation.urgencyReason}</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-3">
                            {[
                              ["WhatsApp opener", selectedLeadAutomation.whatsappOpen],
                              ["1-hour follow-up", selectedLeadAutomation.followUpOneHour],
                              ["Next-day follow-up", selectedLeadAutomation.followUpNextDay],
                              ["Quote qualification", selectedLeadAutomation.quotePrompt],
                              ["Review request after job", selectedLeadAutomation.reviewRequest],
                              ["Monthly reactivation", selectedLeadAutomation.monthlyNurture],
                            ].map(([label, script]) => (
                              <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyText(String(script), `${label} copied`)}
                                    className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                  >
                                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                                    Copy
                                  </Button>
                                </div>
                                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{script}</p>
                              </div>
                            ))}
                          </div>

                          <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-5">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-indigo-600" />
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Automation checklist</p>
                            </div>
                            <div className="mt-4 grid gap-2">
                              {selectedLeadAutomation.automationChecklist.map((item) => (
                                <div key={item} className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-slate-700">
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row">
                            {selectedLead.phone && (
                              <Button
                                onClick={() => {
                                  copyText(selectedLeadAutomation.whatsappOpen, "WhatsApp opener copied");
                                  window.open(`https://wa.me/${selectedLead.phone?.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(selectedLeadAutomation.whatsappOpen)}`, "_blank");
                                }}
                                className="rounded-xl bg-emerald-600 font-black uppercase tracking-widest hover:bg-emerald-700"
                              >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Open WhatsApp
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              onClick={() => saveAutomationSnapshot(selectedLead, selectedLeadAutomation, "crm_automation_tab")}
                              className="rounded-xl font-black uppercase tracking-widest"
                            >
                              Save Automation Plan
                            </Button>
                          </div>
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>

                  <TabsContent value="notes" className="mt-0 h-full">
                    <div className="h-full flex flex-col gap-6">
                      <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold text-slate-900">Communication & Internal Remarks</h4>
                          <span className="text-[10px] text-slate-400 font-medium italic">Internal log for team visibility</span>
                        </div>

                        <ScrollArea className="flex-1 pr-4">
                          {loadingRemarks ? (
                            <div className="space-y-4">
                              {[1, 2].map((i) => (
                                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                              ))}
                            </div>
                          ) : remarks.length > 0 ? (
                            <div className="space-y-4 pb-4">
                              {remarks.map((rem) => (
                                <div key={rem.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold">
                                        {rem.profiles?.full_name?.charAt(0) || "U"}
                                      </div>
                                      <span className="text-xs font-bold text-slate-900">
                                        {rem.profiles?.full_name || "Unknown Team Member"}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      {format(new Date(rem.created_at), "MMM dd, HH:mm")}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                    {rem.remark}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-48 flex flex-col items-center justify-center text-center opacity-50">
                              <MessageSquare className="h-12 w-12 text-slate-300 mb-2" />
                              <p className="text-sm font-medium text-slate-500">No remarks yet</p>
                            </div>
                          )}
                        </ScrollArea>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                        <textarea 
                          value={newRemark}
                          onChange={(e) => setNewRemark(e.target.value)}
                          placeholder="Type a new remark about this lead..."
                          className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none h-24"
                        />
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] text-slate-400 font-medium">
                            <Clock className="h-3 w-3 inline mr-1" />
                            Timestamped entry by {profile?.full_name || "you"}
                          </p>
                          <Button 
                            onClick={handleAddRemark}
                            disabled={submittingRemark || !newRemark.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 px-6 shadow-lg shadow-indigo-100"
                          >
                            {submittingRemark ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            Post Remark
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="mt-0 h-full">
                    <ScrollArea className="h-full pr-4">
                      {loadingHistory ? (
                        <div className="space-y-4 py-4">
                          {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-xl" />
                          ))}
                        </div>
                      ) : leadHistory.length > 0 ? (
                        <div className="space-y-6 py-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-black italic uppercase italic tracking-tight text-slate-900 flex items-center gap-2">
                              <Activity className="h-4 w-4 text-indigo-600" />
                              History Remarks
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Tracking Date of Entry
                            </span>
                          </div>
                          
                          <div className="space-y-3">
                            {leadHistory.map((visit, i) => (
                              <div 
                                key={visit.id} 
                                className="group relative flex items-center gap-4 p-5 rounded-[1.5rem] border border-slate-100 hover:border-indigo-100 hover:bg-slate-50 transition-all font-medium"
                              >
                                {i < leadHistory.length - 1 && (
                                  <div className="absolute left-[34px] top-12 w-1 h-8 bg-slate-50 group-hover:bg-indigo-50" />
                                )}
                                <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                  <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-black text-slate-900 uppercase italic tracking-tight truncate">
                                      {visit.page_path === "/" ? "Main Entry / Landing" : `Visited: ${visit.page_path.replace(/^\//, "")}`}
                                    </p>
                                    <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200">
                                      ENTRY
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1">
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.2 uppercase tracking-widest">
                                      <Clock className="h-3 w-3" /> {format(new Date(visit.created_at), "HH:mm")}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.2 uppercase tracking-widest">
                                      <Calendar className="h-3 w-3" /> {format(new Date(visit.created_at), "MMM dd, yyyy")}
                                    </span>
                                    {visit.referrer && (
                                      <span className="text-[10px] text-slate-400 truncate flex items-center gap-1 font-bold italic">
                                        <ExternalLink className="h-3 w-3" /> {new URL(visit.referrer).hostname}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                          <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 mb-4">
                            <Activity className="h-10 w-10" />
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 mb-1">No activity tracked yet</h4>
                          <p className="text-sm text-slate-500 max-w-[240px]">
                            Once this lead interacts more with your website, their visit history will appear here.
                          </p>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  className="rounded-xl px-6 font-bold"
                  onClick={() => setSelectedLead(null)}
                >
                  Close
                </Button>
                <Button
                  className="rounded-xl px-6 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100"
                  onClick={() => {
                    window.location.href = `mailto:${selectedLead.email}`;
                    updateStatus(selectedLead.id, "contacted");
                  }}
                >
                  Send Outreach Email
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-bold">Add New Lead</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input
                    value={newLead.name}
                    onChange={(e) =>
                      setNewLead({ ...newLead, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={newLead.email}
                    onChange={(e) =>
                      setNewLead({ ...newLead, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input
                    value={newLead.phone}
                    onChange={(e) =>
                      setNewLead({ ...newLead, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Message / Notes</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={newLead.message}
                    onChange={(e) =>
                      setNewLead({ ...newLead, message: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddLead} isLoading={saving}>
                  Create Lead
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
