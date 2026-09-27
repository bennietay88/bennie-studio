
-- Affiliate self-service applications must be immutable server-trusted financial state.

drop policy if exists "Users can apply to platform affiliate program" on public.affiliates;
create policy "Users can apply to platform affiliate program"
  on public.affiliates
  for insert
  to authenticated
  with check (
    (select auth.uid()) = uid
    and business_id is null
    and status = 'pending'
    and coalesce(total_earnings, 0) = 0
    and coalesce(unpaid_earnings, 0) = 0
    and coalesce(total_referrals, 0) = 0
    and approved_at is null
    and rejected_at is null
    and suspended_at is null
    and admin_notes is null
  );

drop policy if exists "Users can apply to business affiliate program" on public.affiliates;
create policy "Users can apply to business affiliate program"
  on public.affiliates
  for insert
  to authenticated
  with check (
    (select auth.uid()) = uid
    and business_id is not null
    and status = 'pending'
    and coalesce(total_earnings, 0) = 0
    and coalesce(unpaid_earnings, 0) = 0
    and coalesce(total_referrals, 0) = 0
    and approved_at is null
    and rejected_at is null
    and suspended_at is null
    and admin_notes is null
    and exists (
      select 1
      from public.affiliate_programs ap
      where ap.business_id = affiliates.business_id
        and ap.is_enabled = true
    )
    and not exists (
      select 1
      from public.businesses b
      where b.id = affiliates.business_id
        and b.owner_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';
