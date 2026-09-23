-- Profile provisioning is server-owned through /api/auth/ensure-profile.
-- Keep the legacy helper unavailable to browser sessions so public users
-- cannot race the server bootstrap path or choose a different account class.
revoke all on function public.create_customer_profile() from public, anon, authenticated;
grant execute on function public.create_customer_profile() to service_role;
