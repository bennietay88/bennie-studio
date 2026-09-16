import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CircleDollarSign, Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type Transaction = { id: string; transaction_type: string; source_type: string; description: string; currency: string; amount: number; base_currency_amount: number | null; category: string | null; reconciliation_status: string; review_status: string; transaction_date: string };

export function FinanceDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [attention, setAttention] = useState<any[]>([]);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expense, setExpense] = useState({ description: "", amount: "", currency: "USD", category: "Software", vendor: "" });

  const load = async () => {
    setLoading(true);
    const [tx, issues, settings] = await Promise.all([
      supabase.from("finance_transactions").select("id,transaction_type,source_type,description,currency,amount,base_currency_amount,category,reconciliation_status,review_status,transaction_date").order("transaction_date", { ascending: false }).limit(200),
      supabase.from("finance_needs_attention").select("id,severity,title,details,status,created_at").eq("status", "OPEN").order("created_at", { ascending: false }).limit(20),
      supabase.from("finance_settings").select("base_currency").eq("id", "platform").maybeSingle(),
    ]);
    if (tx.error) toast.error(`Finance ledger unavailable: ${tx.error.message}`); else setTransactions((tx.data || []) as Transaction[]);
    if (!issues.error) setAttention(issues.data || []);
    if (!settings.error && settings.data?.base_currency) setBaseCurrency(settings.data.base_currency);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const totals = useMemo(() => transactions.reduce((sum, tx) => {
    const amount = Number(tx.base_currency_amount ?? tx.amount) || 0;
    if (["income"].includes(tx.transaction_type)) sum.income += amount;
    if (["refund"].includes(tx.transaction_type)) sum.refunds += amount;
    if (["expense", "fee"].includes(tx.transaction_type)) sum.expenses += amount;
    if (tx.reconciliation_status !== "RECONCILED") sum.unreconciled += 1;
    if (tx.review_status !== "REVIEWED") sum.review += 1;
    return sum;
  }, { income: 0, refunds: 0, expenses: 0, unreconciled: 0, review: 0 }), [transactions]);

  const addExpense = async () => {
    const amount = Number(expense.amount);
    if (!expense.description.trim() || !Number.isFinite(amount) || amount <= 0) return toast.error("Description and a positive amount are required");
    setSaving(true);
    const { error } = await supabase.from("finance_transactions").insert({ source_type: "EXPENSE", transaction_type: "expense", description: expense.description.trim(), counterparty: expense.vendor.trim() || null, currency: expense.currency, amount, base_currency: expense.currency === baseCurrency ? baseCurrency : null, base_currency_amount: expense.currency === baseCurrency ? amount : null, category: expense.category, status: "posted", reconciliation_status: "UNRECONCILED", document_status: "MISSING", review_status: expense.currency === baseCurrency ? "NOT_REVIEWED" : "REVIEW_REQUIRED" });
    setSaving(false);
    if (error) return toast.error(error.message);
    setExpense({ description: "", amount: "", currency: baseCurrency, category: "Software", vendor: "" });
    toast.success("Expense recorded for review");
    void load();
  };

  if (loading) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  return <div className="space-y-6 py-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Finance operations</p><h1 className="text-4xl font-black tracking-tight text-slate-950">Finance</h1><p className="mt-1 text-sm font-semibold text-slate-500">Operational records prepared for accountant review. Base currency: {baseCurrency}.</p></div><Button variant="outline" className="rounded-xl" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[["Cash in", totals.income - totals.refunds], ["Expenses", totals.expenses], ["Profit estimate", totals.income - totals.refunds - totals.expenses], ["Unreconciled", totals.unreconciled], ["Review needed", totals.review]].map(([label, value]) => <Card key={String(label)} className="rounded-2xl"><CardContent className="p-5"><p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-3 text-2xl font-black text-slate-950">{typeof value === "number" && ["Cash in", "Expenses", "Profit estimate"].includes(String(label)) ? `${baseCurrency} ${value.toFixed(2)}` : value}</p></CardContent></Card>)}</div>
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <Card className="rounded-2xl"><CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-indigo-600" />Recent transactions</CardTitle><Badge variant="outline">{transactions.length} loaded</Badge></CardHeader><CardContent className="space-y-2">{transactions.length === 0 ? <p className="rounded-xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">No finance transactions yet. Stripe payments will appear here after the next trusted webhook.</p> : transactions.slice(0, 12).map((tx) => <div key={tx.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-slate-900">{tx.description}</p><p className="text-xs text-slate-500">{tx.source_type} · {tx.category || "Uncategorized"} · {new Date(tx.transaction_date).toLocaleDateString()}</p></div><div className="text-right"><p className={`font-black ${tx.transaction_type === "income" ? "text-emerald-700" : "text-slate-900"}`}>{tx.currency} {Number(tx.amount).toFixed(2)}</p><p className="text-[10px] font-black uppercase tracking-wider text-amber-600">{tx.reconciliation_status.replace("_", " ")}</p></div></div>)}</CardContent></Card>
      <div className="space-y-6"><Card className="rounded-2xl"><CardHeader><CardTitle>Record expense</CardTitle></CardHeader><CardContent className="space-y-3"><div><Label>Description</Label><Input value={expense.description} onChange={(e) => setExpense({ ...expense, description: e.target.value })} placeholder="Vercel hosting" /></div><div className="grid grid-cols-2 gap-3"><div><Label>Amount</Label><Input type="number" min="0" step="0.01" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} /></div><div><Label>Currency</Label><Select value={expense.currency} onValueChange={(value) => setExpense({ ...expense, currency: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["USD", "MYR", "SGD", "GBP", "EUR"].map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent></Select></div></div><div><Label>Vendor (optional)</Label><Input value={expense.vendor} onChange={(e) => setExpense({ ...expense, vendor: e.target.value })} placeholder="Vendor name" /></div><Button className="w-full rounded-xl bg-indigo-600" disabled={saving} onClick={() => void addExpense()}><Plus className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Record expense"}</Button><p className="text-xs text-slate-500">Foreign-currency expenses are flagged for FX review until a trusted rate is supplied.</p></CardContent></Card>
      <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" />Needs attention</CardTitle></CardHeader><CardContent className="space-y-2">{attention.length === 0 ? <p className="text-sm font-semibold text-emerald-700">No finance exceptions recorded.</p> : attention.slice(0, 6).map((item) => <div key={item.id} className="rounded-xl border border-amber-100 bg-amber-50 p-3"><p className="font-bold text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-600">{item.severity} · {item.details || "Review required"}</p></div>)}</CardContent></Card></div>
    </div>
  </div>;
}
