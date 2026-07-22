# Security Deployment Notes

## Supabase migration

Apply this migration before deploying the latest app code:

```text
supabase/migrations/202605180001_security_hardening.sql
```

It removes public `SELECT` access from `businesses`, adds the safe `public_businesses` view used by the public website renderer, and creates/locks down the `api_keys` table.

## Distributed rate limiting

Local development uses in-memory rate limiting. Production should use Upstash Redis so rate limits work across multiple serverless instances.

Required environment variables:

```text
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

If these are missing, the server logs a warning and falls back to in-memory limits.

## CSP/tracking scripts

The app still allows inline scripts because the product supports custom tracking snippets. To make CSP strict, replace arbitrary tracking snippets with an allowlisted integration model or nonce-based script injection.
