-- Idempotent payment-to-delivery handoff marker.
alter table public.projects add column if not exists creation_key text;
create unique index if not exists projects_creation_key_unique
  on public.projects (creation_key) where creation_key is not null;
