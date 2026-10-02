/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  User,
  Mail,
  Briefcase,
  Building,
  Shield,
  Download,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "",
    business_id: "",
  });
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [showCancelServiceDialog, setShowCancelServiceDialog] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [cancellingService, setCancellingService] = useState(false);
  const [offboardingStatus, setOffboardingStatus] = useState<any>(null);
  const [deletionConfirmation, setDeletionConfirmation] = useState("");
  const [terminationStep, setTerminationStep] = useState<
    "initial" | "export" | "confirm"
  >("initial");

  const exportUserData = async () => {
    if (!profile?.businessId) {
      toast.error("No business data to export.");
      return;
    }

    try {
      toast.loading("Preparing your data export...");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your session has expired. Please sign in again.");
      const response = await fetch("/api/account/website-export", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to prepare website export");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bennie_tay_studio_website_handover_${new Date().toISOString().split("T")[0]}.tar.gz`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success("Website handover downloaded successfully.");
      setTerminationStep("confirm");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export data");
    }
  };

  const fetchOffboardingStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const response = await fetch("/api/account/offboarding-status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) return;
      setOffboardingStatus(await response.json());
    } catch (error) {
      console.warn("Unable to load offboarding status:", error);
    }
  };

  const handleCancelManagedService = async () => {
    setCancellingService(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your session has expired. Please sign in again.");
      const response = await fetch("/api/account/cancel-managed-service", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reason: "Customer requested cancellation from Profile" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Unable to cancel managed service");

      setOffboardingStatus((current: any) => ({
        ...(current || {}),
        subscription: {
          ...(current?.subscription || {}),
          renewal_state: payload.state,
          minimum_term_end_date: payload.minimumTermEndDate || current?.subscription?.minimum_term_end_date,
          current_period_end: payload.currentPeriodEnd || current?.subscription?.current_period_end,
        },
        business: {
          ...(current?.business || {}),
          handover_grace_until: payload.handoverGraceUntil || current?.business?.handover_grace_until,
        },
      }));
      setShowCancelServiceDialog(false);

      if (payload.state === "cancellation_requested") {
        toast.success(`Cancellation request recorded. Service cannot end before ${payload.minimumTermEndDate}.`);
      } else if (payload.state === "cancellation_scheduled") {
        toast.success("Managed service cancellation scheduled. Your 14-day migration window starts when service ends.");
      } else {
        toast.success("Managed service is cancelled. Your migration window is active.");
      }
      await fetchOffboardingStatus();
    } catch (error: any) {
      console.error("Managed service cancellation failed:", error);
      toast.error(error.message || "Unable to cancel managed service");
    } finally {
      setCancellingService(false);
    }
  };

  const handleTerminateAccount = async () => {
    if (deletionConfirmation !== "DELETE") {
      toast.error("Type DELETE to confirm permanent deletion.");
      return;
    }
    setTerminating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your session has expired. Please sign in again.");
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      const payload = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to permanently delete account");

      await supabase.auth.signOut();
      toast.success("Your account and data have been permanently deleted.");
      window.location.href = "/";
    } catch (error: any) {
      console.error("Account deletion failed:", error);
      toast.error(error.message || "Account deletion failed");
      setTerminating(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setFormData({
        email: profile.email || "",
        role: profile.role || "",
        business_id: profile.businessId || "",
      });
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.businessId) fetchOffboardingStatus();
  }, [profile?.businessId]);

  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data } = await supabase.from("businesses").select("id, name");
      if (data) setBusinesses(data);
    };
    fetchBusinesses();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          email: formData.email,
          role: formData.role,
          business_id: formData.business_id || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          User Profile
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Manage your account information and business affiliation.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="max-w-2xl rounded-3xl border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 p-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
                <User className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">
                  Account Details
                </CardTitle>
                <CardDescription>
                  Update your personal and professional information.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Mail className="h-3 w-3" /> Email Address
                </Label>
                <Input
                  value={formData.email}
                  disabled
                  className="rounded-xl h-12 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-500"
                  placeholder="your@email.com"
                />
                <p className="text-[10px] text-slate-400">
                  Email addresses are managed through authentication and cannot
                  be changed here.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Briefcase className="h-3 w-3" /> User Role
                </Label>
                {profile?.role === "super_admin" ? (
                  <Select
                    value={formData.role}
                    onValueChange={(v) => setFormData({ ...formData, role: v })}
                  >
                    <SelectTrigger className="rounded-xl h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectItem value="business_admin">
                        Business Admin
                      </SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="platform_staff">Platform Staff</SelectItem>
                      <SelectItem value="staff">Business Staff</SelectItem>
                      <SelectItem value="affiliate">Affiliate</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-12 px-4 flex items-center bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 font-medium">
                    {formData.role
                      .replace("_", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </div>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  {profile?.role === "super_admin"
                    ? "Note: Changing your role may affect your access permissions."
                    : "Contact a Super Admin to change your role or permissions."}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Building className="h-3 w-3" /> Business Affiliation
                </Label>
                {profile?.role === "super_admin" ? (
                  <Select
                    value={formData.business_id || "none"}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        business_id: v === "none" ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger className="rounded-xl h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Select a business" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectItem value="none">No Affiliation</SelectItem>
                      {businesses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-12 px-4 flex items-center bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 font-medium">
                    {businesses.find((b) => b.id === formData.business_id)
                      ?.name || "No Affiliation"}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl px-8 h-12 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card className="max-w-2xl mt-8 rounded-[2.5rem] border-slate-200 bg-white overflow-hidden shadow-sm">
          <CardHeader className="p-8">
            <CardTitle className="text-xl text-slate-900">
              Website Handover & Managed Service
            </CardTitle>
            <CardDescription className="text-slate-500">
              Your website can leave with you. Cancellation, migration, and permanent account deletion are separate steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="space-y-4">
              {offboardingStatus?.subscription?.renewal_state &&
                offboardingStatus.subscription.renewal_state !== "active" && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-xs text-indigo-800">
                  <strong className="block text-sm mb-1">Cancellation status: {String(offboardingStatus.subscription.renewal_state).replace(/_/g, " ")}</strong>
                  {offboardingStatus.subscription.minimum_term_end_date && (
                    <span>Minimum term ends {offboardingStatus.subscription.minimum_term_end_date}. </span>
                  )}
                  {offboardingStatus.subscription.current_period_end && (
                    <span>Current billing period ends {new Date(offboardingStatus.subscription.current_period_end).toLocaleDateString()}. </span>
                  )}
                  {offboardingStatus.business?.handover_grace_until && (
                    <span>Migration hosting remains available until {new Date(offboardingStatus.business.handover_grace_until).toLocaleDateString()}.</span>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Download Website Handover
                    </div>
                    <div className="text-xs text-slate-500 mt-1 max-w-md">
                      Static website pages, responsive styling, blog and product content, business data, leads, appointments, and migration instructions.
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="rounded-xl h-10 px-6 border-slate-200 hover:bg-white shrink-0"
                  onClick={exportUserData}
                >
                  Download Handover
                </Button>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 bg-amber-50/60 rounded-2xl border border-amber-200">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-amber-100 text-amber-700 rounded-xl border border-amber-200">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-amber-950">
                      Cancel Managed Service
                    </div>
                    <div className="text-xs text-amber-800/80 mt-1 max-w-md">
                      Stops renewal when your commitment allows it. Your account is kept, and a 14-day website migration window starts when the managed subscription actually ends.
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="rounded-xl h-10 px-6 border-amber-300 text-amber-800 bg-white hover:bg-amber-50 shrink-0"
                  onClick={() => setShowCancelServiceDialog(true)}
                  disabled={cancellingService || ["cancellation_requested", "cancellation_scheduled", "cancelled"].includes(String(offboardingStatus?.subscription?.renewal_state || ""))}
                >
                  Cancel Managed Service
                </Button>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 bg-red-50/60 rounded-2xl border border-red-200">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-red-100 text-red-600 rounded-xl border border-red-200">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-red-950">
                      Delete Account Permanently
                    </div>
                    <div className="text-xs text-red-700 mt-1 max-w-md">
                      Permanently removes the account and business data. Active managed service must end first. Download your handover before using this.
                    </div>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  className="rounded-xl h-10 px-6 font-bold shrink-0"
                  onClick={() => {
                    setDeletionConfirmation("");
                    setShowTerminateDialog(true);
                  }}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="max-w-2xl mt-8 rounded-[2.5rem] border-slate-100 bg-slate-50/30 overflow-hidden shadow-sm">
          <CardHeader className="p-8">
            <CardTitle className="text-xl text-slate-900">
              Security & Session
            </CardTitle>
            <CardDescription className="text-slate-500">
              Securely end your current session.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 flex items-center justify-center bg-slate-50 text-slate-600 rounded-xl border border-slate-100">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Active Session
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Currently logged in as {profile?.email}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="rounded-xl h-10 px-6 font-bold border-slate-200 hover:bg-slate-50"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog
          open={showCancelServiceDialog}
          onOpenChange={setShowCancelServiceDialog}
        >
          <DialogContent className="rounded-3xl sm:max-w-md">
            <DialogHeader>
              <div className="h-12 w-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-4">
                <Shield className="h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl font-bold">
                Cancel managed service?
              </DialogTitle>
              <DialogDescription className="text-slate-500 pt-2">
                This does not delete your account or website data. If your minimum commitment has not ended yet, the request is recorded and cancellation will be scheduled when eligible. Once service ends, your website receives a 14-day migration hosting window.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600">
              Download your website handover before changing DNS. Forms, booking, analytics, CRM and managed automations must be reconnected on your new host.
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => setShowCancelServiceDialog(false)}
                className="rounded-xl"
              >
                Keep Service
              </Button>
              <Button
                onClick={handleCancelManagedService}
                disabled={cancellingService}
                className="rounded-xl px-6 font-bold bg-amber-600 hover:bg-amber-700"
              >
                {cancellingService ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  "Confirm Cancellation"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showTerminateDialog}
          onOpenChange={setShowTerminateDialog}
        >
          <DialogContent className="rounded-3xl sm:max-w-md">
            <DialogHeader>
              <div className="h-12 w-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl font-bold">
                Delete account permanently?
              </DialogTitle>
              <DialogDescription className="text-slate-500 pt-2">
                This action is <strong>irreversible</strong>. Your managed subscription must already be ended. By continuing, you will permanently delete:
                <ul className="list-disc pl-5 mt-3 space-y-1 text-xs">
                  <li>Your business profile and settings</li>
                  <li>All managed websites and custom domains</li>
                  <li>All CRM leads and customer data</li>
                  <li>All scheduled appointments and blog posts</li>
                </ul>
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              {terminationStep === "initial" && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-xs text-amber-800 flex items-start gap-2">
                    <Download className="h-4 w-4 mt-0.5 shrink-0" />
                    We strongly recommend exporting your data before deleting
                    your account.
                  </p>
                  <Button
                    variant="link"
                    className="text-amber-700 font-bold p-0 mt-2 h-auto text-xs"
                    onClick={() => {
                      exportUserData();
                    }}
                  >
                    Export Data Now
                  </Button>
                </div>
              )}

              {terminationStep === "confirm" && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                  <div className="h-8 w-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                    <Save className="h-4 w-4" />
                  </div>
                  <p className="text-xs text-emerald-800 font-medium">
                    Handover downloaded. Keep that archive somewhere safe.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="delete-confirmation" className="text-xs font-bold text-red-900">
                  Type DELETE to confirm
                </Label>
                <Input
                  id="delete-confirmation"
                  value={deletionConfirmation}
                  onChange={(event) => setDeletionConfirmation(event.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => setShowTerminateDialog(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleTerminateAccount}
                disabled={terminating || deletionConfirmation !== "DELETE"}
                className="rounded-xl px-6 font-bold shadow-lg shadow-red-200"
              >
                {terminating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete My Account"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
