# ADR: Payment and Resolution Boundaries

## Status

Accepted

## Context

Sales accounting currently spreads runtime correctness across legacy payment rows, wallet transactions, checkout records, denormalized order due values, and ad hoc resolution queries. This makes it difficult to identify a single authoritative path for money mutations and difficult to separate runtime correctness from repair tooling.

## Decision

Adopt two new domain boundaries under `packages/sales`:

- `payment-system` owns canonical money logic, projections, and future payment write orchestration.
- `resolution-system` owns inconsistency detection, classification, and audited repair workflows.

`sales-control` remains the existing canonical authority for production and dispatch quantity/status behavior.

## Alternatives

- Keep extending legacy query/action files in-place.
- Merge accounting, resolution, and control concerns into a single large module.
- Rewrite all payment paths in one cutover before introducing package boundaries.

## Consequences

Positive:

- Money logic gets a dedicated package boundary similar to control-v2.
- Resolution becomes diagnostic/admin-oriented instead of a hidden runtime dependency.
- Shared helpers can be adopted incrementally by existing API/web flows.

Negative:

- There is short-term duplication while legacy tables and new canonical structures coexist.
- Additional schema and package surface area must be maintained during migration.

## Implementation Notes

- Initial implementation introduces canonical schema foundations and shared domain helpers.
- Existing `sales-resolution` query is the first consumer moved onto the shared package logic.
- Future phases should route payment mutations through `payment-system` application services and move repair flows into `resolution-system`.
