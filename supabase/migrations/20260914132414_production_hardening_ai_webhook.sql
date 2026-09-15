-- Production hardening: Stripe webhook claims and explicit AI entitlements.
create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_stripe_webhook_events_status on public.stripe_webhook_events(status, created_at desc);
alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from anon, authenticated;
grant all on table public.stripe_webhook_events to service_role;

-- Never manufacture an AI allowance for a user who has no explicit entitlement.
create or replace function public.validate_and_deduct_credits(
  p_user_id uuid, p_feature_key text, p_is_chatgpt boolean
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_plan_slug text; v_daily_limit integer; v_chatgpt_enabled boolean;
  v_chatgpt_limit integer; v_credit_cost integer; v_balance_id uuid;
  v_credits_remaining integer; v_reset_date timestamptz;
  v_daily_requests integer := 0; v_chatgpt_actions integer := 0;
begin
  select p.slug, p.daily_request_limit, p.chatgpt_enabled, p.monthly_chatgpt_action_limit
    into v_plan_slug, v_daily_limit, v_chatgpt_enabled, v_chatgpt_limit
  from user_subscriptions us join plans p on us.plan_id = p.id
  where us.user_id = p_user_id and us.status in ('active','trialing')
    and (us.current_period_end is null or us.current_period_end >= now())
  order by us.current_period_end desc nulls last limit 1;
  if v_plan_slug is null then return jsonb_build_object('success', false, 'error', 'AI_ENTITLEMENT_REQUIRED'); end if;
  select credit_cost into v_credit_cost from ai_feature_costs where feature_key = p_feature_key and is_active = true;
  if v_credit_cost is null then return jsonb_build_object('success', false, 'error', 'FEATURE_NOT_FOUND'); end if;
  select id, credits_remaining, reset_date into v_balance_id, v_credits_remaining, v_reset_date
    from ai_credit_balances where user_id = p_user_id for update;
  if v_balance_id is null then return jsonb_build_object('success', false, 'error', 'AI_ENTITLEMENT_REQUIRED'); end if;
  if v_reset_date is not null and v_reset_date <= now() then
    update ai_credit_balances set credits_remaining = monthly_credit_limit, credits_used = 0,
      reset_date = now() + interval '1 month', updated_at = now() where id = v_balance_id
      returning credits_remaining, reset_date into v_credits_remaining, v_reset_date;
  end if;
  if v_credits_remaining < v_credit_cost then return jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS'); end if;
  select coalesce(request_count,0), coalesce(chatgpt_action_count,0) into v_daily_requests, v_chatgpt_actions
    from ai_daily_usage where user_id = p_user_id and usage_date = current_date;
  if coalesce(v_daily_requests,0) >= coalesce(v_daily_limit,20) then return jsonb_build_object('success', false, 'error', 'DAILY_LIMIT_EXCEEDED'); end if;
  if p_is_chatgpt and not coalesce(v_chatgpt_enabled,false) then return jsonb_build_object('success', false, 'error', 'CHATGPT_NOT_ALLOWED'); end if;
  if p_is_chatgpt and coalesce(v_chatgpt_actions,0) >= coalesce(v_chatgpt_limit,0) then return jsonb_build_object('success', false, 'error', 'CHATGPT_DAILY_LIMIT_EXCEEDED'); end if;
  update ai_credit_balances set credits_remaining = credits_remaining - v_credit_cost, credits_used = credits_used + v_credit_cost, updated_at = now() where id = v_balance_id;
  insert into ai_daily_usage(user_id, usage_date, request_count, credits_used, chatgpt_action_count)
    values(p_user_id,current_date,1,v_credit_cost,case when p_is_chatgpt then 1 else 0 end)
    on conflict(user_id,usage_date) do update set request_count = ai_daily_usage.request_count + 1,
      credits_used = ai_daily_usage.credits_used + v_credit_cost,
      chatgpt_action_count = ai_daily_usage.chatgpt_action_count + case when p_is_chatgpt then 1 else 0 end;
  return jsonb_build_object('success',true,'credits_charged',v_credit_cost,'credits_remaining',v_credits_remaining-v_credit_cost);
end; $$;
revoke all on function public.validate_and_deduct_credits(uuid,text,boolean) from public, anon, authenticated;
grant execute on function public.validate_and_deduct_credits(uuid,text,boolean) to service_role;

insert into public.settings(id, content, updated_at)
values ('launch_flags', jsonb_build_object('ai_credit_topups_enabled', false), now())
on conflict (id) do update set content = coalesce(public.settings.content,'{}'::jsonb) || jsonb_build_object('ai_credit_topups_enabled', false), updated_at = now();

