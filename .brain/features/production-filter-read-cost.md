# Production filter read cost

## General cutover and Fulfillment Calendar serving — 2026-09-06

Lifecycle reads and commands now serve canonical behavior at 100%. Authenticated
Production, Orders, Sales Rep, and Fulfillment V2 checks render successfully.
During general monitoring, Fulfillment Calendar exposed a mismatched hydration
key: server prefetch requested 20 rows while the client requested 500. Matching
the key eliminated the authentication fallback but made the 500-row query hold
the server render beyond Vercel's 15-second budget.

The final design retains the exact 500-row Calendar contract through a shared
typed input builder, loads Calendar and summary inside a browser-only boundary,
and skips the redundant server prefetch for Calendar. READY deployment
dpl_2phCmPHt6pqj68Vc7v9CrzGJDwdo serves www/apex. Two authenticated loads
render analytics and Calendar rows; the repeat reload completed in 2.3 seconds,
and fresh logs contain no Fulfillment timeout or authentication error. The
focused Fulfillment matrix passes 31 tests / 206 assertions. This change adds
no database schema, index, cache, write, or reconciliation behavior.

## Live acceptance — 2026-09-06

Twenty independent authenticated GETs against READY deployment
`dpl_5WZw6SiQtiw3B1wJjapqSfmFoPZ2` all returned HTTP 200, rendered the first
20 Production rows, and preserved Active 3,331 / Unassigned 858 / Past Due 268 /
Unscheduled 73 / Completed 1,293 / Review 97. Zero request timed out. Correlated
p95 timing is proxy auth 478 ms, proxy-to-page 1,290 ms, page auth observation
1,535 ms, filters 3,496 ms, list 5,458 ms, and summary 6,617 ms. The phases
overlap; each server phase independently passes the 10-second target and the
platform's 15-second limit. Ticket 14's bounded 5% cohort check is accepted.

## Request-scoped auth prototype — tested and deferred — 2026-09-06

Production summary/list/filter prefetches may invoke the same operational guard
multiple times on one tRPC request context. The local candidate reuses only that
context's pending `auth` promise, evicts rejection, isolates distinct contexts,
and loads role plus user-specific grants concurrently after user resolution.
It does not introduce a cross-request/session/user cache or trust caller data.

Red/green coverage proved one read group for concurrent/later same-context
checks, independent groups for distinct contexts, concurrent grant reads, and
fail-closed retry. The combined focused matrix passed 12/12 with 64 assertions;
API typecheck and 728/728 broad API tests passed with the process-local
encryption test secret. The prototype was not deployed, and its runtime/test
changes were removed after the smaller filter release met the live gate. It is
retained here only as a future independently measured optimization option.

## Bounded high-cardinality inputs and route guard — 2026-09-06

Production filter metadata no longer derives customer, phone, PO,
representative, order-number, or item options by scanning the Sales-order table.
Those fields are typed inputs with their existing query keys and server-side
matching behavior. Invoice, Production Status, Priority, and Assigned To remain
option controls. Assigned To still uses the bounded first-20 active Production
workers ordered by name; the loader now performs only that narrow database read
and has no Sales option-cache or Redis dependency.

The `filters.salesProductions` route is authenticated and applies the same
operational audience as Production workspace reads: order, Production,
delivery, pickup, or packing view/edit access. This changes no grant and accepts
no caller-selected authorization. Local synchronized-data timing is 1–2 ms,
with zero Sales-order reads or writes. Nine focused tests/55 assertions,
725/725 broad API tests with a process-local encryption test secret, API
typecheck, isolated frozen install/Prisma generation, and the Vercel build pass.

READY deployment `dpl_5WZw6SiQtiw3B1wJjapqSfmFoPZ2` serves
`www.gndprodesk.com` at the unchanged 5% lifecycle cohort. No schema, migration,
database push, data mutation, or cache infrastructure change ran. The 20-request
authenticated result above supplies the sustained bounded acceptance evidence.
The post-deploy unauthenticated endpoint probe returns HTTP 401 with request ID
`1e1ed080-2bd9-4a76-862b-d9a596ea679f`, confirming that public filter metadata
access is closed.

## Bounded optimization — 2026-09-05

`getSalesProductionFilters` reads Assigned To options directly from `users`,
selecting only `id` and `name`. It no longer calls the employee-management
loader, counts employees, loads personnel documents/profiles/permission grants,
or seeds permission definitions while preparing Production filter options.
Independent sales-option and worker-option reads run concurrently.

Compatibility is deliberate: the existing `whereEmployees` Production role
predicate, non-revoked access, `deletedAt: null`, alphabetical name order,
default `queryMeta` skip 0/take 20, empty-label exclusion and string IDs remain.
This does not repair the historical first-20 option limitation. Existing role
relation semantics, inherited customer/phone/PO/representative/order/item
options, filter colors, and query input shapes are unchanged.

There is no new cache, schema/index, status logic, permission grant, background
job, or database repair. The already identified public filter-route permission
gap remains separately gated; this slice does not claim to resolve it.

## Evidence and limits

The real filter/database seam first failed because the old loader attempted
permission creation. The independent-read test separately failed before
concurrency was introduced. Three focused regressions cover read-only narrow
selection and literal output, independent progress, and worker-error propagation.
The API suite passes 724/724 with process-local dummy test secrets; API and
focused test semantic compilers pass. Earlier missing `ENC_SECRET_KEY` test
failures and option-helper/fetch-stub type diagnostics were corrected before
the final runs. No environment file was changed.

Two live traces matched by trace ID place filter settlement at 7705/6504ms
after page entry, with summary last at 8753/7840ms. A separate untraced GET
reproduces the 15-second timeout after a 9551ms post-proxy/pre-page gap.
Thus query-work removal is proven structurally, not yet as a deployed latency
gain or startup fix. Temporary probes remain until final diagnosis/verification.

Canonical progress and exact artifacts:
`.scratch/sales-pipeline-lifecycle-implementation/issues/14-cutover-and-retirement.md`.
Ticket 14 remains 9/13; the 5% production rollout is unchanged.

## Deployment verification

Commit c78a2d40e was released through an isolated Cpmm-baseline overlay as
`dpl_ALhgi99dAM6UgKKetec4qB56KHXu`, Ready on www.gndprodesk.com. The isolated
bundle also passes 724 API tests and API typecheck after offline generation.
All four visible worker labels/order and six workspace counts are preserved.
The matched GET nevertheless records a 15-second runtime timeout with a 7359ms
post-proxy/pre-page gap and no summary settlement. Further rollout is paused;
this optimization is deployed but the startup/loading issue is not resolved.
