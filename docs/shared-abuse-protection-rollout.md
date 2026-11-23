# Bennie Studio — Shared Abuse Protection

## Overview

The existing Express API rate-limit middleware now uses an atomic Lua fixed-window counter with Upstash Redis. Each counter is shared by all Vercel function instances. Rate-limit keys contain HMAC-SHA256 or SHA-256 identifiers instead of raw email addresses or IPs.

No customer data migration is required. The application already includes `@upstash/redis`.

## Production configuration

Create a Redis database in the Singapore region (or geographically near the Vercel `sin1` functions) and set these **server-only** Vercel production variables:

| Variable | Description |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Redis HTTPS REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Restricted server-side REST token |
| `ABUSE_RATE_LIMIT_HASH_SECRET` | Dedicated long, random server-side HMAC secret; use the same value across instances |
| `ABUSE_REQUIRE_SHARED_REDIS` | Set to `true` only when Redis is configured and verified |

Do not use `VITE_` or `NEXT_PUBLIC_` prefixes. Never commit secret values or print them in build logs.

### Safe deployment sequence

1. Create Redis and configure the REST URL, token, and dedicated hashing secret for an isolated preview environment.
2. Deploy preview with `ABUSE_REQUIRE_SHARED_REDIS=true`. Check a normal form submission succeeds, limits return HTTP 429 after the allowance, and `Retry-After` is returned.
3. Confirm a Redis connectivity failure returns **503** for sensitive submissions while low-risk reads stay available under local limits.
4. Configure production credentials, set `ABUSE_REQUIRE_SHARED_REDIS=true`, and only then perform a production deployment with the reviewed release commit.
5. Check `/api/system/status` as an authenticated admin. Its existing `upstash` indicator checks environment presence; an active counter test is still needed to confirm connectivity.
6. Review production logs for `redis_abuse_counter_unavailable`, `required_redis_abuse_counter_missing`, and `abuse_rate_limit_exceeded`. These logs include only a route-scope label, never the visitor's IP/email.
7. Retain rollback access. Turning off shared enforcement can restore local-memory fallback for emergency operations, but weakens cross-instance protection; prefer restoring Redis first.

## Behavior

- **Shared store healthy:** atomic counter; permitted requests continue, excess requests return HTTP 429 with `Retry-After`.
- **Shared store down while configured:** sensitive write/expensive actions return HTTP 503; non-sensitive endpoints use bounded per-instance memory.
- **No Redis, strict shared mode enabled:** sensitive actions return HTTP 503.
- **No Redis, strict shared mode disabled:** locally scoped memory limits remain for compatibility, but the system is *not* protected across serverless instances.
- **Test environment:** `E2E_TEST` bypass works only on non-Vercel, non-production servers. Never set this in production.

The sensitive endpoint category includes newsletter subscriptions, public leads, preview generation, checkout creation, booking, public funnel submission and paid actions. Payment **status reads** are expressly excluded so a Redis outage cannot hide already-submitted payment status.

Limits are fixed windows (not rolling/sliding windows) and remain scoped by operation plus an opaque identity key. Attackers can still rotate addresses or use distributed IPs; complement this layer with Vercel WAF/bot mitigations, webhook verification, secure authentication, backend validation and selective CAPTCHA. Shared-IP office/mobile users can occasionally encounter IP-level limits; monitor and tune using real traffic data.

## Verification

Run:

```bash
node --import tsx --test tests/shared-abuse-protection.test.ts
npm run lint
npm run build
node --import tsx --test tests/*.test.ts
npm audit --audit-level=high
```

A live Redis smoke test is required before production: send sequential calls from separate instances to the same scoped identity and verify the shared quota, TTL expiration and `Retry-After`; simulate Redis disconnection to check 503/low-risk fallback. Do not perform traffic flooding or payment calls on production.

## Security notes

The IP resolver trusts `X-Forwarded-For` only on Vercel, which controls that proxy header. On direct servers the peer socket address is used. In custom proxy setups, set up trusted forwarding explicitly and test rather than blindly trusting user-supplied headers.

Hashed rate-limit identities are pseudonymous operational metadata and should be retained only for the required quota TTL. The counter key prefix contains only an approved operation label. No IP or email is written in plaintext into the rate-limit Redis keys.
