import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import type { PortfolioItem } from "../../lib/portfolioCatalog";

type ImageSlot = "coverImage" | "desktopImage" | "mobileImage";
export function PortfolioImageUpload({ item, slot, onChange }: {
  item: PortfolioItem;
  slot: ImageSlot;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const value = item[slot];
  const label = ({ coverImage: "Gallery thumbnail", desktopImage: "Full desktop screenshot", mobileImage: "Mobile screenshot" } as Record<ImageSlot, string>)[slot];
  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      toast.error("Choose a JPG, PNG, WebP or AVIF screenshot."); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Optimize this screenshot to 5 MB or smaller."); return;
    }
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sign in again before uploading.");
      const response = await fetch("/api/admin/studio-portfolio/upload-url", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ slug: item.slug, slot, mimeType: file.type, size: file.size }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not prepare the upload.");
      const { error } = await supabase.storage.from(payload.bucket).uploadToSignedUrl(
        payload.path, payload.token, file, { contentType: file.type, cacheControl: "31536000", upsert: false },
      );
      if (error) throw error;
      onChange(payload.publicUrl);
      toast.success("Image uploaded. Save portfolio changes to publish it.");
    } catch (error: any) {
      toast.error(error?.message || "Portfolio image upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-2"><label className="text-xs font-bold text-slate-700">{label}</label>
      {value && <button type="button" onClick={() => onChange("")} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><X size={12}/> Clear</button>}
    </div>
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {value ? <img src={value} alt={label} loading="lazy" className="h-36 w-full object-cover object-top"/> :
        <div className="flex h-28 items-center justify-center text-xs text-slate-400">No image uploaded</div>}
    </div>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={onFile} className="hidden" aria-label={`Upload ${label}`}/>
    <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
      {uploading ? <Loader2 size={14} className="animate-spin"/> : <ImagePlus size={14}/>}
      {uploading ? "Uploading…" : value ? "Replace screenshot" : "Upload screenshot"}
    </button>
  </div>;
}
