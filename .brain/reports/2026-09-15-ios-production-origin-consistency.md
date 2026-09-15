# Public iOS production origin consistency audit

Date: 2026-09-15
Scope: selected local production-profile configuration, route source, and a
September 15 unauthenticated public-route observation. No credentials,
cookies, Apple/EAS setting, or write request were used.

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
- The dashboard's `vercel.json` declares no rewrite or redirect for the
  production Base host; `next.config.mjs` also has no release route mapping.
  The standalone API app's `vercel.json` rewrites its own requests to `/api`
  and redirects `/` to `/api/trpc`, but this does not create a dashboard
  Better Auth handler or establish which custom domain fronts either app.
- `apps/dashboard/src/envs.ts` returns `https://www.gndprodesk.com` for
  non-development calls to its general `getBaseUrl()` helper. This is a third
  source-level hostname beside the selected local mobile Base and web-auth
  origins. The helper does not set Better Auth's `baseURL`; `www.ts` still uses
  `NEXT_PUBLIC_APP_URL` when present. No deployed host or redirect can be
  inferred from this helper alone.

## Release decision gate

Before queueing a fresh public store candidate, verify without credentials
that the approved installed-build origin actually serves both routes and that
its redirects preserve the custom authentication method. Then verify a real
installed-build login with a least-privilege, owner-provided review account
before App Review. A source-route check or HTTPS syntax check alone is not
deployment evidence. An explicit separate public auth origin is an alternative
only after the owner confirms the correct deployed host and the EAS production
value; do not infer one by prefixing `oss.` or silently use the local web URL.

## September 15 unauthenticated reachability observation

Credential-free GET requests returned these HTTP status/effective-host pairs:

| Requested URL | Status | Effective host | Interpretation |
| --- | ---: | --- | --- |
| `gndprodesk.com/api/auth/get-session` | 200 JSON | `www.gndprodesk.com` | Apex redirects to `www`; generic auth route exists there. This does not test mobile sign-in or cookie/session semantics. |
| `www.gndprodesk.com/api/auth/get-session` | 200 JSON | `www.gndprodesk.com` | Generic auth route exists on `www`. |
| `oss.gndprodesk.com/api/auth/get-session` | 404 text | `oss.gndprodesk.com` | The selected dashboard-web hostname did not expose that route in this observation. |
| `gndprodesk.com/api/trpc` | 404 HTML | `www.gndprodesk.com` | Bare tRPC URL is not a valid-procedure health test. |
| `gndprodesk.com/api/trpc/mobileAccess.myRequests` | 404 JSON `NOT_FOUND` | `www.gndprodesk.com` | The deployed route did not recognize the new employee-access procedure, despite source registration in `_app.ts`. This is evidence of a deployed-version/routing mismatch, not a healthy workflow. |

The route responses are a one-time public observation, not an authenticated
installed-build acceptance test or a guarantee of future deploy state. The
current source still sends mobile auth and tRPC to the apex Base origin, which
redirects to `www`; no release-candidate build should rely on that redirect
without confirming the custom mobile endpoints, request method/body and
session behavior on an installed production build. Deploy the reviewed
dashboard/API workflow through the normal separately approved production
process, then revalidate the exact approved host before queueing a fresh IPA.
Do not silently rewrite EAS production Base to `www` or `oss` from this probe.

The read-only EAS `whoami` retry previously failed at `api.expo.dev` DNS
resolution; this route observation does not freshly attest the EAS cloud
environment or identity.
