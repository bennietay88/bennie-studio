-- The earlier generated index name was truncated for this table and collided
-- between two foreign keys. Add the missing user index explicitly.
create index if not exists idx_custom_website_applications_user_id
  on public.custom_website_applications (user_id);

-- Anonymous visitors are the only callers that need the public published-site
-- policy. Authenticated users are covered by the tenant-scoped policy above.
drop policy if exists "Public can view published websites" on public.websites;
create policy "Anonymous visitors can view published websites"
on public.websites for select to anon
using (status = 'published');
