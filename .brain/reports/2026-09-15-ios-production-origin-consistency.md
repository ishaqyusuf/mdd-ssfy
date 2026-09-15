# Public iOS production origin consistency audit

Date: 2026-09-15
Scope: read-only selected local production-profile configuration and route
source. No credentials, cookies, Apple/EAS setting, or live route probe were
used.

## Observed configuration

- `with-env:prod` selects a public HTTPS root
  `EXPO_PUBLIC_BASE_URL` at `gndprodesk.com`.
- The same selected local profile has a public HTTPS root
  `NEXT_PUBLIC_APP_URL` at `oss.gndprodesk.com`. The two origins differ.
- `EXPO_PUBLIC_WEB_URL` is present but is a local, non-HTTPS origin, so it is
  not suitable for an installed public iOS binary.
- Installed release routing in `apps/mobile/src/lib/base-url.ts` currently
  sends both tRPC and Better Auth requests to `EXPO_PUBLIC_BASE_URL`.

Only hostnames and structural booleans were printed by the local probes; no
token, login credential, URL query, or private environment value was printed.
The effective EAS cloud build environment is not proven by this local profile.

## Source boundary

- `apps/dashboard/src/app/api/trpc/[...trpc]/route.ts` exports the internal
  tRPC handler, and `apps/dashboard/src/app/api/auth/[...auth]/route.ts`
  exposes the Better Auth handler.
- `packages/auth/src/better-auth/www.ts` configures its server base from
  `NEXT_PUBLIC_APP_URL`, with the custom `www-mobile-sign-in`,
  `www-mobile-session`, and `www-mobile-sign-out` endpoints.
- `apps/mobile/src/lib/mobile-auth.ts` calls these custom routes below
  `/api/auth`; `apps/mobile/src/trpc/client.tsx` calls `/api/trpc`.
- The standalone API app source has tRPC routes but no inspected
  `/api/auth` handler. This source inventory does not show which public host
  currently routes to the dashboard deployment or whether either host
  redirects requests.

## Release decision gate

Before queueing a fresh public store candidate, verify without credentials
that the approved installed-build origin actually serves both routes and that
its redirects preserve the custom authentication method. Then verify a real
installed-build login with a least-privilege, owner-provided review account
before App Review. A source-route check or HTTPS syntax check alone is not
deployment evidence. An explicit separate public auth origin is an alternative
only after the owner confirms the correct deployed host and the EAS production
value; do not infer one by prefixing `oss.` or silently use the local web URL.

The read-only EAS `whoami` retry still fails at `api.expo.dev` DNS resolution,
so the current cloud environment/identity cannot be freshly attested. A
separately requested unauthenticated route probe is awaiting owner approval.
