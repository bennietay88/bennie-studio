import React from "react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export const CommercialCatalogue: React.FC = () => {
  const [catalogue, setCatalogue] = React.useState<any>(null);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    fetch("/api/admin/commercial-catalogue").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load catalogue");
      setCatalogue(data);
    }).catch((reason) => setError(reason.message));
  }, []);
  if (error) return <Card><CardContent className="p-6 text-sm font-bold text-rose-600">{error}</CardContent></Card>;
  if (!catalogue) return <Card><CardContent className="p-6 text-sm font-bold text-slate-500">Loading current commercial catalogue…</CardContent></Card>;
  return <Card className="mb-8 rounded-3xl border-indigo-100 shadow-sm"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-2xl font-black">Products &amp; Pricing</CardTitle><p className="mt-1 text-sm font-semibold text-slate-500">Current products are sold from this catalogue. Legacy plans below remain available for existing subscribers only.</p></div><Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">Current sales architecture</Badge></div></CardHeader><CardContent className="space-y-4">{catalogue.products.map((product: any) => <div key={product.slug} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-slate-950">{product.name}</p><p className="text-xs font-semibold text-slate-500">{product.slug} · {product.sales_motion} · {product.active ? "active" : "inactive"}</p></div><div className="flex flex-wrap gap-2">{catalogue.prices.filter((price: any) => price.product_id === product.id).map((price: any) => <span key={price.id} className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">{price.market} · {price.currency} {price.monthly_price === null ? `from ${price.setup_fee}` : `${price.monthly_price}/mo + ${price.setup_fee} setup`}</span>)}</div></div></div>)}<div className="border-t border-slate-100 pt-4"><p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Legacy plans · existing customers</p><div className="flex flex-wrap gap-2">{catalogue.legacyPlans.map((plan: any) => <Badge key={plan.id} variant="outline" className="font-bold">{plan.name} · {plan.slug} · {plan.is_active ? "active" : "inactive"}</Badge>)}</div></div><div><p className="text-xs font-black uppercase tracking-widest text-slate-400">Promotions</p><p className="mt-1 text-sm font-semibold text-slate-500">{catalogue.promotions.length ? `${catalogue.promotions.length} configured promotion(s)` : "No promotions active. Configure one before applying a campaign."}</p></div></CardContent></Card>;
};
export default CommercialCatalogue;
