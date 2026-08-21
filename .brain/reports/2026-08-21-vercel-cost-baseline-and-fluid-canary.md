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
| Workflow replay | Partial | A supplied authenticated preview session completed Sales Orders, pagination, Sales Overview, order/quote editors, Customers, statement detail, and a bounded three-page concurrent replay; statement PDF latency and Google OAuth remain open |
| CPU, memory, cold-start, Prisma, timeout, and cost comparison | Partial | The preview-environment 12-hour view shows 438 invocations, 0% timeout, 347 MB average memory, 41.5% P75 CPU throttle, and 2.5% cold starts; observe for 12-24 hours before a cost comparison or production decision |
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
- Google sign-in returned HTTP 500. Vercel logged Prisma `P2000` while
  creating `WebAuthVerification`: the generated OAuth verification value is too
  long for the current database column. The schema currently uses unbounded
  Prisma `String` fields, which map to the original MySQL `VARCHAR(191)` table
  columns. This remains a Google OAuth defect, but a supplied authenticated
  preview session unblocked the canary replay without a database change.
- Authenticated first-load samples completed without an application error:
  Sales Orders in about 9.2 seconds, Sales Overview in about 8.4 seconds, the
  order editor in about 9.2 seconds, the quote editor in about 6.1 seconds,
  Customers in about 5.4 seconds, customer overview in about 7.2 seconds, and
  the statement workspace/detail in about 8.2/8.1 seconds. Sales Orders
  pagination appended rows successfully in about 6.0 seconds.
- A bounded concurrent replay of Sales Rep, Sales Orders, and one order editor
  stayed authenticated and error-free. Warm navigation settled in 1.9-2.8
  seconds, with rendered content confirmed within the following five seconds.
- One bounded customer-statement PDF request returned its UI control to idle
  after about 39.3 seconds. Vercel recorded one successful preview invocation
  and no timeout, but the latency is too high to treat the route as cleared.
- The preview-environment 12-hour Observability view reported 438 invocations,
  1% errors, 0% timeouts, 347 MB average memory of 1.02 GB, 41.5% P75 CPU
  throttle, and 2.5% cold starts. The view is environment-wide rather than
  deployment-isolated, so it is directional evidence only.
- `/api/auth-session` generated 207 of 438 preview invocations (47%) while
  consuming 0.0085 GB-hours. The tRPC function generated 57 invocations and
  0.014 GB-hours; Sales Rep generated 35 and 0.011 GB-hours; the order editor
  generated 76 and 0.0072 GB-hours. Auth fan-out is the clearest invocation
  reduction target, while tRPC and rendered routes remain the larger compute
  targets.
- Targeted deployment log checks found no timeouts and no 5xx response other
  than the known Google OAuth `WebAuthVerification` failure. The production
  12-hour view separately showed three customer-statement invocations with a
  100% error rate, reinforcing the decision to hold production promotion.
- The preview is protected and is not a valid production Sentry target.
- No production promotion occurred. The next gate is 12-24 hours of comparable
  preview evidence, followed by an explicit production decision. Before that
  decision, reduce or explain auth-session fan-out and diagnose statement PDF
  latency/error behavior.

## Validation

- Thirteen focused tests and seventeen assertions passed across the cost
  snapshot, liveness route, and Vercel deployment boundary.
- Scoped Biome checks passed.
- Broad `@gnd/dashboard` typecheck remains blocked by unrelated existing
  workspace errors; no diagnostic identified the new liveness route.
