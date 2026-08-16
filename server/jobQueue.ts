import type { SupabaseClient } from "@supabase/supabase-js";

export type AsyncJobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";
export type AsyncJobType = "website_audit" | "seo_audit" | "ai_generation" | "local_seo_audit";

export interface AsyncJobRecord {
  id: string;
  job_type: AsyncJobType;
  status: AsyncJobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  run_after: string;
  locked_at: string | null;
  locked_by: string | null;
  business_id: string | null;
  user_id: string | null;
  payload: Record<string, any>;
  result: Record<string, any> | null;
  last_error: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CreateAsyncJobInput {
  jobType: AsyncJobType;
  payload: Record<string, any>;
  businessId?: string | null;
  userId?: string | null;
  priority?: number;
  maxAttempts?: number;
  idempotencyKey?: string | null;
  runAfter?: string | null;
}

export const getJobWorkerSecret = () =>
  process.env.JOB_WORKER_SECRET || process.env.INTERNAL_JOB_SECRET || "";

const getWorkerBaseUrl = () => {
  const explicit = process.env.APP_PUBLIC_URL || process.env.PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  }
  return "";
};

export async function createAsyncJob(
  supabaseAdmin: SupabaseClient,
  input: CreateAsyncJobInput,
) {
  const payload = {
    job_type: input.jobType,
    payload: input.payload || {},
    business_id: input.businessId || null,
    user_id: input.userId || null,
    priority: input.priority ?? 100,
    max_attempts: input.maxAttempts ?? 3,
    run_after: input.runAfter || new Date().toISOString(),
    idempotency_key: input.idempotencyKey || null,
  };

  const { data, error } = await supabaseAdmin
    .from("async_jobs")
    .insert(payload)
    .select("*")
    .single();

  if (!error) return { job: data as AsyncJobRecord, existing: false };

  if (input.idempotencyKey && error.code === "23505") {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("async_jobs")
      .select("*")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return { job: existing as AsyncJobRecord, existing: true };
  }

  throw error;
}

export async function getAsyncJob(
  supabaseAdmin: SupabaseClient,
  jobId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("async_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw error;
  return data as AsyncJobRecord | null;
}

export async function claimAsyncJob(
  supabaseAdmin: SupabaseClient,
  jobId?: string,
  workerId = `worker-${Date.now()}`,
) {
  let candidate: AsyncJobRecord | null = null;

  if (jobId) {
    candidate = await getAsyncJob(supabaseAdmin, jobId);
    if (!candidate || !["queued", "failed"].includes(candidate.status)) return null;
    if (candidate.status === "failed" && candidate.attempts >= candidate.max_attempts) return null;
  } else {
    const { data, error } = await supabaseAdmin
      .from("async_jobs")
      .select("*")
      .in("status", ["queued", "failed"])
      .lte("run_after", new Date().toISOString())
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    candidate = data as AsyncJobRecord | null;
  }

  if (!candidate) return null;

  const nextAttempt = candidate.attempts + 1;
  const { data: claimed, error } = await supabaseAdmin
    .from("async_jobs")
    .update({
      status: "processing",
      attempts: nextAttempt,
      locked_at: new Date().toISOString(),
      locked_by: workerId,
      last_error: null,
    })
    .eq("id", candidate.id)
    .eq("status", candidate.status)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return claimed as AsyncJobRecord | null;
}

export async function completeAsyncJob(
  supabaseAdmin: SupabaseClient,
  jobId: string,
  result: Record<string, any>,
) {
  const { error } = await supabaseAdmin
    .from("async_jobs")
    .update({
      status: "completed",
      result,
      locked_at: null,
      locked_by: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) throw error;
}

export async function failAsyncJob(
  supabaseAdmin: SupabaseClient,
  job: AsyncJobRecord,
  errorMessage: string,
) {
  const retry = job.attempts < job.max_attempts;
  const delayMs = Math.min(15 * 60 * 1000, 30_000 * Math.max(job.attempts, 1));
  const { error } = await supabaseAdmin
    .from("async_jobs")
    .update({
      status: retry ? "queued" : "failed",
      run_after: retry ? new Date(Date.now() + delayMs).toISOString() : job.run_after,
      locked_at: null,
      locked_by: null,
      last_error: errorMessage,
    })
    .eq("id", job.id);
  if (error) throw error;
}

export async function publishJobToQstash(jobId: string) {
  const token = process.env.QSTASH_TOKEN;
  const workerSecret = getJobWorkerSecret();
  const baseUrl = getWorkerBaseUrl();
  if (!token || !workerSecret || !baseUrl) {
    return { published: false, reason: "QStash is not configured" };
  }

  const callbackUrl = `${baseUrl}/api/jobs/process`;
  const response = await fetch(`https://qstash.upstash.io/v2/publish/${callbackUrl}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "Upstash-Forward-Authorization": `Bearer ${workerSecret}`,
    },
    body: JSON.stringify({ jobId }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`QSTASH_PUBLISH_FAILED:${response.status}:${details.slice(0, 160)}`);
  }

  return { published: true, response: await response.json().catch(() => ({})) };
}
