# Bennie Tay Studio

Professionally managed website service for Bennie Tay Studio. The app combines public sales pages, customer dashboards, managed website rendering/editing, CRM, appointments, CMS tools, content workflows, billing, affiliates, WordPress quotation flow, custom domains, and super-admin operations.

## Stack

- React 19, Vite, React Router, Tailwind CSS, local shadcn-style UI components
- Express API server in `api/index.ts`
- Supabase Auth, Database, and Realtime
- Stripe Checkout, Billing Portal, webhooks, and merchant checkout support
- Gemini, OpenAI, and DeepSeek provider paths
- Resend email and optional Upstash Redis rate limiting

## Prerequisites

- Node.js 22 or newer
- npm
- Supabase project credentials
- Stripe keys for billing features
- Upstash Redis credentials for production rate limiting

## Environment

Copy `.env.example` to `.env.local` for local development and fill the values you need.

Required for most app flows:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Required for billing:

```text
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
VITE_STRIPE_PUBLISHABLE_KEY=
BILLING_GRACE_DAYS=7
```

Stripe dunning behavior:

- `invoice.payment_failed` marks the business and user subscription `past_due`, keeps the business active during the configured grace window, and opens a billing lifecycle event.
- `invoice.paid` restores active access, clears the grace window, and resolves open failed-payment events.
- `customer.subscription.deleted` cancels the business subscription, revokes active status, clears grace access, and sets remaining AI credits to zero.
- AI provider calls fail closed when credit deduction cannot be verified, so external AI spend cannot bypass credit caps.

Required in production for distributed rate limiting:

```text
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Required for production custom-domain automation:

```text
PLATFORM_HOSTS=app.bennietay.com,bennietay-studio.vercel.app
VITE_PLATFORM_HOSTS=app.bennietay.com,bennietay-studio.vercel.app
WAAS_ROOT_DOMAIN=growthos.app
VITE_WAAS_ROOT_DOMAIN=growthos.app
VERCEL_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=
```

`VERCEL_PROJECT_NAME` may be used instead of `VERCEL_PROJECT_ID`. `VERCEL_TEAM_SLUG` is optional if `VERCEL_TEAM_ID` is set.

Local server binding can be controlled with:

```text
HOST=127.0.0.1
PORT=3000
```

## Local Development

```bash
npm install
npm run dev
```

The dev server runs the Express app with Vite middleware. For local browser testing, use `HOST=127.0.0.1 PORT=3000 npm run dev` if your environment blocks `0.0.0.0`.

## Build And Run

```bash
npm run build
HOST=127.0.0.1 PORT=3000 npm start
```

`npm run build` creates the Vite frontend bundle and `dist/server.cjs`.

## Verification

```bash
npm run lint
npm run build
npm run smoke
npm run e2e
npm run smoke:audit
```

The Playwright E2E suite starts the local Express/Vite app and mocks Supabase plus Stripe network boundaries. The primary test covers signup, dashboard plan checkout, checkout confirmation, onboarding, and website handoff without requiring live credentials.

To run the E2E browser in headed mode:

```bash
npm run e2e:headed
```

For a live or staging deployment:

```bash
SMOKE_BASE_URL=https://app.bennietay.com npm run smoke
```

Authenticated smoke checks require:

```text
SMOKE_BASE_URL=
SMOKE_BUSINESS_EMAIL=
SMOKE_BUSINESS_PASSWORD=
SMOKE_SUPERADMIN_EMAIL=
SMOKE_SUPERADMIN_PASSWORD=
```

Then run:

```bash
npm run smoke:auth
```

## Supabase

Apply migrations in `supabase/migrations` before deploying app code that depends on them. Root-level `.sql` files are not used for deployment.

Local development uses the committed Supabase CLI config:

```bash
supabase start
supabase db reset
```

Production migration deployment is handled by `.github/workflows/supabase-migrations.yml`. Configure these GitHub repository or environment secrets:

```text
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_REF
SUPABASE_DB_PASSWORD
```

Historical full-schema snapshots live in `supabase/migrations/legacy_snapshots/` for reference only and are not part of the runnable migration chain.

## Custom Domains

Tenant host routing is handled in root `middleware.ts` before cached/static app delivery:

- `client.com` and `www.client.com` resolve through `businesses.custom_domain`.
- `client.growthos.app` resolves through `businesses.subdomain`.
- Custom domains require active business status, active or grace-period subscription, permission confirmation, verified domain, issued SSL, non-suspended domain, and a published website.
- Platform subdomains require active business status, active or grace-period subscription, and a published website.

Domain verification and Vercel Project Domain registration are handled by `/api/custom-domain/verify`. Apex domains should point to `76.76.21.21`; `www` subdomains should point to the configured `VERCEL_CNAME_TARGET`.

## Async Jobs

Long-running work uses the `public.async_jobs` table added by `supabase/migrations/202607250001_async_job_queue.sql`. The table is service-role only; clients read job state through API routes instead of direct Supabase access.

Current worker coverage:

- `website_audit`: queued version of the public website audit flow.
- `ai_generation`: registered for queue inventory, but still synchronous until the authenticated generation UI is moved to polling.
- `local_seo_audit`: registered for queue inventory; current Local SEO drafts remain deterministic client-side generation.

Worker endpoints:

- `POST /api/jobs/process` processes a queued job when called with `Authorization: Bearer $JOB_WORKER_SECRET`.
- `GET /api/jobs/:jobId` returns sanitized status/results to the owning user, platform staff, or super admin.

Optional QStash dispatch is enabled with `QSTASH_TOKEN`, `JOB_WORKER_SECRET`, and `APP_PUBLIC_URL`. Without QStash, jobs remain queued for scheduled polling by cron or manual worker calls.

## Observability

The app emits structured JSON logs for API requests and captures server/browser exceptions through Sentry when DSNs are configured.

Server-side:

- `api/observability.ts` initializes `@sentry/node`.
- API requests log `request_started` and `request_completed` with request ID, route, status code, duration, and Vercel invocation ID.
- The global Express error handler captures sanitized exceptions and returns the request ID to the client.

Browser-side:

- `src/lib/observability.ts` initializes `@sentry/react`.
- `ErrorBoundary` reports React render failures to Sentry and still preserves the local admin-readable error log.
- Unhandled browser errors and rejected promises are captured when `VITE_SENTRY_DSN` is present.

Required production variables:

```text
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.05
VITE_SENTRY_DSN=
VITE_SENTRY_TRACES_SAMPLE_RATE=0.05
```

Use Vercel log drains later if you want logs forwarded to a warehouse or external logging platform. The structured JSON logs are already shaped for that.

## Deployment Notes

- On Vercel, the API exports the Express app and does not call `listen`.
- In non-Vercel production, `npm start` serves `dist` through Express.
- Configure Upstash Redis in production; otherwise rate limits are per-process memory only.
- Review `SECURITY_DEPLOYMENT.md` before production changes.

## Security Maintenance

Run this regularly:

```bash
npm audit --omit=dev --audit-level=moderate
```

Keep `package-lock.json` committed after dependency updates.
