-- Refund an AI deduction atomically when the upstream provider fails.
-- This function is deliberately service-role only; clients must never mint credits.
create or replace function public.refund_ai_credits(
  p_user_id uuid,
  p_feature_key text,
  p_is_chatgpt boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit_cost integer;
  v_credits_remaining integer;
begin
  select credit_cost
  into v_credit_cost
  from public.ai_feature_costs
  where feature_key = p_feature_key
    and is_active = true;

  if v_credit_cost is null or v_credit_cost <= 0 then
    return jsonb_build_object('success', false, 'error', 'FEATURE_NOT_FOUND');
  end if;

  update public.ai_credit_balances
  set credits_remaining = least(monthly_credit_limit, credits_remaining + v_credit_cost),
      credits_used = greatest(0, credits_used - v_credit_cost),
      updated_at = now()
  where user_id = p_user_id
  returning credits_remaining into v_credits_remaining;

  if v_credits_remaining is null then
    return jsonb_build_object('success', false, 'error', 'BALANCE_NOT_FOUND');
  end if;

  update public.ai_daily_usage
  set request_count = greatest(0, request_count - 1),
      credits_used = greatest(0, credits_used - v_credit_cost),
      chatgpt_action_count = greatest(
        0,
        chatgpt_action_count - case when p_is_chatgpt then 1 else 0 end
      )
  where user_id = p_user_id
    and usage_date = current_date;

  return jsonb_build_object(
    'success', true,
    'credits_refunded', v_credit_cost,
    'credits_remaining', v_credits_remaining
  );
end;
$$;

revoke all on function public.refund_ai_credits(uuid, text, boolean) from public;
revoke all on function public.refund_ai_credits(uuid, text, boolean) from anon;
revoke all on function public.refund_ai_credits(uuid, text, boolean) from authenticated;
grant execute on function public.refund_ai_credits(uuid, text, boolean) to service_role;

notify pgrst, 'reload schema';
