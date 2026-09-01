# Dispatch Workspace Summary Vercel Error Fix Plan

## Status

Implemented and locally validated on 2026-09-01. Production deployment and the
post-deploy monitoring gate remain pending; no database, migration, production
configuration, or production data write was performed.

## Objective

Restore the production Dispatch/Fulfillment workspace by eliminating the
`dispatch.workspaceSummary` 500 response, prevent obsolete browser clients
from continuously posting an invalid Server Action after deployments, and make
future public error references directly searchable without exposing customer,
sales, payment, inventory, employee, or request-input data.

## Assumptions

- "Today" means 2026-09-01 in `Africa/Lagos` (WAT, UTC+01:00); the queried
  Vercel window began at `2026-08-31T23:00:00Z`.
- The screenshot's `ERR-F583F79ACC` came from the production Dispatch page.
- Deployment `dpl_GmE68nty8FKG5UMmyPi3WoU26oYi`, created at 10:12:03 WAT,
  serves `www.gndprodesk.com` and contains current `master` at `75e3fd963`,
  including the fulfillment expansion in `529b8490c`.
- Vercel request logs do not include the exception body for the Dispatch 500s.
  The exact public reference is not indexed there. Both project-local Sentry
  token profiles were tested through the read-only API on 2026-09-01 and
  returned HTTP 403 for `gnd-52/gnd-prodesk-web`; they do not provide the
  required project/event read access. The underlying exception therefore
  remains unconfirmed until a properly scoped token or a privacy-safe stage
  probe identifies it.
- The production database must remain read-only during diagnosis unless a
  separate guarded migration action is explicitly approved.

## Implementation Outcome

- A bounded read-only production probe reproduced a successful summary over
  3,518 dispatches and isolated `withDispatchListControl` as the dominant stage:
  roughly 11.9-12.2 seconds of a 16.4-second request. The five base reads were
  individually much smaller on the first stable timing pass.
- `workspaceSummary` no longer reconstructs every historical dispatch through
  `SalesItemControl`, `QtyControl`, `OrderDelivery`, and `OrderItemDelivery`.
  It projects lifecycle counts from canonical `OrderDelivery.status`, driver,
  mode, and due date. This also preserves explicit `missing items` status rather
  than allowing legacy `control.dispatchStatus = unknown` to mask it.
- The aggregate response shape and manager authorization are unchanged. A
  production read-only parity run returned all 3,518 dispatches, 1,468
  completed, 31 past due, and one correctly classified Packing blocked row.
- The route starts summary and active-section prefetches without serially
  awaiting them. Pending queries remain dehydrated through the existing TanStack
  pending-query contract.
- Summary cards and operational data each have their own Suspense and error
  boundaries. A summary error now leaves tabs, filters, tables, calendar, and
  operational actions available.
- Summary and overdue presentation share one query consumer. Count badges wait
  until client hydration before appearing, preventing streamed data from
  changing the first client markup.
- Focused API and cutover coverage passes 13 tests / 154 assertions. Scoped
  Biome checks and `git diff --check` pass. Authenticated local-browser QA shows
  the summary, overdue alert, tabs/filter toolbar, and table with zero visible
  error fallbacks and zero console errors.
- Repository-wide API and Dashboard typechecks remain red on unrelated baseline
  errors outside the changed files. Examples include inbound receiving,
  special-order enrollment, sales DTO, dispatch `ship` typing, legacy action
  signatures, and Bun test matcher declarations.

## Midday Migration Contract

### Route and state

- Canonical route remains `/sales-book/fulfillment/v2`.
- URL-owned section, sort, search, stage, driver, due bucket, delivery mode,
  risk, schedule, and exception filters remain unchanged.
- The route stays a thin server composition boundary and now follows Midday
  Invoices' nonblocking server-prefetch pattern.

### Data and rendering boundaries

- `dispatch.workspaceSummary` owns aggregate cards and tab counts.
- The selected section owns its independent list, backlog, calendar, driver, or
  exception query.
- Summary and table/calendar data use separate error and Suspense boundaries,
  matching the Midday Invoices composition rule that one secondary read cannot
  blank the primary workspace.
- Existing virtualized/infinite tables, column settings, URL filters, loading
  skeletons, empty states, permissions, and Sales Overview Packing continuation
  remain authoritative.

### Intentional omissions

- The approved multi-order Create Dispatch modal remains unchanged. A Midday
  invoice-style single-record sheet would conflict with the domain's batch
  planning contract and is outside this incident fix.
- Drivers and Exceptions retain their existing workspace-level boundary because
  each is a single primary query surface; no unrelated visual redesign was
  introduced.
- The stale `/sales-book/orders` Server Action retry storm remains a separately
  scoped P1 follow-up. This hotfix does not guess the missing action owner or
  replay deployment-specific mutations.

## Production Evidence

### P0: Dispatch workspace failure

- Final snapshot count: 16 HTTP 500 responses.
- Route: `GET /api/trpc/dispatch.workspaceSummary`.
- Environment/branch: production / `master`.
- Deployment: `dpl_GmE68nty8FKG5UMmyPi3WoU26oYi` only.
- First occurrence: 12:20:04 WAT.
- Last occurrence in the snapshot: 12:37:56 WAT.
- Two initial retry clusters were visible at 12:20:04-12:20:18 and
  12:27:46-12:29:15 WAT; later retries raised the count from 12 to 16.
- No other production 5xx route appeared in the same Lagos-day window.
- Vercel classified the request rows as `info` with empty messages despite the
  500 status. `--level error --level fatal` returned no exception event.
- Searching Vercel for `ERR-F583F79ACC` returned no result.

### P1: obsolete Server Action request storm

- Vercel returned at least 1,000 results, the requested result cap, for:
  `Failed to find Server Action "7844de209b5ad8a689d9e241fce921e871f3f82100"`.
- Every sampled result was `POST /sales-book/orders`, HTTP 404, on the same new
  production deployment.
- The capped sample spans 11:55:52-12:44:52 WAT, so the actual count may be
  higher.
- Next.js identifies this as a request from an older or newer deployment. The
  action did not execute; stale tabs or cached clients are continuously
  retrying a server-reference hash absent from the current build.

## Regression Boundary And Leading Hypotheses

Commit `529b8490c` changed `getDispatchWorkspaceSummary` from four simple reads
and an in-memory lifecycle projection to five concurrent reads followed by a
second database-backed control projection. The new failure candidates are:

1. `salesPackingReport.groupBy({ by: ["orderDeliveryId"] })`.
2. `users.count()` using `whereEmployees({ can: ["viewDelivery"], cannot:
   ["editOrders"] })`.
3. `withDispatchListControl()`, which fans out through sales item controls,
   quantity controls, dispatches, and delivery items before projecting summary
   stages.
4. Production schema compatibility for the guarded-packing and delivery-date
   migrations. Schema drift is plausible because the Brain records a
   production synchronization on 2026-08-24, while later migrations were
   applied locally and documented as still requiring the normal hosted
   workflow. It is not yet proven to be the failing branch.
5. Production-data scale or one legacy record shape triggering the new control
   projection. There is no focused test for `workspaceSummary` today.

## Detailed Execution Plan

### Phase 0: Incident containment and decision gate

- [ ] Confirm whether `dispatch.workspaceSummary` is still returning 500 after
  a hard reload with a current authenticated manager session.
- [ ] Capture one fresh Vercel request timestamp, deployment id, response code,
  and public error reference. Do not record request input or user/customer data.
- [ ] Check whether the list, calendar, create-dispatch dialog, and driver
  operations are independently usable or the summary failure blocks the entire
  workspace.
- [ ] If all Dispatch management is blocked, choose one explicit containment
  path:
  - preferred: a narrowly tested hotfix that restores the previous summary read
    contract while preserving current mutation behavior;
  - fallback: promote the last green deployment before 10:12 WAT only after
    checking forward-written nullable data and migration compatibility.
- [ ] Do not combine containment with schema writes, data repair, or unrelated
  fulfillment changes.

Decision point: continue to Phase 1 before editing if the exact exception is
still unknown; do not guess which Promise branch failed.

### Phase 1: Recover the hidden exception safely

- [ ] Replace or separately configure the current 403-returning Sentry tooling
  token with a local read-only token containing `project:read`, `event:read`,
  and `org:read`; never paste or commit the token.
- [ ] Search the `gnd-52/gnd-prodesk-web` production project for
  `ERR-F583F79ACC`, the 12:20-12:38 WAT window, release `75e3fd963`, and route
  `dispatch.workspaceSummary`.
- [ ] Record only the exception type, symbolicated application frame, release,
  environment, and occurrence count; redact user, email, IP, URL query, and
  request context.
- [ ] If Sentry has no matching event, add temporary privacy-safe stage
  instrumentation around each summary dependency. Emit stage name, duration,
  result count, deployment release, and public reference only.
- [ ] Ensure unexpected tRPC errors produce one `console.error`/structured log
  containing the same public reference and stage so Vercel search can correlate
  the UI with the server failure.
- [ ] Remove or downgrade temporary high-volume diagnostics after confirmation;
  retain the bounded correlation log permanently.

Validation gate: one failing request must resolve to exactly one named summary
stage and one searchable reference before the permanent fix is selected.

### Phase 2: Isolate the failing summary dependency

- [ ] Add a focused test harness for `getDispatchWorkspaceSummary` with each
  database dependency independently injectable or mockable.
- [ ] Run the existing baseline reads first:
  - active `OrderDelivery` projection;
  - Sales backlog count;
  - open `DispatchException` count.
- [ ] Probe each newly introduced dependency separately:
  - pending `SalesPackingReport` groups;
  - delivery-capable non-manager driver count;
  - `withDispatchListControl` enrichment.
- [ ] For the control enrichment, measure and label its internal reads:
  `SalesItemControl`, `QtyControl`, `OrderDelivery`, and `OrderItemDelivery`.
- [ ] Reproduce against Preview's production-like fixture first. If the failure
  requires production-only data, request separate approval for a bounded,
  read-only production probe using counts and schema metadata only.
- [ ] Add cases for zero dispatches, dispatches without item controls, nullable
  legacy control flags, cancelled rows, pickup rows, missing due dates, and a
  representative high row count.

Decision point: select exactly one root-cause branch below based on the observed
exception and stage; avoid shipping several speculative changes together.

### Phase 3: Verify production schema compatibility

- [ ] Run a credential-safe, read-only schema diff/status check against the
  guarded production fingerprint.
- [ ] Verify table/column/index compatibility for:
  - `DispatchException` from `20260818110000_dispatch_exceptions`;
  - `SalesPackingReport` from
    `20260823100000_paid_sales_operational_handoff`;
  - nullable production-submission and `salesItemControlUid` changes from
    `20260828163603_guarded_packing_awaiting_production`;
  - `SalesOrders.deliveryDueDate` from
    `20260830110000_add_sales_delivery_due_date`.
- [ ] If production is behind, generate no handwritten SQL. Use the repository's
  guarded `bun run db:migrate --prod`/`db:push --prod` workflow, verify the
  printed target fingerprint, and obtain explicit confirmation before the
  production write.
- [ ] Re-run read-only schema status after any approved migration and record the
  result in `.brain/database/migrations.md`.

Validation gate: the deployed Prisma Client and production schema must agree
before testing application-level query changes.

### Phase 4: Implement the smallest permanent Dispatch fix

- [ ] If `SalesPackingReport.groupBy` is the failure, replace it with a bounded,
  indexed count/group query compatible with the deployed schema and add the
  exact database regression case.
- [ ] If `whereEmployees` is the failure, replace the ambiguous `cannot` role
  relation filter with a tested permission query that counts each eligible
  driver once and preserves `requireDispatchManager` behavior.
- [ ] If `withDispatchListControl` is the failure, create a summary-specific
  aggregate read instead of enriching every dispatch through full control
  graphs. Keep lifecycle truth in `@gnd/sales` and bound query count/payload.
- [ ] If one non-authoritative metric is unavailable, render the operational
  list and primary actions while showing that metric as unavailable. Do not
  silently coerce authoritative backlog, packing, or lifecycle truth to zero.
- [ ] Split the page's summary from list/calendar error boundaries so an
  optional summary-card error cannot blank the full Dispatch workspace.
- [ ] Preserve current authorization, dispatch lifecycle, packing authority,
  inventory authority, and driver-assignment rules.

### Phase 5: Stop obsolete Server Action retries

- [ ] Match hash `7844de209b5ad8a689d9e241fce921e871f3f82100` using the
  previous build's server-reference manifest or browser Network initiator.
- [ ] Reproduce with a tab opened before deployment and observe the retry
  interval, initiating component, and whether focus/reconnect multiplies it.
- [ ] If the action is a periodic read, migrate it to a stable tRPC query or
  route handler; Server Action identifiers are deployment-specific and should
  not be used as long-lived polling endpoints.
- [ ] Add a one-time deployment-version mismatch response that prompts or
  performs a safe hard reload rather than infinitely retrying the missing hash.
- [ ] Ensure mutation actions are never automatically replayed across a version
  mismatch and remain idempotent where retries are supported.
- [ ] Add a regression test with old and new deployment identifiers proving one
  reload/recovery attempt and no retry loop.

### Phase 6: Validation and release gates

- [ ] Add direct `workspaceSummary` success coverage and per-stage failure
  coverage; assert the public error envelope retains a searchable reference.
- [ ] Run the narrow API/Dispatch tests, scoped lint/format checks, and
  `@gnd/sales` plus relevant Dashboard/API typechecks.
- [ ] Run a production-shaped Preview build using the same Bun, Prisma Client,
  Vercel config, and environment contract as production.
- [ ] Authenticated browser QA must cover Dispatch list, calendar, summary,
  create dialog open/close without submission, retry, desktop, and 390px.
- [ ] Verify permissions for a dispatch manager and one unauthorized role.
- [ ] Deploy Preview first; require zero `dispatch.workspaceSummary` 500s and a
  successful fresh/stale-tab recovery check before production promotion.
- [ ] After production promotion, monitor Vercel and Sentry for at least 30
  minutes:
  - zero new Dispatch summary 5xx;
  - successful summary requests on the new deployment;
  - no continuing obsolete-action loop after the recovery window;
  - searchable, symbolicated unexpected exceptions if a controlled negative
    test is permitted.
- [ ] Record the exact deployment, release, validation evidence, and any
  migration in Brain. Roll back if the Dispatch 5xx reappears or another
  correctness-critical workflow regresses.

## Skills List Used

- `vercel-deploy`: supplied Vercel project/deployment workflow context while
  the live investigation used authenticated read-only CLI log queries.
- `sentry`: defined and attempted the privacy-safe, read-only correlation path
  for the public error reference; both configured profiles returned HTTP 403,
  so execution is pending a properly scoped local token.
- `plan`: structured the incident response into explicit dependencies,
  decision points, validation gates, and implementation checklists.
- Project Brain integration: aligned the plan with GND's dispatch authority,
  migration safeguards, observability contract, and active fulfillment work.

## Risks and Mitigations

- **Wrong root cause due to hidden exception:** require Sentry or named-stage
  evidence before editing.
- **Production schema mutation during diagnosis:** use read-only status/diff
  first and require a separate confirmed guarded command for writes.
- **Masking correctness failures with fallback zeros:** degrade only explicitly
  non-authoritative presentation metrics and keep core lifecycle reads strict.
- **Query-cost regression:** replace full-graph enrichment with bounded
  aggregates and assert query count/duration on representative data.
- **Rollback breaks newer writes:** inspect schema/write compatibility and use a
  narrow hotfix when safer.
- **Stale clients replay mutations:** never auto-retry unknown Server Actions;
  hard reload once and preserve idempotency at mutation boundaries.
- **PII leakage in diagnostics:** log only stage, duration, count, deployment,
  and public reference; keep inputs and identity out of Vercel/Sentry output.

## References

- `.brain/features/fulfillment-admin-responsive-driver.md`
- `.brain/features/sentry-observability.md`
- `.brain/decisions/ADR-054-canonical-dispatch-workspace-and-durable-exceptions.md`
- `.brain/database/migrations.md`
- `apps/api/src/db/queries/dispatch-workspace.ts`
- `packages/sales/src/utils/with-sales-control.ts`
