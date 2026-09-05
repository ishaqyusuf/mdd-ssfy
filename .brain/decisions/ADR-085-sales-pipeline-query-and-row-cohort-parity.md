# ADR-085: Sales Pipeline Query and Row Cohort Parity

## Status

Accepted — reviewed implementation; deployment and live validation remain open
under Ticket 14.

## Context

Completed membership applied canonical projection filtering globally while
row presentation used a 5% order cohort. It also omitted completed orders
without a list projection. Independent read-only evidence found 20 such
orders in the current cohort. Faster queries alone cannot establish parity.

## Decision

Query and row authority must share the existing stable order-ID cohort.
For partial rollout, read selected IDs using a parameterized MySQL equivalent
of the shared signed Int32 hash, in 250-ID keyset pages. Explicit all/none
rollouts require no cohort enumeration. Keep workspace/permission predicates
on both the canonical branch and the complementary legacy branch.

Retain revision checks for projected canonical candidates. Missing or unusable
projection candidates need an explicit bounded fresh-evidence fallback, not
silent omission or invented completion. The fallback is read-only and uses
the package resolver; it does not repair records or override conflicts.

## Alternatives

- Global canonical counts during a partial rollout: contradict row authority.
- New cohort database columns: unnecessary for the existing deterministic ID rule.
- Load every order and filter the cohort in application memory: unnecessary
  payload and query cost; SQL can select the cohort before evidence loading.
- Treat missing projections as non-completed: observed false negatives.

## Consequences

Counts can change when the corrected authority includes previously omitted
orders; independent evidence must explain that change. ID-only pages bound
each read, not total cohort size. The hash is not an indexed lifecycle field.
Full rollout still requires separate query-cost and exact-membership validation.
No schema, operational fact, or rollout percentage is changed by this decision.

## Implementation Notes

`sales-pipeline-rollout.ts` retains the shared multiplier and percentage policy.
`sales-pipeline-rollout-query.ts` owns the parameterized database adapter.
Actual MySQL parity passed for 506 literal IDs including signed Int32 limits;
the current partial cohort contains 400 active orders. The read-only fallback
restores 20 independently proven missing completions, matching the audited
1295 total. Final Spec and Standards reviews are clear, including 251-candidate
keyset/missing-source coverage. Ready/current projections that incorrectly
claim non-completion remain outside this fallback. Neither this decision nor
the operator timing sample establishes full membership or live acceptance.
