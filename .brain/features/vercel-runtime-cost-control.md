# Vercel Runtime Cost Control

## Purpose

Keep Dashboard infrastructure consumption below $15 per billing cycle, leaving
at least 25% of the $20 included credit available for variance, while reducing
avoidable Function Duration and invocation amplification.

## Current Boundary

- `bun run vercel:cost-snapshot -- --scope gndprodesk --from <cycle-start> --cycle-end <cycle-end>` records current infrastructure cost, daily burn,
  projected cycle cost, per-project attribution, and per-service attribution.
- The command pins Vercel CLI `54.4.1`, whose `usage --from/--to` JSON schema is
  covered by the snapshot tests, instead of resolving an unversioned CLI. It
  rejects malformed, reversed, and post-cycle date windows.
- Pro, additional team seats, and Speed Insights subscriptions are classified
  as fixed costs and excluded from the infrastructure-credit calculation.
- Guardrails are $8 warning, $12 high, $16 critical, and $18 emergency. The
  operating targets are at most $15 per cycle and $0.50/day steady state;
  daily burn above $0.75 is critical.
- A daily 09:00 Codex monitor runs the same current-cycle analysis. Vercel's
  native 75%-of-credit web and email notification remains enabled.

## Liveness And Readiness

- Dashboard `GET /api/health/live` is the high-frequency liveness target. It
  returns an empty `204` with `Cache-Control: no-store` and performs no auth,
  database, redirect, or downstream work.
- Standalone API `GET /health` is the database-backed readiness target and
  should be checked at a lower frequency, approximately every five minutes.
- Production Sentry must move from `/` to `/api/health/live` at a one-to-five-
  minute interval after the route is deployed to production. This removes the
  root/login/auth-session fan-out from every uptime check.

## Fluid Compute Canary

- Dashboard deployment configuration owns `fluid: true`; rollback is removal
  of that one property followed by redeployment.
- Preview deployment `dpl_4Zfyx9YpMSUhLEudTMZV9sqqErje` verified that Vercel
  accepted Fluid Compute while preserving the existing 1 GB memory override
  and `iad1` region.
- Production promotion requires 12-24 hours of comparative Function Duration,
  memory, cold-start, timeout, Prisma-connection, and cost evidence. CPU size,
  region, and query behavior must not be changed in the same experiment.

## Temporary Preview getOrders Hourly Canary (2026-08-25)

- The existing `monitor-gnd-vercel-cost` thread heartbeat is temporarily running
  hourly because Codex permits only one heartbeat automation per thread.
- The first three hourly runs used the in-app browser and could not obtain an
  authenticated Preview session. Starting 2026-08-25 at 10:53 Africa/Lagos,
  the canary uses the authenticated Chrome connector instead.
- Each remaining hourly run performs read-only Preview Sales Orders checks for
  broad search `APA` and exact order `09379PC`, records timings and browser
  evidence under `.gstack/canary-reports/`, and alerts only on a confirmed retry
  failure, authentication loss, or untrustworthy evidence.
- The Chrome switch check reached Preview successfully. The first `APA` request
  showed a transient application error, its required retry completed with a
  valid no-results state, and exact order `09379PC` returned one row in about
  3.54 seconds. Chrome navigation control timed out while the page still loaded,
  so this is a functional/search baseline, not a trustworthy list-load baseline.
- The normal Vercel cost snapshot still runs only at 09:00 Africa/Lagos during
  this window. Hourly browser checks do not run the usage command.
- The canary ends at 07:00 Africa/Lagos on 2026-08-26. It must write
  `.brain/reports/2026-08-25-preview-getorders-24h-canary.md`, report the result,
  and restore `monitor-gnd-vercel-cost` to its original daily 09:00 schedule and
  cost-only prompt. The temporary hourly rule includes one extra recovery
  occurrence so restoration can retry if the final run fails.

## References

- Plan: `.brain/plans/2026-08-21-feature-vercel-function-cost-reduction-and-trigger-offload.md`
- Canary report: `.brain/reports/2026-08-21-vercel-cost-baseline-and-fluid-canary.md`
- Decision: `.brain/decisions/ADR-059-dashboard-fluid-compute-canary.md`

## Updated

2026-08-21
