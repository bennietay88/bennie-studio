import React, { useRef, useState } from "react";
import { Archive, Images, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import type { PortfolioItem } from "../../lib/portfolioCatalog";
import {
  extractPortfolioImages,
  portfolioFilenameSlot,
  portfolioImageMime,
  type PortfolioImageSlot,
} from "../../lib/portfolioBulkImport";

type UploadedImages = Record<string, Partial<Record<PortfolioImageSlot, string>>>;
type UploadItem = { file: File; slug: string; slot: PortfolioImageSlot };
const MAX_FILE_BYTES = 5 * 1024 * 1024;

async function uploadOne(item: UploadItem, accessToken: string): Promise<string> {
  const mimeType = portfolioImageMime(item.file.name);
  if (!mimeType) throw new Error("Unsupported image type");
  const response = await fetch("/api/admin/studio-portfolio/upload-url", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ slug: item.slug, slot: item.slot, mimeType, size: item.file.size }),
  });
  const info = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(info.error || "Could not prepare a signed upload.");
  if (!info.bucket || !info.path || !info.token || typeof info.publicUrl !== "string" || !info.publicUrl.startsWith("https://")) {
    throw new Error("The upload service returned an invalid response.");
  }
  const { error } = await supabase.storage.from(info.bucket).uploadToSignedUrl(
    info.path, info.token, item.file, { contentType: mimeType, cacheControl: "31536000", upsert: false },
  );
  if (error) throw error;
  return info.publicUrl;
}

/** Bulk import is opt-in and retains the six published entries and all existing CMS content. */
export function PortfolioBulkUpload({ portfolio, onImported, disabled = false }: {
  portfolio: PortfolioItem[];
  onImported: (urls: UploadedImages) => Promise<boolean>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState("");
  const [failed, setFailed] = useState<string[]>([]);
  const onSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length || running) return;
    setRunning(true); setCompleted(0); setTotal(0); setSummary(""); setFailed([]);
    try {
      let files: File[];
      if (selected.length === 1 && selected[0].name.toLowerCase().endsWith(".zip")) {
        files = await extractPortfolioImages(selected[0]);
      } else if (selected.some(file => file.name.toLowerCase().endsWith(".zip"))) {
        throw new Error("Choose one ZIP archive, or select multiple image files, not both.");
      } else {
        files = selected;
      }
      const allowed = new Set(portfolio.map(item => item.slug));
      const seen = new Set<string>();
      const uploads: UploadItem[] = [];
      const rejected: string[] = [];
      for (const file of files) {
        const parsed = portfolioFilenameSlot(file.name);
        const mime = portfolioImageMime(file.name);
        const key = parsed ? `${parsed.slug}:${parsed.slot}` : "";
        if (!parsed || !mime || !allowed.has(parsed.slug) || file.size < 1 || file.size > MAX_FILE_BYTES || seen.has(key)) {
          rejected.push(file.name); continue;
        }
        seen.add(key);
        uploads.push({ file, slug: parsed.slug, slot: parsed.slot });
      }
      if (!uploads.length) throw new Error("No matching portfolio screenshot files were found. Check the names in upload_manifest.csv.");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sign in again before importing images.");
      const uploaded: UploadedImages = {};
      const failures = [...rejected];
      setTotal(uploads.length);
      // Small batches keep API and Storage requests within normal Hobby limits.
      for (let i = 0; i < uploads.length; i += 3) {
        const batch = uploads.slice(i, i + 3);
        const results = await Promise.allSettled(batch.map(item => uploadOne(item, session.access_token)));
        results.forEach((result, index) => {
          const item = batch[index];
          if (result.status === "fulfilled") {
            if (!uploaded[item.slug]) uploaded[item.slug] = {};
            uploaded[item.slug][item.slot] = result.value;
          } else {
            failures.push(`${item.file.name}: ${String(result.reason?.message || result.reason || "upload failed")}`);
          }
        });
        setCompleted(Math.min(i + batch.length, uploads.length));
      }
      const count = Object.values(uploaded).reduce((sum, item) => sum + Object.keys(item).length, 0);
      if (count > 0) {
        const saved = await onImported(uploaded);
        if (!saved) failures.push("Image uploads completed, but saving the portfolio catalog failed; click Save changes to retry.");
        setSummary(`${count} image${count === 1 ? "" : "s"} uploaded across ${Object.keys(uploaded).length} portfolio designs${saved ? " and saved to the CMS" : ""}.`);
      } else {
        setSummary("No images were uploaded.");
      }
      setFailed(failures);
      if (failures.length) toast.error(`${failures.length} import issue(s). Review the details below.`);
      else toast.success(`${count} portfolio images uploaded and saved. Drafts remain unpublished.`);
    } catch (error: any) {
      toast.error(error?.message || "Portfolio bulk import failed.");
      setSummary(error?.message || "Bulk import failed.");
    } finally {
      setRunning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 text-sm font-bold text-indigo-900"><Archive size={18}/> Bulk import portfolio images</div>
        <p className="mt-2 text-sm leading-6 text-slate-700">Upload the Bennie Studio ZIP package directly, or select all extracted image files. Filenames automatically match each project's gallery cover, desktop and mobile slots.</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">Uploads are saved together after transfer. Existing published entries remain published; new concepts stay drafts for review.</p>
      </div>
      <div><input ref={inputRef} type="file" accept=".zip,image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={onSelect} aria-label="Choose portfolio ZIP or images"/>
        <button type="button" disabled={disabled || running} onClick={()=>inputRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-50">
          {running ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
          {running ? "Importing images…" : "Select ZIP or images"}
        </button>
      </div>
    </div>
    {running && <div className="mt-4" role="status" aria-live="polite"><div className="mb-1 flex justify-between text-xs text-slate-700"><span>Uploading to Bennie Studio storage</span><span>{completed} / {total || "Preparing"}</span></div><progress value={completed} max={total || 1} className="h-2 w-full accent-indigo-600"/></div>}
    {summary && <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-800" role="status"><Images size={15}/>{summary}</p>}
    {failed.length > 0 && <details className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"><summary className="cursor-pointer font-bold">{failed.length} skipped or failed file(s)</summary><div className="mt-2 max-h-40 space-y-1 overflow-auto">{failed.slice(0,60).map((name,index)=><p key={index}>{name}</p>)}</div></details>}
  </div>;
}
