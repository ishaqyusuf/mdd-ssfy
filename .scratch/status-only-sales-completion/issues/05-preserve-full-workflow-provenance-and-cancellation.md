# Preserve Full workflow provenance and method-aware cancellation

Type: implementation
Status: ready-for-agent
Label: ready-for-agent
Blocked by: [`04-ship-status-only-fulfillment-completion.md`](04-ship-status-only-fulfillment-completion.md)
Parent: [`../map.md`](../map.md)
Source specification: [`../spec.md`](../spec.md)

## Outcome

New Production and Fulfillment Full workflow completions retain their existing
operational behavior while recording `FULL_WORKFLOW` provenance only after
canonical operational evidence commits. Cancellation always selects the correct
method-aware path.

## Deliverables

1. Integrate `SalesCompletionRecord(completionMethod = FULL_WORKFLOW)` with the
   existing production and fulfillment completion orchestrations after their
   operational commit boundary.
2. Preserve existing side effects, permissions, idempotency, error behavior,
   dispatch proof, inventory commitment, and production lifecycle authority.
3. Route `FULL_WORKFLOW` cancellation through existing workflow-aware reversal
   and validation; never allow Status-only cancellation to bypass it.
4. Normalize historical operational evidence as Full workflow provenance without
   fabricating broad historical completion rows.
5. Add migration/compatibility verification proving no inference from
   `SalesStat`, order status strings, `prodStatus`, `deliveredAt`, or one
   completed dispatch alone.

## Acceptance criteria

- Specification scenarios 4, 12, 16, and 17 pass.
- A Full workflow completion record never precedes or substitutes for canonical
  operational evidence.
- Status-only cancellation cannot reverse or cancel Full workflow effects.
- Existing operational orders retain their lifecycle meaning after migration.
- No broad historical `SalesCompletionRecord` backfill occurs.

## Required checks

- Existing production/fulfillment workflow regression suites.
- Method-aware mark/cancel and failure-boundary tests.
- Migration contract and legacy normalization tests.
- Relevant Sales, Jobs, API, Dashboard, and database typechecks/tests.
- `git diff --check` for the review unit.

## Boundaries

- Do not redesign the existing Full workflow.
- Do not infer Status-only history from missing operational records.
- Do not relax existing workflow permissions or reversal requirements.

