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
- Pro, additional team seats, Speed Insights, and Speed Insights Plus base
  subscriptions are classified as fixed costs and excluded from the
  infrastructure-credit calculation. Metered `Speed Insights Plus Events`
  remain infrastructure usage.
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
- Production Sentry monitors `/api/health/live` every five minutes. The
  authenticated 2026-08-30 monitor test returned success after the change,
  removing the former root/login/auth-session fan-out from future checks.

## Sales Orders Runtime Telemetry

- `sales.getOrders` emits one privacy-safe structured performance event with
  count, row-selection, projection-read, and enrichment timings. Events include
  filter names, cursor presence, page size, result size, selected path, and
  fallback reason, but never search text, customer values, or row payloads.
- `sales.getOrdersSummary` emits one projection-independent event with timings
  for each aggregate. It intentionally reports read-model mode `off` because
  the summary does not use `SalesOrderListProjection`.
- `GND_SALES_ORDERS_PERFORMANCE_SAMPLE_RATE` controls event sampling from zero
  through one; the default is one while rollout evidence is being collected.
- `GND_SALES_ORDERS_READ_MODEL_COHORT_PERCENTAGE` selects a stable percentage
  of authenticated users only when the configured mode is `read`. Excluded
  users remain on the legacy path, and projection misses/errors still fall back
  to legacy. An unset percentage fails closed to zero; Preview must explicitly
  use `100` when full projection reads are intended. Mode `off` remains the
  one-setting rollback.
- Production remains `off` until Trigger deployment, migration-ledger
  reconciliation, and environment-specific backfill are complete. It then
  advances to `shadow` for parity evidence before a small `read` cohort. The
  percentage control is not permission to skip those gates.

## Fluid Compute Canary

- Dashboard deployment configuration owns `fluid: true`; rollback is removal
  of that one property followed by redeployment.
- Preview deployment `dpl_4Zfyx9YpMSUhLEudTMZV9sqqErje` verified that Vercel
  accepted Fluid Compute while preserving the existing 1 GB memory override
  and `iad1` region.
- Production promotion requires 12-24 hours of comparative Function Duration,
  memory, cold-start, timeout, Prisma-connection, and cost evidence. CPU size,
  region, and query behavior must not be changed in the same experiment.

## Completed Preview getOrders Hourly Canary (2026-08-25 to 2026-08-26)

- The temporary hourly canary is complete and the existing
  `monitor-gnd-vercel-cost` thread heartbeat has returned to the daily 09:00
  cost-only schedule.
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
- Final evidence is recorded in
  `.brain/reports/2026-08-25-preview-getorders-24h-canary.md`.

## Current Cost Evidence (2026-08-30)

- Corrected infrastructure cost: $6.86; fixed subscription cost: $19.35.
- Daily infrastructure burn: $0.62; projected cycle infrastructure: $19.33.
- Function Duration remains the largest variable service at $3.66. The next
  infrastructure threshold is $8; none of the $8/$12/$16/$18 thresholds has
  been crossed.
- The $0.50/day and $15/cycle targets are still missed, so production shadow
  evidence and request-storm controls remain active priorities.

## References

- Plan: `.brain/plans/2026-08-21-feature-vercel-function-cost-reduction-and-trigger-offload.md`
- Canary report: `.brain/reports/2026-08-21-vercel-cost-baseline-and-fluid-canary.md`
- Decision: `.brain/decisions/ADR-059-dashboard-fluid-compute-canary.md`

## Updated

2026-08-30
