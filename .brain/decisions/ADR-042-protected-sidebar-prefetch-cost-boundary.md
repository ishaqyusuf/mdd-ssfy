# ADR-042: Protected Sidebar Prefetch Cost Boundary

## Status

Accepted

## Date

2026-08-03

## Context

The Vercel billing-cycle view for July 19 through August 19 showed $15.10 of
infrastructure consumption by August 3. Vercel Functions accounted for the
dominant share: 64.92 GB-hours / $11.69 and approximately 972,000 invocations /
$0.58. The dashboard project produced 99.9% of those invocations.

Secondary consumption was much smaller: 10,567 Speed Insights data points, all
from the dashboard, cost $1.30; 37 hours of build CPU cost $1.05. Build time was
split across dashboard (26h 36m), storefront (5h 8m), API (4h 20m), and
dealership (1h 4m). The account also carries a separate $10 Speed Insights
subscription license, which is not infrastructure consumption and is not
cancelled by changing application code.

The last-24-hour Functions view showed approximately 26,000 calls to
`/api/auth-session`, 5,300 calls to `/api/trpc/[...trpc]`, and nearly uniform
hundreds of calls across many protected pages that are not visited at the same
rate in normal work. Examples included Resolution Center, Productions, Orders,
Quotes, Customers, Finance, Reports, and Community workspaces.

The shared sidebar rendered every permitted primary and child route through a
Next.js link with forced `prefetch`. A viewport prefetch therefore executed the
protected page route and its server-side data work before user intent. Every
such protected request also ran the dashboard proxy, whose current auth
boundary calls `/api/auth-session`, amplifying one speculative page request
into another function invocation. This explained both the uniform low-value
page traffic and the auth-session volume.

Midday's sidebar currently opts into link prefetch, but GND has a materially
larger permission-aware protected route tree and a per-request auth proxy. The
observed production cost is sufficient reason for a documented local
exception.

## Decision

Shared `@gnd/site-nav` primary and child sidebar links set
`prefetch={false}`. Routes load through normal client-side Next.js navigation
when the user selects them; rendering, expanding, or scrolling the sidebar no
longer authorizes speculative execution of protected routes.

This is intentionally scoped to the high-cardinality shared sidebar. Focused
links elsewhere may retain default or intent-driven prefetch when their value
is measured and their server cost is bounded.

## Consequences

- Protected routes and their data dependencies no longer run only because a
  sidebar link entered the viewport.
- The `/api/auth-session` amplification caused by speculative page requests is
  removed with those requests.
- First navigation to a sidebar destination may begin slightly later because
  it starts on click instead of on viewport visibility.
- Exact savings depend on real user traffic. Compare Vercel's route-level
  invocation and GB-hour totals after one full production day and again after
  the billing cycle; do not treat the pre-deploy estimate as measured savings.
- The separate paid Speed Insights license/data-point usage and build CPU time
  are billing decisions outside this code change.

## Validation

- `bun test scripts/site-nav-prefetch-boundary.test.ts`
- `bun --filter @gnd/site-nav typecheck`
- `bunx biome check packages/site-nav/src/components/nav-item.tsx packages/site-nav/src/components/nav-child-item.tsx scripts/site-nav-prefetch-boundary.test.ts`
- Authenticated local browser navigation from `/sales-book/orders` to
  `/sales-book/quotes`, with the destination rendered and no console errors

## Rollback

Restore prefetch only for a small, measured shortlist of lightweight routes or
implement explicit intent-driven prefetch. Do not restore blanket prefetch to
the full protected sidebar without production evidence that its latency value
outweighs the invocation and duration cost.
