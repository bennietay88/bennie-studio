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
```

Required in production for distributed rate limiting:

```text
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

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
npm run smoke:audit
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

Apply migrations in `supabase/migrations` before deploying app code that depends on them. The security hardening migration is required for production:

```text
supabase/migrations/202605180001_security_hardening.sql
```

The latest schema snapshot is `supabase_schema.sql`.

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
