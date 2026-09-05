# Production summary query cost

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
