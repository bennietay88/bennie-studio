-- Private reusable design presets and opt-in cloud undo snapshots.
create table if not exists public.builder_design_presets (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 100), kind text not null check (kind in ('section','page','motion')),
 payload jsonb not null check (jsonb_typeof(payload)='object' and octet_length(payload::text)<=500000),created_at timestamptz not null default now()
);
create index if not exists builder_design_presets_owner_idx on public.builder_design_presets(owner_id,created_at desc);
alter table public.builder_design_presets enable row level security;
revoke all on public.builder_design_presets from public,anon,authenticated;
grant select,insert,delete on public.builder_design_presets to authenticated;
create policy builder_design_presets_select on public.builder_design_presets for select to authenticated using(owner_id=(select auth.uid()));
create policy builder_design_presets_insert on public.builder_design_presets for insert to authenticated with check(owner_id=(select auth.uid()));
create policy builder_design_presets_delete on public.builder_design_presets for delete to authenticated using(owner_id=(select auth.uid()));
create table if not exists public.builder_cloud_history (
 owner_id uuid not null references auth.users(id) on delete cascade,website_id uuid not null references public.websites(id) on delete cascade,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=1000000),updated_at timestamptz not null default now(),primary key(owner_id,website_id)
);
alter table public.builder_cloud_history enable row level security;
revoke all on public.builder_cloud_history from public,anon,authenticated;
grant select,insert,update,delete on public.builder_cloud_history to authenticated;
create policy builder_cloud_history_owner on public.builder_cloud_history for all to authenticated
using(owner_id=(select auth.uid()) and exists(select 1 from public.websites w where w.id=website_id and (private.is_business_admin(w.business_id) or private.is_super_admin())))
with check(owner_id=(select auth.uid()) and exists(select 1 from public.websites w where w.id=website_id and (private.is_business_admin(w.business_id) or private.is_super_admin())));
