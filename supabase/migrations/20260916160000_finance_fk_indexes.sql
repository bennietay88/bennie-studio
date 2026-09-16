-- Cover finance foreign keys used by admin review, reconciliation and close workflows.
-- These indexes are additive and safe for existing production data.
create index if not exists finance_close_periods_closed_by_idx
  on public.finance_close_periods(closed_by);
create index if not exists finance_documents_business_idx
  on public.finance_documents(business_id, created_at desc);
create index if not exists finance_documents_created_by_idx
  on public.finance_documents(created_by);
create index if not exists finance_invoices_business_idx
  on public.finance_invoices(business_id, issue_date desc);
create index if not exists finance_needs_attention_resolved_by_idx
  on public.finance_needs_attention(resolved_by);
create index if not exists finance_needs_attention_business_idx
  on public.finance_needs_attention(business_id, created_at desc);
create index if not exists finance_needs_attention_transaction_idx
  on public.finance_needs_attention(transaction_id);
create index if not exists finance_reconciliation_reviewed_by_idx
  on public.finance_reconciliation_matches(reviewed_by);
create index if not exists finance_settings_updated_by_idx
  on public.finance_settings(updated_by);
create index if not exists finance_vendor_bills_business_idx
  on public.finance_vendor_bills(business_id, due_date);
create index if not exists finance_vendor_bills_document_idx
  on public.finance_vendor_bills(document_id);
