import React from "react";
import { Plus, Save, Trash2, FlaskConical } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { FunnelPageContent, FunnelPageField, FunnelStep } from "../../lib/funnelEngine";
import { toast } from "sonner";

export function FunnelStepEditor({
  step,
  onSaved,
  readOnly = false,
}: {
  step: FunnelStep;
  onSaved?: (step: FunnelStep) => void;
  readOnly?: boolean;
}) {
  const [content, setContent] = React.useState<FunnelPageContent>(step.page_content || {});
  const [name, setName] = React.useState(step.name);
  const [slug, setSlug] = React.useState(step.slug);
  const [saving, setSaving] = React.useState(false);
  const [variants, setVariants] = React.useState<any[]>([]);
  const [offer, setOffer] = React.useState<any>(null);

  React.useEffect(() => {
    setContent(step.page_content || {});
    setName(step.name);
    setSlug(step.slug);
    void Promise.all([
      supabase.from("funnel_variants").select("*").eq("step_id", step.id).order("created_at"),
      supabase.from("funnel_offers").select("*").eq("step_id", step.id).eq("active", true).order("created_at").limit(1),
    ]).then(([variantResult, offerResult]) => {
      setVariants(variantResult.data || []);
      setOffer(offerResult.data?.[0] || null);
    });
  }, [step.id, step.name, step.slug, step.page_content]);

  const save = async () => {
    if (readOnly) return;
    setSaving(true);
    try {
      const payload = { name: name.trim() || step.name, slug: slug.trim() || step.slug, page_content: content, updated_at: new Date().toISOString() };
      const { data, error } = await supabase.from("funnel_steps").update(payload).eq("id", step.id).select("*").single();
      if (error) throw error;
      toast.success("Step saved");
      onSaved?.(data as FunnelStep);
    } catch (error: any) {
      toast.error(error?.message || "Step could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof FunnelPageContent, value: any) => setContent((current) => ({ ...current, [key]: value }));
  const fields = content.fields || [];

  const addField = () => {
    const id = crypto.randomUUID();
    updateField("fields", [...fields, { id, name: `field_${fields.length + 1}`, label: "New field", type: "text", required: false }]);
  };
  const updateFormField = (id: string, patch: Partial<FunnelPageField>) => updateField("fields", fields.map((field) => field.id === id ? { ...field, ...patch } : field));
  const removeField = (id: string) => updateField("fields", fields.filter((field) => field.id !== id));

  const addVariant = async () => {
    if (readOnly) return;
    const { data, error } = await supabase.from("funnel_variants").insert({
      business_id: step.business_id,
      funnel_id: step.funnel_id,
      step_id: step.id,
      name: `Variant ${String.fromCharCode(65 + variants.length)}`,
      weight: variants.length ? 50 : 50,
      status: "active",
      page_content: content,
    }).select("*").single();
    if (error) return toast.error(error.message);
    setVariants((current) => [...current, data]);
    toast.success("A/B variant created");
  };


  const updateVariantLocal = (variantId: string, patch: Record<string, any>) => {
    setVariants((current) => current.map((variant) => variant.id === variantId ? { ...variant, ...patch } : variant));
  };

  const saveVariant = async (variant: any) => {
    if (readOnly) return;
    const weight = Math.max(0, Math.min(100, Number(variant.weight || 0)));
    const { data, error } = await supabase
      .from("funnel_variants")
      .update({
        name: String(variant.name || "Variant"),
        weight,
        page_content: variant.page_content || {},
        status: variant.status || "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", variant.id)
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    setVariants((current) => current.map((item) => item.id === variant.id ? data : item));
    toast.success("Variant saved");
  };

  const removeVariant = async (variantId: string) => {
    if (readOnly) return;
    const { error } = await supabase.from("funnel_variants").delete().eq("id", variantId);
    if (error) return toast.error(error.message);
    setVariants((current) => current.filter((variant) => variant.id !== variantId));
  };

  const saveOffer = async () => {
    if (readOnly) return;
    const offerType = step.step_type === "order_bump"
      ? "order_bump"
      : step.step_type === "upsell"
        ? "upsell"
        : step.step_type === "downsell"
          ? "downsell"
          : "primary";
    const payload = {
      business_id: step.business_id,
      funnel_id: step.funnel_id,
      step_id: step.id,
      offer_type: offerType,
      name: String(offer?.name || step.name || "Funnel offer"),
      description: String(offer?.description || ""),
      amount: Number(offer?.amount || 0),
      currency: String(offer?.currency || "USD").toUpperCase(),
      stripe_price_id: String(offer?.stripe_price_id || "").trim() || null,
      active: true,
      settings: { ...(offer?.settings || {}), mode: offer?.settings?.mode === "subscription" ? "subscription" : "payment" },
      updated_at: new Date().toISOString(),
    };
    const query = offer?.id
      ? supabase.from("funnel_offers").update(payload).eq("id", offer.id)
      : supabase.from("funnel_offers").insert(payload);
    const { data, error } = await query.select("*").single();
    if (error) return toast.error(error.message);
    setOffer(data);
    toast.success("Funnel offer saved");
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Page content</p><h3 className="mt-1 text-xl font-black text-slate-950">{step.name}</h3></div>
          {!readOnly ? <Button onClick={() => void save()} disabled={saving} className="rounded-xl bg-indigo-600"><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save step"}</Button> : <Badge variant="outline">Managed by Bennie Studio</Badge>}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2"><Label>Step name</Label><Input disabled={readOnly} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>URL slug</Label><Input disabled={readOnly} value={slug} onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/gi,"-").toLowerCase())} /></div>
          <div className="space-y-2"><Label>Eyebrow</Label><Input disabled={readOnly} value={content.eyebrow || ""} onChange={(e) => updateField("eyebrow", e.target.value)} /></div>
          <div className="space-y-2"><Label>CTA label</Label><Input disabled={readOnly} value={content.ctaLabel || ""} onChange={(e) => updateField("ctaLabel", e.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Headline</Label><Input disabled={readOnly} value={content.headline || ""} onChange={(e) => updateField("headline", e.target.value)} className="text-lg font-black" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Subheadline</Label><Textarea disabled={readOnly} value={content.subheadline || ""} onChange={(e) => updateField("subheadline", e.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Body / supporting copy</Label><Textarea disabled={readOnly} value={content.body || ""} onChange={(e) => updateField("body", e.target.value)} className="min-h-32" /></div>
          <div className="space-y-2"><Label>Primary colour</Label><Input disabled={readOnly} type="color" value={content.theme?.primary || "#4f46e5"} onChange={(e) => updateField("theme", { ...(content.theme || {}), primary: e.target.value })} /></div>
          <div className="space-y-2"><Label>Media / video URL</Label><Input disabled={readOnly} value={content.mediaUrl || ""} onChange={(e) => updateField("mediaUrl", e.target.value)} placeholder="Optional" /></div>
        </div>
      </Card>

      {["lead_form","survey","application","appointment"].includes(step.step_type) ? (
        <Card className="rounded-[2rem] border-slate-200 p-6">
          <div className="flex items-center justify-between"><div><h3 className="font-black text-slate-950">Form fields</h3><p className="mt-1 text-xs font-semibold text-slate-500">Captured fields are stored with the lead and funnel submission.</p></div>{!readOnly ? <Button variant="outline" onClick={addField} className="rounded-xl"><Plus className="mr-2 h-4 w-4" />Add field</Button> : null}</div>
          <div className="mt-5 space-y-3">
            {fields.map((field) => (
              <div key={field.id} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                <Input disabled={readOnly} value={field.label} onChange={(e) => updateFormField(field.id,{label:e.target.value})} placeholder="Label" />
                <Input disabled={readOnly} value={field.name} onChange={(e) => updateFormField(field.id,{name:e.target.value.replace(/[^a-z0-9_]/gi,"_").toLowerCase()})} placeholder="field_name" />
                <Select disabled={readOnly} value={field.type} onValueChange={(value:any) => updateFormField(field.id,{type:value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["text","email","tel","number","textarea","select","radio","checkbox","date","time"].map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select>
                {!readOnly ? <Button variant="outline" onClick={() => removeField(field.id)} className="text-rose-600"><Trash2 className="h-4 w-4" /></Button> : null}
                {["select","radio"].includes(field.type) ? <Input disabled={readOnly} className="md:col-span-3" value={(field.options || []).join(", ")} onChange={(e) => updateFormField(field.id,{options:e.target.value.split(",").map((v)=>v.trim()).filter(Boolean)})} placeholder="Option A, Option B, Option C" /> : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {["checkout","order_bump","upsell","downsell"].includes(step.step_type) ? (
        <Card className="rounded-[2rem] border-slate-200 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-slate-950">Offer & checkout</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Stripe remains payment truth. Use an existing Stripe Price ID or let Bennie Studio create checkout price data from the amount below.
              </p>
            </div>
            {!readOnly ? <Button variant="outline" onClick={() => void saveOffer()} className="rounded-xl"><Save className="mr-2 h-4 w-4" />Save offer</Button> : null}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Offer name</Label><Input disabled={readOnly} value={offer?.name || ""} onChange={(e)=>setOffer((current:any)=>({...current,name:e.target.value}))} placeholder={step.name} /></div>
            <div className="space-y-2"><Label>Billing type</Label><Select disabled={readOnly} value={offer?.settings?.mode || "payment"} onValueChange={(value)=>setOffer((current:any)=>({...current,settings:{...(current?.settings||{}),mode:value}}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="payment">One-time payment</SelectItem><SelectItem value="subscription">Monthly subscription</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Amount</Label><Input disabled={readOnly} type="number" min="0" step="0.01" value={offer?.amount ?? 0} onChange={(e)=>setOffer((current:any)=>({...current,amount:Number(e.target.value)}))} /></div>
            <div className="space-y-2"><Label>Currency</Label><Select disabled={readOnly} value={offer?.currency || "USD"} onValueChange={(value)=>setOffer((current:any)=>({...current,currency:value}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["USD","MYR","SGD","GBP"].map((currency)=><SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea disabled={readOnly} value={offer?.description || ""} onChange={(e)=>setOffer((current:any)=>({...current,description:e.target.value}))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Stripe Price ID <span className="font-normal text-slate-400">optional</span></Label><Input disabled={readOnly} value={offer?.stripe_price_id || ""} onChange={(e)=>setOffer((current:any)=>({...current,stripe_price_id:e.target.value}))} placeholder="price_..." /></div>
          </div>
        </Card>
      ) : null}

      <Card className="rounded-[2rem] border-slate-200 p-6">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-violet-600" /><div><h3 className="font-black text-slate-950">A/B variants</h3><p className="text-xs font-semibold text-slate-500">Variants share this step's destination but can test different page content.</p></div></div>{!readOnly ? <Button variant="outline" onClick={() => void addVariant()} className="rounded-xl">Create variant</Button> : null}</div>
        <div className="mt-5 space-y-3">
          {variants.length ? variants.map((variant) => (
            <div key={variant.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_120px]">
                  <div className="space-y-1.5"><Label>Variant name</Label><Input disabled={readOnly} value={variant.name || ""} onChange={(e)=>updateVariantLocal(variant.id,{name:e.target.value})} /></div>
                  <div className="space-y-1.5"><Label>Traffic %</Label><Input disabled={readOnly} type="number" min="0" max="100" value={variant.weight ?? 0} onChange={(e)=>updateVariantLocal(variant.id,{weight:Number(e.target.value)})} /></div>
                  <div className="space-y-1.5 sm:col-span-2"><Label>Headline override</Label><Input disabled={readOnly} value={variant.page_content?.headline || ""} onChange={(e)=>updateVariantLocal(variant.id,{page_content:{...(variant.page_content||{}),headline:e.target.value}})} placeholder="Leave blank to inherit base copy" /></div>
                  <div className="space-y-1.5 sm:col-span-2"><Label>CTA override</Label><Input disabled={readOnly} value={variant.page_content?.ctaLabel || ""} onChange={(e)=>updateVariantLocal(variant.id,{page_content:{...(variant.page_content||{}),ctaLabel:e.target.value}})} placeholder="Optional" /></div>
                </div>
                {!readOnly ? <div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>void saveVariant(variant)} className="rounded-xl"><Save className="mr-1.5 h-3.5 w-3.5" />Save</Button><Button size="sm" variant="outline" onClick={()=>void removeVariant(variant.id)} className="rounded-xl text-rose-600"><Trash2 className="h-3.5 w-3.5" /></Button></div> : <Badge variant="outline">{variant.weight}% traffic</Badge>}
              </div>
            </div>
          )) : <p className="text-sm font-semibold text-slate-400">No variants. The base step receives 100% of traffic.</p>}
          {variants.length ? (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
              Variant traffic: {variants.reduce((sum,item)=>sum+Number(item.weight||0),0)}%. The base step receives the remaining traffic up to 100%.
              {variants.reduce((sum,item)=>sum+Number(item.weight||0),0) > 100 ? <span className="ml-1 font-black text-rose-600">Reduce variant weights to 100% or less.</span> : null}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
