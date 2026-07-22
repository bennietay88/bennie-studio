/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Users,
  Search,
  Filter,
  Loader2,
  ExternalLink,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Eye,
  Globe,
} from "lucide-react";
import { Button, buttonVariants } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "./ui/card";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner";

interface AffiliatePartner {
  id: string;
  referral_code: string;
  status: "pending" | "active" | "approved" | "rejected" | "suspended";
  total_earnings: number;
  unpaid_earnings: number;
  total_referrals: number;
  created_at: string;
  business?: {
    name: string;
  };
  profile?: {
    email: string;
    role: string;
  };
}

export function SuperAdminAffiliatePartners({
  onViewProfile,
}: {
  onViewProfile: (user: any) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<AffiliatePartner[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPartners();
  }, []);

  const isOptionalAffiliateSchemaError = (error: any) => {
    const message = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`;
    return (
      ["42P01", "42703", "PGRST200", "PGRST205"].includes(error?.code) ||
      /relation .*affiliates.* does not exist|table .*affiliates|Could not find a relationship|schema cache/i.test(message)
    );
  };

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("affiliates")
        .select(
          `
          *,
          business:businesses(name),
          profile:profiles(id, email, role)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        // Try fallback when the relationship cache is behind the frontend.
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("affiliates")
          .select("*")
          .order("created_at", { ascending: false });
          
        if (fallbackError) {
          if (isOptionalAffiliateSchemaError(fallbackError)) {
            setPartners([]);
            return;
          }
          throw fallbackError;
        }
        setPartners((fallbackData as any[]) || []);
        return;
      }
      setPartners((data as any[]) || []);
    } catch (error: any) {
      if (isOptionalAffiliateSchemaError(error)) {
        setPartners([]);
        return;
      }
      console.error("Error fetching affiliate partners:", error);
      toast.error("Failed to load affiliate partners");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("affiliates")
        .update({
          status: newStatus,
          approved_at:
            newStatus === "active" || newStatus === "approved"
              ? new Date().toISOString()
              : undefined,
          rejected_at:
            newStatus === "rejected" ? new Date().toISOString() : undefined,
          suspended_at:
            newStatus === "suspended" ? new Date().toISOString() : undefined,
        })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Partner status updated to ${newStatus}`);
      fetchPartners();
    } catch (error: any) {
      toast.error("Failed to update status: " + error.message);
    }
  };

  const filteredPartners = partners.filter(
    (p) =>
      (p.referral_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.business?.name || "bennie studio platform").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.profile?.email || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mr-2" />
        <span className="text-slate-500 font-medium tracking-wide">
          Loading Partners...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            Affiliate Partners
          </h2>
          <p className="text-slate-500">
            Approve, reject, suspend, and review affiliates promoting Bennie Studio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search partners..."
              className="pl-10 w-64 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPartners}
            className="rounded-xl h-10"
          >
            <Clock className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="rounded-[2rem] border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="pl-8">Affiliate / Email</TableHead>
                <TableHead>Program Scope</TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead>Total Earnings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined Date</TableHead>
                <TableHead className="pr-8 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-slate-400 italic"
                  >
                    No affiliate partners found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPartners.map((p) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <TableCell className="pl-8 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">
                          Partner
                        </span>
                        <span className="text-xs text-slate-500">
                          {p.profile?.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {p.business?.name || "Bennie Studio Platform"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="font-mono bg-indigo-50 border-indigo-100 text-indigo-700"
                      >
                        {p.referral_code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900">
                          ${Number(p.total_earnings || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Total accumulated
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          p.status === "active" || p.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : p.status === "pending"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Open affiliate partner actions for ${p.profile?.email || p.referral_code || "partner"}`}
                          title={`Open affiliate partner actions for ${p.profile?.email || p.referral_code || "partner"}`}
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuLabel className="text-[10px] uppercase text-slate-400 font-black tracking-widest pl-2">
                            Partner Management
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => onViewProfile(p.profile)}
                          >
                            <Eye className="mr-2 h-4 w-4" /> View User Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => updateStatus(p.id, "active")}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />{" "}
                            Approve Partner
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateStatus(p.id, "rejected")}
                          >
                            <XCircle className="mr-2 h-4 w-4 text-red-500" />{" "}
                            Reject Application
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateStatus(p.id, "suspended")}
                          >
                            <XCircle className="mr-2 h-4 w-4 text-red-500" />{" "}
                            Suspend Partner
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
