
-- Avoid RLS recursion when evaluating alternative affiliate INSERT policies.
-- This helper only validates an enabled business program and blocks owner self-referrals.

create or replace function private.can_apply_to_business_affiliate_program(
  target_business_id uuid,
  applicant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
  select target_business_id is not null
    and applicant_id is not null
    and exists (
      select 1
      from public.affiliate_programs ap
      where ap.business_id = target_business_id
        and ap.is_enabled = true
    )
    and not exists (
      select 1
      from public.businesses b
      where b.id = target_business_id
        and b.owner_id = applicant_id
    );
$function$;

revoke all on function private.can_apply_to_business_affiliate_program(uuid, uuid) from public;
grant execute on function private.can_apply_to_business_affiliate_program(uuid, uuid) to authenticated;

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
    and private.can_apply_to_business_affiliate_program(
      business_id,
      (select auth.uid())
    )
  );

notify pgrst, 'reload schema';
