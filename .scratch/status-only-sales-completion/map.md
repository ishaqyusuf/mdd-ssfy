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

## Approved implementation tickets

1. [Ship Status-only Production Completion end to end](issues/03-ship-status-only-production-completion-end-to-end.md)
2. [Ship Status-only Fulfillment Completion and implied Production Completion](issues/04-ship-status-only-fulfillment-completion.md)
3. [Preserve Full workflow provenance and method-aware cancellation](issues/05-preserve-full-workflow-provenance-and-cancellation.md)
4. [Unify completion projections, queues, filters, counters, and reporting](issues/06-unify-completion-projections-queues-and-reporting.md)
5. [Complete exhaustive acceptance and release verification](issues/07-complete-exhaustive-acceptance-and-release-verification.md)

The tickets form an ordered stack. Each ticket is an independent review unit and
must be approved before its successor starts.

## Out of scope

- Bulk completion of multiple orders; the first release handles one order at a time.
- A generic forced-close mechanism for orders whose real-world completion is unknown.
- Reclassifying exceptional historical status records by inference; any known exceptions require a separately reviewed migration.
- Implementing the approved specification; this map ends at an implementation-ready handoff.
