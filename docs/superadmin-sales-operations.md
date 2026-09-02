# Superadmin sales operations — 31 August 2026

## Scope and release status

Functional changes to lead import/routing, outreach delivery and follow-up handling. Existing page layouts, authentication, database tables and email provider are retained. This pass did not deploy, send real outreach, change credentials, mutate production records or alter Stripe/billing.

## Implemented

- CSV import now runs through an authenticated sales endpoint. It accepts quoted commas, escaped quotes, multiline fields and BOMs, normalizes contact fields, validates the entire file before insertion, caps each file at 500 rows/500,000 characters, and checks existing records for duplicate domains, emails and business/location pairs. Existing records are not overwritten. Duplicate checking scans multiple pages rather than just the first 1,000 records.
- Inbound routing no longer interprets the `now` inside `unknown` as urgency. A 24-hour target is labelled as 24 hours, not a business-day calculation.
- A specific verified observation is required before outreach. Arbitrary notes or an inbound enquiry are no longer prefilled as website evidence. Original research notes survive saving an observation.
- Opening/copying an email or WhatsApp draft does not mark the contact as contacted. Explicit send confirmation logs manual outreach and its follow-up. The inbox likewise records a response only when the operator confirms it.
- Concurrent delivery workers must successfully claim a message before sending. Paused parent sequences are excluded from the due-message selection; active bookings are not held behind paused outreach rows.
- First messages always start as drafts. Later steps wait for earlier actual sends and retain their configured delay after late approval, with a minimum one-hour gap.
- Approved text is the delivered content; an older HTML draft cannot override the operator's edits.
- Recipient suppression and contact state are checked before sending. Replies stop sequences. Opt-outs also dismiss outstanding sales follow-up tasks without deleting contact history or unrelated delivery work.
- Delivery callbacks preserve step/booking metadata and cannot downgrade an opened/clicked message to sent. Repeated inbound events produce one reply and one reply task. A completed task does not reopen on webhook retry.
- Failed inbound retrieval returns a retryable error instead of storing a fabricated reply. Associated sequences stop even if retrieving the reply body fails.
- Call outcomes use one follow-up task per call instead of creating a duplicate on every save. Cancelling/completing calls cancels pending reminder messages. Changing a status to `rescheduled` without selecting a new slot is no longer offered.
- Inbox follow-up dates use local wall-clock time and scheduled actions enter the existing sales task queue. Confirmed first responses complete the existing first-response task.
- New import, outreach and call-outcome endpoints enforce superadmin or explicit platform-staff sales permission. Customer accounts cannot use them.

## Verification

- `npm run test:sales`: 33 tests passed. Includes actual service functions against an in-memory query adapter, concurrent worker claims, late approvals, pauses, suppression read failures, uncertain sends, reply retries, manual confirmation, CSV validation and local datetime conversion.
- `npm run test:sales:api`: one integration test against the compiled Express server, with a local Supabase HTTP stub and fixture credentials. It checks six protected sales endpoints, invalid privileged actions and the cron secret boundary. It asserts zero database writes during the checks. Requires a prior `npm run build` and permission to bind loopback ports.
- `npm run lint`: TypeScript check; this script does not run ESLint.
- `npm run build`: frontend and server bundles. Existing warning remains for JavaScript chunks larger than 500 kB.
- `npm run smoke`: nonempty build-artifact checks only; not a live/browser smoke test.
- `git diff --check`: whitespace validation.

Live email delivery, signed provider callbacks, live database RLS/constraints, real admin browser actions and customer workflows are **NOT VERIFIED** by these fixtures.

## Operational limits before broader automation

1. **Scheduling:** the existing cron remains `0 1 * * *` (09:00 Malaysia time daily). It does not provide minute-level follow-ups. The manual Process due messages action is available, but was not operated against production. Choose a supported higher-frequency scheduler separately before promising precise reminder delivery.
2. **Reply capture:** configure a receiving-capable key/domain and signed webhook if they are not already available. The server accepts optional `RESEND_RECEIVING_API_KEY`; otherwise it uses the existing key. A sending-only key cannot retrieve inbound bodies. `SALES_REPLY_TO` must point to an address whose inbound mail reaches the configured receiving workflow. Current production configuration is NOT VERIFIED.
3. **Uncertain delivery:** a provider acceptance followed by database persistence failure is left for manual review. Do not blindly requeue a `sending` or `failed` message: inspect provider delivery first. [Resend idempotency keys expire after 24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys).
4. **Existing damaged metadata:** old messages whose step metadata was overwritten are not guessed or repaired automatically. Their sequencing needs review; the worker defers them safely.
5. **Concurrent enrollment/import:** duplicate checks protect ordinary/repeated requests but are not transaction-level uniqueness constraints across concurrent enrollments/imports. Use one operator per contact/import until a separately reviewed database migration adds that guard. Conditional delivery claims prevent two workers sending the same message row, not two separately created message rows.
6. **Partial saves:** call/lead/task writes reuse existing separate tables, not a new transactional RPC. A reported failure can follow a successful earlier write; refresh and retry. Deterministic task IDs limit duplicate tasks but are not a database transaction.
7. **Legacy customer provisioning:** Prospect Explorer's existing Convert to Customer flow still exposes Starter/Business/Growth trial provisioning. It was not changed because it crosses into customer/subscription creation. Do not use it as evidence of a paid commercial conversion; use the approved proposal/checkout process.
8. **Performance:** the bounded worker still depends on database/provider latency within the deployed function timeout. Larger-volume automation needs load testing, queue/runtime budgeting and transaction-level enrollment uniqueness before scaling.

## Modules touched in this pass

- `api/index.ts`: existing sales routes, worker adapter, reply/delivery callbacks, new prospect import/manual confirmation/call outcome endpoints, lead follow-up task synchronization.
- `server/salesOperations.ts`: reusable delivery, suppression, reply and activity services.
- `server/leadGeneration.ts`: bounded intent matching and accurate SLA wording.
- `src/lib/prospectImport.ts`: CSV parsing and validation.
- `src/lib/salesAutomation.ts`: reply classification, marked observations and local datetime helper.
- `src/components/SuperAdmin/{AdminLeadInbox,OutreachLab,ProspectExplorer,SalesAutomation}.tsx`: connect functional controls to validated actions; no page-layout redesign.
- `tests/{sales-operations,sales-api-boundaries,sales-automation}.test.ts`, `package.json`: regression coverage and test commands.

Other pre-existing workspace changes were preserved, not reset or treated as this pass's work.
