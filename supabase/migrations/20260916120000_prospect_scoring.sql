-- Explainable prospect scoring. Additive and safe for existing records.
alter table public.prospects
  add column if not exists qualification_score integer,
  add column if not exists qualification_category text,
  add column if not exists score_factors jsonb not null default '[]'::jsonb,
  add column if not exists recommended_next_action text,
  add column if not exists scoring_version text,
  add column if not exists scored_at timestamptz;

alter table public.prospects drop constraint if exists prospects_qualification_category_check;
alter table public.prospects add constraint prospects_qualification_category_check
  check (qualification_category is null or qualification_category in ('high_intent','qualified','nurture'));
alter table public.prospects drop constraint if exists prospects_qualification_score_check;
alter table public.prospects add constraint prospects_qualification_score_check
  check (qualification_score is null or (qualification_score between 0 and 100));
create index if not exists idx_prospects_score_action on public.prospects (qualification_score desc, recommended_next_action, scored_at desc);
