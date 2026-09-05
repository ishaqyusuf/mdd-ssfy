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

Canonical execution evidence and release acceptance remain in
`.scratch/sales-pipeline-lifecycle-implementation/issues/14-cutover-and-retirement.md`.
No general-cutover gate is implied by this optimization.
