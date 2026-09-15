# Public Mobile and Web Password-Login Abuse Protection

The public iOS App Store binary does not create public accounts. Existing
employee/manager credentials sign in through the dashboard's Better Auth
`POST /api/auth/www-mobile-sign-in` route; web legacy credentials use
`POST /api/auth/www-legacy-sign-in`. Both endpoints now consume an attempt
before legacy-user lookup or password verification. This does not change the
existing session, role-liveness, or mobile-access permission checks.

In production on Vercel, one atomic Upstash operation increments a hashed
client-IP counter (30 attempts per 60 seconds) and, when an email is present,
a hashed account counter (20 attempts per 600 seconds). No raw email, IP,
password, OTP, Apple credential, or HMAC secret is placed in Redis keys.
An over-quota request returns HTTP 429 with `Retry-After` of the applicable
window. Missing trustworthy proxy/IP, hashing key, Upstash REST config, or
invalid/failed/timed-out Redis execution returns HTTP 503 with a neutral
temporary-unavailability message. Invalid credentials continue to return the
existing unauthorized response once an attempt is admitted. Development and
preview retain their prior behavior.

Deployment readiness: confirm production dashboard has its existing Upstash
REST variables and Vercel forwarded-IP headers by presence only; do not print
or transmit their values. Exercise a least-privilege installed-build login and
the 429/503 behavior before App Review. The locally selected production
profile has required variable names, but that does not prove the remote
deployment. If deployed behind another proxy, implement/review a trusted-IP
adapter before enabling this production path. See
[ADR-102](../decisions/ADR-102-atomic-distributed-public-login-attempt-throttle.md).
