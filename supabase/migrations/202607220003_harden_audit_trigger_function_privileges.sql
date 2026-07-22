-- Prevent trigger-only audit functions from being callable through RPC.

REVOKE ALL ON FUNCTION public.audit_important_business_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_important_business_changes() FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.audit_important_website_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_important_website_changes() FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.audit_important_profile_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_important_profile_changes() FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
