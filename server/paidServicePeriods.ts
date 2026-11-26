export function paidServicePeriod(invoice: any, businessId: string, plan: string) {
  if (!invoice?.id || Number(invoice.amount_paid) <= 0 || !invoice.status_transitions?.paid_at) return null;
  const line = invoice.lines?.data?.find((line: any) =>
    (line.type === "subscription" || line.parent?.type === "subscription_item_details") &&
    !line.proration && !line.parent?.subscription_item_details?.proration &&
    line.period?.start > 0 && line.period?.end > line.period.start);
  if (!line) return null;
  const iso = (seconds: number) => new Date(seconds * 1000).toISOString();
  return {
    invoice_id: invoice.id, business_id: businessId, plan, period_start: iso(line.period.start),
    period_end: iso(line.period.end), paid_at: iso(invoice.status_transitions.paid_at),
    first_subscription_invoice: invoice.billing_reason === "subscription_create",
  };
}

export async function recordPaidServicePeriod(admin: any, invoice: any, businessId: string, plan: string) {
  const row = paidServicePeriod(invoice,businessId,plan);
  if (!row) return;
  const {error} = await admin.from("paid_service_periods").upsert(row,{onConflict:"invoice_id",ignoreDuplicates:true});
  if (error) throw error;
}
