-- Client Blog CMS access is tenant-scoped and controlled by the business feature visibility settings.
-- Reuse the hardened tenant-membership helper instead of broadening business-admin privileges.
drop policy if exists "Business members can manage posts" on public.posts;

create policy "Business members can manage posts"
on public.posts
for all
to authenticated
using (private.is_business_member(business_id))
with check (private.is_business_member(business_id));
