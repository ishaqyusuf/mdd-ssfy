# Production summary query cost

## Explicit active-order membership — 2026-09-06

Production summary counts and list reads previously depended on different
implicit behavior: the shared database extension adds `deletedAt: null` to
`findMany`, but not to `count`, and it cannot rewrite nested Calendar relation
predicates. The package-owned Production workspace predicate now explicitly
requires active Sales orders, and Calendar applies the same rule to its parent
order. Analytics, list, schedule and Calendar therefore share the same root
membership universe without a global database-client behavior change.

The fresh local snapshot moves Active 3,547→3,331, Unassigned 1,023→858, Past
Due 285→268, Unscheduled 74→73, and Completed 1,302→1,293; Review, Today,
Tomorrow and Future are unchanged. These are exclusions of already-deleted
orders, not database mutations. Same-predicate count and ID reads now agree.
The all-ID merge was not adopted because transferring thousands of IDs is a
poor remote-database replacement for concurrent aggregate counts. Regression,
focused Production validation, Sales typecheck and Biome pass. READY deployment
`dpl_HmMgg87s4rPTq3gNyY6JZ43Grhv2` now verifies the expected live correction:
Active 3,338 / Unassigned 865 / Past Due 268 / Unscheduled 73 / Completed 1,286 /
Review 97, with rows rendered. Three samples avoided the prior hard timeout but
still settled summary in 7,566–9,587 ms, so reliability remains open.

## Shared schedule classification — 2026-09-06

The Production summary obtains open schedule evidence once, applies the shared
canonical queue-membership projection once per distinct order, and classifies
those orders into all five date buckets in memory with the existing business-
day boundaries. An order is counted at most once per bucket; orders with open
assignments in different buckets remain present in each applicable bucket.
Tomorrow intentionally remains part of the broader Future count, matching the
existing query definition.

This changes query execution, not lifecycle meaning. Paid/search/customer/rep/
worker filters, exact open quantity and finalized-review rules, canonical 5%
cohort selection, freshness failure behavior, and standalone list/filter
membership are unchanged. No schema, cache, status write, authorization, or
business-data change is introduced.

The read-only local trace reduced one summary from 33 to 20 ORM operations:
assignment reads 5 to 1 and SalesOrders reads 17 to 13. The focused matrix
passes 109 tests/384 assertions and `@gnd/sales` typecheck. Production timing is
now complete: READY deployment `dpl_Gubvi8Ut77RT5ukaDCx25hLirodH` preserves
live counts, but three authenticated summary samples settled in 9,161 ms, 8,287
ms, and 6,406 ms. The last sample is effectively unchanged from the 6,329 ms
baseline, so the reliability gate stays open. Projection freshness remains
mandatory; an unequal experimental combined Active/Unassigned read was rejected
and never entered application code.

## Scope

The package-owned schedule membership read in `sales-production.ts` excludes
assignments whose positive `qtyAssigned` is already met by `qtyCompleted`
before loading submission details. Prisma compares columns in the same row.
This is a necessary-condition prefilter, not a separate status resolver.

Null completed quantities stay eligible. Null, zero, or negative assigned
quantities also stay eligible so the existing resolver remains responsible
for handed-quantity fallback and non-positive requirements. Submission totals,
material-review status, order/worker/date filters, canonical cohort selection,
and freshness checks are unchanged. No extra query, schema change, cache,
status mutation, or job replay is introduced.

## Verification — 2026-09-05

At the approved public summary/database seam, the regression failed before
the prefilter because completed-quantity rows still loaded detail evidence.
Coverage includes positive/null completion, exact and over-completion,
partial completion, legacy null/zero handed quantities, and pending versus
approved material reviews. Existing test doubles expose Prisma field metadata
while still intercepting all database reads.

Read-only Production ABBA comparison preserved all nine summary counts and
exact full open-assignment evidence. Past Due detail candidates decreased
from 9,325 to 4,978 with the same 735 open assignments and 285 order count.
Baseline summary observations were 9,720 and 8,944 ms; prefiltered observations
were 7,547 and 6,948 ms. These are operator-machine samples, not serving p95.

A separate run of the actual implemented query returned the same counts and
4,978 candidates but took 10,454 ms including 1,437 ms connection startup.
Completed membership finished last. The row-volume reduction is verified;
overall live latency and the 15-second first-request failure remain open.

The isolated release passed 260 package/hydration tests, 721 API tests, and
both Sales/API typechecks. Deployment `dpl_7PWgRwe8GVPVcUvKqhgAtKw6r3Yo`
is Ready on both live aliases at the unchanged 5% rollout. Fresh live
navigation eventually renders analytics, tabs, and 20 rows, but matching
logs still record a 15-second GET timeout. The prefilter is deployed; the
timeout is not resolved, and request-phase timing is the next diagnostic.

Canonical execution evidence and release acceptance remain in
`.scratch/sales-pipeline-lifecycle-implementation/issues/14-cutover-and-retirement.md`.
No general-cutover gate is implied by this optimization.

## Temporary request-phase probe

The Production route accepts the opt-in diagnostic query flag
`__productionTiming=1`. It emits `[DEBUG-production-route-v1]` events with
static phase labels, a route-entry timestamp, and elapsed milliseconds only.
It does not log query values, authentication data, results, or exception text.
The existing request-cached auth promise is observed without blocking the
route. Its duration is remaining auth wait, not total authentication time.
Prefetch settlement is not proof of query success, and returning the shell
does not prove the streamed response completed. Query inputs, concurrent
prefetching, hydration keys, authorization, and rollout settings are unchanged.

Both independent review axes are clear and Calendar hydration checks pass
3/3. The probe is diagnostic, not a timeout fix, and must be removed after
root-cause verification. Deployment and measured phase evidence belong in
Scratch; this document alone does not claim the probe is live.

The companion `observeProductionProxyAuth` observes the existing proxy session
resolution only on the exact flagged Production route. Static start/settled/
rejected events distinguish this wait from the remaining pre-page interval.
It preserves the original resolver call, auth result/null/rejection, and all
redirect/permission logic. Both temporary probes require removal after diagnosis.
Focused auth/cache/URL/retry/diagnostic tests pass16/16 with39assertions; the
new helper and its test pass a targeted semantic TypeScript check. This is not
a replacement for the still-unverified broad dashboard compiler run.

Approved companion deploymentCpmmLSAcTNGEamCqrFoZEzoeW26N is Ready on both live
aliases. The measured failure spends981ms in proxy auth and9641ms between proxy
settlement and page entry; a successful reload spends697ms and1445ms respectively.
The first hits the15-second runtime limit and UI errors; the second renders.
Pre-page startup/framework/module attribution is now the next diagnostic focus,
not removal of proxy authorization. Successful summary still settles7919ms after
page entry. Exact evidence and caveats are in Scratch; no timeout fix is claimed.

The source-level startup audit confirms both sidebar hydration and Production
page imports reach the complete runtime API router, including unrelated router
dependencies. This is a candidate initialization path, not a measured root
cause. Sentry initialization is likewise unmeasured. Development output is not
production bundle evidence. Scratch proposes an exact-release compiled trace
and isolated narrow-entry-point comparison before any broader runtime change.

The first isolated route-scoped compile-only attempt did not produce a usable
trace. It was interrupted after more than five minutes with sampled waiting
workers; Sentry had warned of incomplete experimental-mode support. This is an
inconclusive local tooling experiment, not evidence identifying the production
timeout cause. Scratch retains the exact invocation, observations and exit 130.

Read-only Vercel UI inspection now confirms the Production route's own deployed
resource size (70.1 MB), runtime (Node 24.x), region (IAD1) and 15s limit. The
matched failure reports 15.14s execution and 614/1024 MB. A 12-hour route aggregate
shows CPU throttling, but is not request-level attribution. Demo duration/TTFB
charts are excluded. No existing trace is available in the checked window;
bounded trace configuration remains approval-gated. Scratch owns exact evidence.
