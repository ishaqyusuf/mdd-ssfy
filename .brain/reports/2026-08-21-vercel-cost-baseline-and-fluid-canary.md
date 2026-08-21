# Vercel Cost Baseline And Fluid Canary

Date: 2026-08-21

## Billing Baseline

- Team/scope: `GND SERVER` / `gndprodesk`
- Cycle: 2026-08-19 through 2026-09-19
- Infrastructure: $3.95 of $20 included credit
- Deterministic two-day daily burn: $1.98
- Simple current-rate projection: $61.23, treated as anomaly-sensitive because
  the cycle is only beginning
- Project attribution: `gndprodesk` $3.89, unattributed $0.06,
  `prodesk-api` $0.00 after display rounding
- Service attribution: Function Duration $2.97, Speed Insights data points
  $0.65, Build CPU $0.14, Function Invocations $0.07, Blob $0.06, Web
  Analytics $0.03, and Fast Origin Transfer $0.03
- Fixed subscriptions excluded from infrastructure credit: Pro $20,
  additional team seat $20, and Speed Insights $10

Command:

```sh
bun run vercel:cost-snapshot -- --scope gndprodesk --from 2026-08-19 --cycle-end 2026-09-19 --to 2026-08-21
```

The result was `critical` because daily burn exceeded $0.75. The next absolute
credit threshold is $8. The command pins Vercel CLI `54.4.1` and uses the
requested `--to` date for repeatable historical burn/projection math.

## Evidence Gates

| Gate | Status | Evidence / next action |
| --- | --- | --- |
| Cost, project, and service baseline | Complete | Deterministic command output above |
| 12-hour route baseline | Complete | Plan records tRPC, auth-session, Sales Orders, login, edit, Sales Rep, and statement route totals |
| Timeout and memory samples | Partial | Two `sales.getOrders` samples are recorded; systematic route coverage remains open |
| Comparable 24-hour and seven-day windows | Pending | Accumulate before interpreting the early-cycle projection as steady state |
| Fluid deployment shape and pricing | Partial | `fluid: true`, 1024 MB, Node.js 22, and `iad1` are verified; effective Fluid pricing/shape confirmation remains pending |
| Liveness invocation isolation | Complete | A protected-preview `GET /api/health/live` returned `204` and produced exactly one function log entry |
| Workflow replay | Blocked | Anonymous root/login replay completed, but Google sign-in fails before session creation because `WebAuthVerification` rejects an oversized OAuth verification value |
| CPU, memory, cold-start, Prisma, timeout, and cost comparison | Pending | Observe the preview for 12-24 hours against equivalent baseline windows |
| Production and Sentry cutover | Pending | Requires explicit deployment decision and authenticated Sentry access |

## Controls

- Vercel's native notification at 75% of included credit is enabled for web
  and email.
- A daily 09:00 Codex monitor checks current infrastructure, burn, projection,
  project/service attribution, the $15 cycle budget, and $8/$12/$16/$18
  thresholds.

## Preview Canary

- Deployment: `dpl_4Zfyx9YpMSUhLEudTMZV9sqqErje`
- Preview URL: `https://gndprodesk-eyb4sod1f-gndprodesk.vercel.app`
- Vercel inspection reported `fluid: true`, Node.js 22, region `iad1`, and the
  existing 1024 MB memory / 300-second dashboard function configuration.
- `GET /api/health/live` returned `204`, `Cache-Control: no-store`, and
  `x-matched-path: /api/health/live`.
- A follow-up protected-preview liveness request produced one and only one
  `GET /api/health/live` function log entry. It did not call `/`, `/login/v2`,
  or `/api/auth-session`.
- Anonymous root/login replay reproduced the existing auth fan-out: the preview
  emitted repeated `/api/auth-session` and `/login/v2` requests before reaching
  the login form.
- Google sign-in then returned HTTP 500. Vercel logged Prisma `P2000` while
  creating `WebAuthVerification`: the generated OAuth verification value is too
  long for the current database column. The schema currently uses unbounded
  Prisma `String` fields, which map to the original MySQL `VARCHAR(191)` table
  columns. Authenticated Sales Orders and Sales Overview replay cannot proceed
  until that persistence boundary is deliberately migrated or another valid
  preview session is supplied.
- The preview is protected and is not a valid production Sentry target.
- No production promotion occurred. The next gate is a 12-24-hour comparison
  followed by an explicit production decision.

## Validation

- Thirteen focused tests and seventeen assertions passed across the cost
  snapshot, liveness route, and Vercel deployment boundary.
- Scoped Biome checks passed.
- Broad `@gnd/dashboard` typecheck remains blocked by unrelated existing
  workspace errors; no diagnostic identified the new liveness route.
