import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Star,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Trash2,
  Loader2,
  Copy,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { cn } from "../lib/utils";

export function ReviewManagement() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [reviewCampaign, setReviewCampaign] = useState({
    googleReviewUrl: "",
    messageTemplate: "Thanks again for choosing us. If the service was helpful, could you leave a short Google review? It helps local customers decide with more confidence.",
  });
  const [testimonialForm, setTestimonialForm] = useState({
    slug: "",
    title: "",
    customerName: "",
    company: "",
    testimonial: "",
    customerImageUrl: "",
    resultSummary: "",
    evidenceReference: "",
    beforeSummary: "",
    changes: "",
    resultMetrics: "",
    beforeImageUrl: "",
    afterImageUrl: "",
    consentStatus: "pending",
    publishStatus: "draft",
    dateApproved: "",
  });

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("business_id")
          .eq("id", user.id)
          .single();

        if (profile?.business_id) {
          setBusinessId(profile.business_id);
          fetchReviews(profile.business_id);
          fetchTestimonials(profile.business_id);
        }
      }
    };
    init();
  }, []);

  const fetchReviews = async (bizId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (err: any) {
      toast.error("Failed to fetch reviews: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTestimonials = async (bizId: string) => {
    const { data, error } = await supabase
      .from("customer_testimonials")
      .select("*")
      .eq("business_id", bizId)
      .order("updated_at", { ascending: false });
    if (error) {
      console.warn("Testimonials could not be loaded:", error.message);
      return;
    }
    setTestimonials(data || []);
  };

  const saveTestimonial = async () => {
    if (!businessId) {
      toast.error("No business is attached to this account yet.");
      return;
    }
    if (!testimonialForm.customerName.trim() || !testimonialForm.testimonial.trim()) {
      toast.error("Customer name and testimonial are required.");
      return;
    }
    if (testimonialForm.publishStatus === "published" && (testimonialForm.consentStatus !== "approved" || !testimonialForm.dateApproved)) {
      toast.error("Published testimonials require approved consent and an approval date.");
      return;
    }
    setActionLoading("testimonial_save");
    const { error } = await supabase.from("customer_testimonials").insert({
      business_id: businessId,
      slug: testimonialForm.slug.trim() || null,
      title: testimonialForm.title.trim() || null,
      customer_name: testimonialForm.customerName.trim(),
      company: testimonialForm.company.trim() || null,
      testimonial: testimonialForm.testimonial.trim(),
      customer_image_url: testimonialForm.customerImageUrl.trim() || null,
      result_summary: testimonialForm.resultSummary.trim() || null,
      evidence_reference: testimonialForm.evidenceReference.trim() || null,
      before_summary: testimonialForm.beforeSummary.trim() || null,
      changes: testimonialForm.changes.split("\n").map((item) => item.trim()).filter(Boolean),
      result_metrics: testimonialForm.resultMetrics.split("\n").map((item) => {
        const [metric, ...value] = item.split(":");
        return { metric: metric.trim(), value: value.join(":").trim() };
      }).filter((item) => item.metric && item.value),
      before_image_url: testimonialForm.beforeImageUrl.trim() || null,
      after_image_url: testimonialForm.afterImageUrl.trim() || null,
      consent_status: testimonialForm.consentStatus,
      publish_status: testimonialForm.publishStatus,
      date_approved: testimonialForm.dateApproved || null,
    });
    setActionLoading(null);
    if (error) {
      toast.error(error.message.includes("customer_testimonials") ? "Apply the testimonial migration before saving testimonials." : error.message);
      return;
    }
    toast.success("Testimonial saved.");
    setTestimonialForm({
      slug: "",
      title: "",
      customerName: "",
      company: "",
      testimonial: "",
      customerImageUrl: "",
      resultSummary: "",
      evidenceReference: "",
      beforeSummary: "",
      changes: "",
      resultMetrics: "",
      beforeImageUrl: "",
      afterImageUrl: "",
      consentStatus: "pending",
      publishStatus: "draft",
      dateApproved: "",
    });
    fetchTestimonials(businessId);
  };

  const handleStatusChange = async (reviewId: string, newStatus: string) => {
    try {
      setActionLoading(reviewId);
      const { error } = await supabase
        .from("reviews")
        .update({ status: newStatus })
        .eq("id", reviewId);

      if (error) throw error;

      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus } : r)),
      );
      toast.success(`Review ${newStatus} successfully`);
    } catch (err: any) {
      toast.error("Failed to update review: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      setActionLoading(reviewId);
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;

      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      toast.success("Review deleted successfully");
    } catch (err: any) {
      toast.error("Failed to delete review: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const copyReviewRequest = async () => {
    try {
      await navigator.clipboard.writeText(
        `${reviewCampaign.messageTemplate}${reviewCampaign.googleReviewUrl ? `\n\n${reviewCampaign.googleReviewUrl}` : ""}`,
      );
      toast.success("Review request copied");
    } catch (err) {
      toast.error("Copy failed");
    }
  };

  const saveReviewCampaign = async () => {
    if (!businessId) {
      toast.error("No business is attached to this account yet.");
      return;
    }
    setActionLoading("review_campaign");
    const { error } = await supabase.from("review_request_campaigns").insert({
      business_id: businessId,
      title: `Review request campaign - ${new Date().toLocaleDateString()}`,
      google_review_url: reviewCampaign.googleReviewUrl.trim() || null,
      message_template: reviewCampaign.messageTemplate.trim(),
      status: "draft",
      target_segment: "completed_customers",
      metadata: {
        source: "review_management",
        totalReviews: reviews.length,
        averageRating: stats.avgRating,
      },
    });
    setActionLoading(null);
    if (error) {
      toast.error(
        error.message.includes("review_request_campaigns")
          ? "Apply the lead generation automation migration before saving review campaigns."
          : error.message,
      );
      return;
    }
    toast.success("Review request campaign saved.");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  const stats = {
    avgRating:
      reviews.length > 0
        ? (
            reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
          ).toFixed(1)
        : "0.0",
    pending: reviews.filter((r) => r.status === "pending").length,
    published: reviews.filter((r) => r.status === "published").length,
    publicTestimonials: testimonials.filter((t) => t.publish_status === "published" && t.consent_status === "approved").length,
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Customer Reviews
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Manage and showcase your customer testimonials.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {reviews.slice(0, 4).map((r, i) => (
              <div
                key={r.id}
                className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden"
              >
                <div className="h-full w-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                  {r.author.charAt(0)}
                </div>
              </div>
            ))}
          </div>
          <span className="text-xs font-bold text-slate-500">
            {reviews.length} Total Reviews
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            label: "Average Rating",
            value: stats.avgRating,
            icon: Star,
            color: "text-amber-500",
            bg: "bg-amber-50",
          },
          {
            label: "Pending Approval",
            value: stats.pending.toString(),
            icon: Clock,
            color: "text-blue-500",
            bg: "bg-blue-50",
          },
          {
            label: "Published",
            value: stats.published.toString(),
            icon: CheckCircle2,
            color: "text-emerald-500",
            bg: "bg-emerald-50",
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div
                className={`h-12 w-12 rounded-2xl ${stat.bg} dark:bg-slate-800 flex items-center justify-center ${stat.color}`}
              >
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {stat.label}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                </h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[2.5rem] border-emerald-100 bg-emerald-50/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-black text-slate-950">Review Request Campaign</CardTitle>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Turn completed jobs into fresh Google reviews, then use those reviews in website copy and local SEO proof.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <input
              value={reviewCampaign.googleReviewUrl}
              onChange={(event) => setReviewCampaign((current) => ({ ...current, googleReviewUrl: event.target.value }))}
              placeholder="Google review link optional"
              className="h-12 w-full rounded-2xl border border-emerald-100 bg-white px-4 text-sm font-bold outline-none focus:border-emerald-400"
            />
            <textarea
              value={reviewCampaign.messageTemplate}
              onChange={(event) => setReviewCampaign((current) => ({ ...current, messageTemplate: event.target.value }))}
              className="min-h-32 w-full rounded-2xl border border-emerald-100 bg-white p-4 text-sm font-semibold leading-6 outline-none focus:border-emerald-400"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={copyReviewRequest} variant="outline" className="rounded-xl bg-white font-black uppercase tracking-widest">
                <Copy className="mr-2 h-4 w-4" />
                Copy Request
              </Button>
              <Button
                onClick={saveReviewCampaign}
                disabled={actionLoading === "review_campaign"}
                className="rounded-xl bg-emerald-600 font-black uppercase tracking-widest hover:bg-emerald-700"
              >
                {actionLoading === "review_campaign" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Save Campaign
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Review Fuel", `${reviews.length}`],
              ["Published Proof", `${stats.published}`],
              ["Monthly Loop", "Request -> Review -> Website"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2.5rem] border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl font-black text-slate-950">Approved Testimonials</CardTitle>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Store testimonial consent, evidence reference, approval date, and publish state. Only approved and published testimonials are eligible for public display.
              </p>
            </div>
            <Badge className="w-fit bg-indigo-50 text-indigo-700 hover:bg-indigo-50">{stats.publicTestimonials} public</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="grid gap-3">
            <input value={testimonialForm.title} onChange={(event) => setTestimonialForm((current) => ({ ...current, title: event.target.value }))} placeholder="Case study title" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-indigo-300" />
            <input value={testimonialForm.slug} onChange={(event) => setTestimonialForm((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") }))} placeholder="case-study-slug" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-indigo-300" />
            <input value={testimonialForm.customerName} onChange={(event) => setTestimonialForm((current) => ({ ...current, customerName: event.target.value }))} placeholder="Customer name" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-indigo-300" />
            <input value={testimonialForm.company} onChange={(event) => setTestimonialForm((current) => ({ ...current, company: event.target.value }))} placeholder="Company" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-indigo-300" />
            <textarea value={testimonialForm.testimonial} onChange={(event) => setTestimonialForm((current) => ({ ...current, testimonial: event.target.value }))} placeholder="Testimonial" className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 outline-none focus:border-indigo-300" />
            <input value={testimonialForm.customerImageUrl} onChange={(event) => setTestimonialForm((current) => ({ ...current, customerImageUrl: event.target.value }))} placeholder="Customer image URL, if approved" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-indigo-300" />
            <input value={testimonialForm.resultSummary} onChange={(event) => setTestimonialForm((current) => ({ ...current, resultSummary: event.target.value }))} placeholder="Result summary, only if evidence exists" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-indigo-300" />
            <input value={testimonialForm.evidenceReference} onChange={(event) => setTestimonialForm((current) => ({ ...current, evidenceReference: event.target.value }))} placeholder="Evidence or internal reference" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-indigo-300" />
            <textarea value={testimonialForm.beforeSummary} onChange={(event) => setTestimonialForm((current) => ({ ...current, beforeSummary: event.target.value }))} placeholder="Before: observable starting point" className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 outline-none focus:border-indigo-300" />
            <textarea value={testimonialForm.changes} onChange={(event) => setTestimonialForm((current) => ({ ...current, changes: event.target.value }))} placeholder={"What changed — one verified item per line"} className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 outline-none focus:border-indigo-300" />
            <textarea value={testimonialForm.resultMetrics} onChange={(event) => setTestimonialForm((current) => ({ ...current, resultMetrics: event.target.value }))} placeholder={"Measured results — one per line, e.g. WhatsApp enquiries: 14"} className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 outline-none focus:border-indigo-300" />
            <div className="grid gap-3 sm:grid-cols-2"><input value={testimonialForm.beforeImageUrl} onChange={(event) => setTestimonialForm((current) => ({ ...current, beforeImageUrl: event.target.value }))} placeholder="Before image URL" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-indigo-300" /><input value={testimonialForm.afterImageUrl} onChange={(event) => setTestimonialForm((current) => ({ ...current, afterImageUrl: event.target.value }))} placeholder="After image URL" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-indigo-300" /></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <select value={testimonialForm.consentStatus} onChange={(event) => setTestimonialForm((current) => ({ ...current, consentStatus: event.target.value }))} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold">
                <option value="pending">Consent pending</option>
                <option value="approved">Consent approved</option>
                <option value="rejected">Consent rejected</option>
                <option value="withdrawn">Consent withdrawn</option>
              </select>
              <select value={testimonialForm.publishStatus} onChange={(event) => setTestimonialForm((current) => ({ ...current, publishStatus: event.target.value }))} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <input type="date" value={testimonialForm.dateApproved} onChange={(event) => setTestimonialForm((current) => ({ ...current, dateApproved: event.target.value }))} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold" />
            </div>
            <Button onClick={saveTestimonial} disabled={actionLoading === "testimonial_save"} className="rounded-xl bg-indigo-600 font-black uppercase tracking-widest hover:bg-indigo-700">
              {actionLoading === "testimonial_save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Save Testimonial
            </Button>
          </div>
          <div className="space-y-3">
            {testimonials.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center text-sm font-bold text-slate-500">
                No controlled testimonials yet.
              </div>
            ) : (
              testimonials.map((testimonial) => (
                <div key={testimonial.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{testimonial.customer_name}</p>
                      <p className="text-xs font-bold text-slate-500">{testimonial.company || "No company"} · {testimonial.date_approved || "No approval date"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{testimonial.consent_status}</Badge>
                      <Badge className={testimonial.publish_status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}>{testimonial.publish_status}</Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{testimonial.testimonial}</p>
                  {testimonial.evidence_reference && <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Evidence: {testimonial.evidence_reference}</p>}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Recent Feedback
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl gap-2">
                <Filter className="h-4 w-4" /> Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-700">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    No reviews yet
                  </h4>
                  <p className="text-sm text-slate-500 max-w-xs">
                    When customers leave feedback on your site, they will appear
                    here for you to manage.
                  </p>
                </div>
              </div>
            ) : (
              reviews.map((review) => (
                <motion.div
                  layout
                  key={review.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center font-bold text-indigo-600">
                        {review.author.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-bold text-slate-900 dark:text-white">
                            {review.author}
                          </h4>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-700"}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                          {review.comment}
                        </p>
                        <div className="flex items-center gap-4 pt-2">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatDate(review.created_at)}
                          </span>
                          <Badge
                            variant={
                              review.status === "published"
                                ? "default"
                                : "secondary"
                            }
                            className={cn(
                              "text-[10px] px-2 py-0 capitalize font-bold",
                              review.status === "published"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : review.status === "pending"
                                  ? "bg-amber-50 text-amber-600 border-amber-100"
                                  : "bg-red-50 text-red-600 border-red-100",
                            )}
                          >
                            {review.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AnimatePresence mode="wait">
                        {actionLoading === review.id ? (
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        ) : review.status === "pending" ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleStatusChange(review.id, "published")
                              }
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 h-8 px-3 text-[10px] font-bold"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleStatusChange(review.id, "rejected")
                              }
                              className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 h-8 px-3 text-[10px] font-bold"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(review.id)}
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
