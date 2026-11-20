# Outreach engine repair — implementation handoff

Branch: `codex/outreach-engine-repair-2026-11-19`  
Base: `main` at `4985163`  
Date: 2026-11-19

## Implemented

- Provider acceptance is recorded separately from receiving-server confirmation. New sends retain the legacy `sent` status for compatibility, while `delivery_state` distinguishes acceptance, unconfirmed delivery, confirmed delivery, bounce, complaint, rejection, failure, and uncertainty. Provider, mailbox, from/reply-to, attempt and acceptance times, content hash, campaign, and last event are stored.
- Resend delivery webhooks now write an idempotent append-only event ledger and update delivery evidence without changing `sent` to `delivered`. Duplicate events and terminal bounce/complaint outcomes are protected from downgrade. Hostinger SMTP receipts identify Hostinger and record acceptance only.
- Inbound correlation now requires a provider message/thread reference matching both the outbound provider ID and sender. Sender-recency attribution was removed. Unmatched inbound messages are retained and create a reconciliation task. Vacation replies and delivery notices are classified separately and excluded from human reply counts. Opt-outs suppress the sender even when thread matching fails.
- Imported uploader notes do not create or backdate recipient consent. Sending fails closed unless exact-address opt-in, a recognized jurisdiction, recipient type, consent basis, and a separate operator confirmation are present. The legacy consent-attestation endpoint returns `410` and performs no writes.
- Missing website data remains `unknown`. New follow-up templates use neutral wording until dated, attributable website evidence exists. The scorer is version 2, evidence-based, awards zero for unknown facts and email syntax alone, and persists import-time component scores. An admin endpoint recalculates an individual prospect score.
- The Super Admin sales views separate confirmed, unconfirmed, accepted and legacy-unknown messages and exclude automated replies from human reply rate.

## Migration

`supabase/migrations/20261119150000_outreach_engine_repair_foundation.sql` adds evidence, eligibility and score fields; provider lifecycle fields and indexes; provider-event ledger/RLS/append-only protection; and tier-category compatibility. It performs no data backfill and does not alter historical prospect, consent, or message rows.

Rollback is code-first and non-destructive: pause the rollout, revert the application release, and leave additive fields/table in place so event and audit evidence is retained. Do not drop the ledger or evidence columns as a routine rollback. If removal is later required, first export and archive the event ledger, confirm no deployed code depends on the columns, then prepare and review a separate down migration for the specific target schema.

## Staging validation SQL

Run only after an isolated staging database is available and the migration is applied there:

```sql
select delivery_state, count(*)
from public.sales_messages
where direction = 'outbound'
group by delivery_state order by delivery_state;

select provider, event_type, count(*)
from public.sales_email_provider_events
group by provider, event_type order by provider, event_type;

select id, website_status, website_evidence_source_url, website_verified_at,
       website_verification_method, website_finding, website_verified_by
from public.prospects
where website_status <> 'unknown'
  and (website_evidence_source_url is null or website_verified_at is null
       or website_verification_method is null or website_finding is null
       or website_verified_by is null);

select task_type, status, count(*)
from public.sales_tasks
where status = 'open'
group by task_type, status order by task_type;
```

The website query should return no newly classified rows missing evidence; historical rows are intentionally preserved. Task counts are diagnostic only; no task is automatically dismissed or deleted.

For a read-only historical task dry run, add this query after confirming the target schema has the referenced status/email columns:

```sql
with open_tasks as (
  select t.*, p.status as prospect_status, p.outreach_status as prospect_outreach_status,
         p.contact_email as prospect_email, l.status as lead_status, l.email as lead_email,
         row_number() over (
           partition by coalesce(t.prospect_id::text, t.lead_id::text, t.proposal_id::text), t.task_type
           order by t.due_at nulls last, t.created_at, t.id
         ) as duplicate_rank
  from public.sales_tasks t
  left join public.prospects p on p.id = t.prospect_id
  left join public.leads l on l.id = t.lead_id
  where t.status = 'open'
)
select case
  when task_type in ('reply_reconciliation','reply_review') then 'waiting_manual_review'
  when coalesce(prospect_outreach_status, '') in ('won','lost','closed','converted','paid','unsubscribed')
    or coalesce(prospect_status, '') in ('converted','lost')
    or coalesce(lead_status, '') in ('won','lost','closed','converted','paid','unsubscribed') then 'linked_closed'
  when exists (select 1 from public.sales_suppressions s
    where lower(s.email) = lower(coalesce(prospect_email, lead_email, ''))) then 'linked_suppressed'
  when duplicate_rank > 1 then 'duplicate_candidate'
  when prospect_id is null and lead_id is null and proposal_id is null then 'technically_inconsistent'
  else 'still_actionable'
end as dry_run_bucket, count(*)
from open_tasks group by 1 order by 1;
```

This is a first-pass report; operators should inspect individual rows before changing task status. It does not classify or dismiss superseded tasks automatically.

## Release gates and limitations

- The connected production Supabase account was inspected read-only. No production data, migrations, campaigns, email sends, or deployments were changed.
- An isolated Supabase staging branch could not be provisioned: the branch-creation confirmation expired, and the subsequent request returned `Branch creation was declined`. Migration replay, RLS execution, and staging-provider webhook verification therefore remain blocked.
- Do not promote until staging migration replay, migration validation queries, RLS tests, Resend signature/idempotency checks, Hostinger acceptance checks, and admin UI checks pass. Production migration and deploy require their separately authorized release step.
- The permission gate is intentionally conservative: only exact-address documented opt-in currently passes. Jurisdiction-specific legal rules still require review before supporting other lawful bases. It does not make a legal determination.
- Legacy rows default to `delivery_state='unknown'`; the migration does not infer historical acceptance or delivery timestamps. Inbox placement and human reading remain unmeasured.

## Local test commands

```bash
npm ci
npm run lint
npm run build
npm test
npm run e2e
```

Validation completed on the development branch, rebased onto production source commit `834029d`:

- `npm ci`: passed, 542 packages installed, 0 vulnerabilities.
- `npm run vercel-build`: passed, including TypeScript, production build, 446 unit tests, and `npm audit --audit-level=high`.
- `git diff --check`: passed.
- The earlier browser matrix on the pre-rebase snapshot reported 505 passed, 9 failed, and 16 skipped. It was not rerun after rebasing; its failures were in commercial preview copy, CTA, responsive layout, and a mobile pricing route. No live email tests are included.

The latest production Vercel build had failed because `trial_ends_at` was read without being included in the custom-domain business select. The field is now selected; the exact Vercel build command passes locally on the rebased source. E2E uses local fixture credentials and loopback servers.
