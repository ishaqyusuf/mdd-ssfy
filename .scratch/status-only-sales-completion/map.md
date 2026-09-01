# Status-only sales completion

Label: wayfinder:map

## Destination

A decision-complete engineering specification for Status-only Production Completion and Fulfillment, ready to hand off for implementation across persistence, backend behavior, query formatting, Angular UX, permissions, locking, cancellation, migration, reporting, and testing.

## Notes

- Target project: GND at `/Users/M1PRO/Documents/code/_turbo/gnd`.
- Domain: sales-order lifecycle completion.
- Canonical GND language lives in `../../CONTEXT.md`.
- Every implementation session must preserve the difference between Status-only completion and Full workflow completion.
- GND compatibility is resolved: Status-only Fulfillment is an Administrative Completion rather than canonical `Fulfilled`; `SalesCompletionRecord` owns durable provenance; and `SalesStat` remains recomputed operational progress.
- Planning only; implementation is outside this map.

## Decisions so far

- [Define the status-only sales completion contract](issues/01-define-status-only-sales-completion-contract.md) — Status-only completion is an authorized, audited declaration of a real milestone that updates effective order state without replaying missing operational workflow effects; the complete behavior is fixed in the acceptance-criteria specification.
- [Reconcile GND lifecycle and SalesStat authority](issues/02-reconcile-gnd-lifecycle-and-sales-stat-authority.md) — Status-only Fulfillment is a separately labelled Administrative Completion, never canonical Fulfilled by itself; a dedicated `SalesCompletionRecord` is authoritative for completion provenance; and the resource identifier maps to two ordinary persisted view/edit permission rows.

## Not yet specified

- None. The candidate specification is decision-complete and ready for a separate implementation handoff.

## Out of scope

- Bulk completion of multiple orders; the first release handles one order at a time.
- A generic forced-close mechanism for orders whose real-world completion is unknown.
- Reclassifying exceptional historical status records by inference; any known exceptions require a separately reviewed migration.
- Implementing the approved specification; this map ends at an implementation-ready handoff.
