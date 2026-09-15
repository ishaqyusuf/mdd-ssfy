# ADR: Atomic Distributed Attempt Throttle for Public Web and Mobile Login

## Status

Accepted — deployment verification required before enabling on the public host

## Context

The public iOS binary is downloadable by anyone, while GND data remains behind
existing company-account authentication. Both `/www-mobile-sign-in` and
`/www-legacy-sign-in` are custom password endpoints. Better Auth 1.6's
default in-memory limiter does not give these routes a specific sign-in quota
and cannot provide a shared, atomic counter across serverless instances.
Unbounded attempts would expose existing employee credentials to guessing.

## Decision

Before either custom endpoint looks up a user, consume one attempt from a
distributed, atomic Upstash Redis `EVAL` operation. Apply a 30-attempt/60-second
IP window and, when an email is supplied, a 20-attempt/600-second account
window. Redis keys contain HMAC-SHA256 digests of normalized IP/email using
the existing server-side Better Auth secret; neither raw identifier nor the
secret is transmitted in a key. Return HTTP 429 with `Retry-After` when a
quota is exceeded.

Production login fails closed with HTTP 503 if the trusted Vercel client-IP
header, Upstash REST configuration, hashing secret, or atomic operation is
unavailable. Development and preview retain their existing sign-in behavior.
Only the production Vercel forwarded-IP contract is trusted; another
production reverse proxy requires an explicit, reviewed IP adapter.

## Alternatives

- Better Auth's default or route-specific process-memory quota: insufficient
  for serverless concurrency and not specific to both custom routes by default.
- A `get`/`set` secondary-storage limiter: its read-modify-write sequence can
  race under concurrent attempts. The existing Upstash REST command client
  already supports atomic Lua evaluation.
- A database attempt table: adds a write-heavy auth migration and would still
  need careful atomic increments and retention.
- Best-effort memory fallback during Redis failure: rejected for public
  credential protection because it silently weakens the production boundary.

## Consequences

- Verify the deployed dashboard's Upstash REST variables and trusted Vercel
  headers by *presence only*, then exercise a least-privilege installed-build
  sign-in and 429/503 behavior before App Review. Local profile booleans do not
  prove remote Vercel configuration. No production Redis call is made by tests.
- An Upstash outage or missing deployment setting temporarily prevents login
  rather than opening an unthrottled path. Operations need an alert and a
  recovery procedure; no Apple build or portal action should mask that fault.
- Shared office NATs may hit the IP quota, and repeated guesses can temporarily
  throttle an account. Observe legitimate traffic and tune thresholds only
  after an authorized production rollout. Rotating the auth secret resets key
  namespaces until old counters expire.
- The limiter is an abuse boundary, not a substitute for active-account,
  employee-role, session, or mobile-entitlement checks.

## Implementation Notes

`packages/auth/src/better-auth/www-login-limiter.ts` uses the existing
`@gnd/cache/upstash-rest` adapter; `www.ts` calls it before `findLegacyUser` in
both password endpoints. Focused tests inject a fake command and assert hashed
keys, two quotas, timeout/error fail-closed behavior, and endpoint ordering.
