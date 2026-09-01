# Status-only sales completion

## Status

In Progress. The approved five-ticket ordered stack is published and Ticket 03
has entered its isolated Brain handoff. Product intent, Q1–Q15 acceptance
decisions, and the closed GND compatibility boundary remain the implementation
authority.

## Canonical artifacts

- Wayfinder map: `.scratch/status-only-sales-completion/map.md`
- Candidate specification: `.scratch/status-only-sales-completion/spec.md`
- Product contract decision: `.scratch/status-only-sales-completion/issues/01-define-status-only-sales-completion-contract.md`
- Closed GND compatibility decision: `.scratch/status-only-sales-completion/issues/02-reconcile-gnd-lifecycle-and-sales-stat-authority.md`
- Architecture decision: `.brain/decisions/ADR-081-administrative-sales-completion-authority.md`

## Approved GND compatibility contract

- Canonical **Fulfilled** remains proof-bound. Status-only Fulfillment is a
  separately labelled Administrative Completion and cannot make
  `canonicalFulfilled` true by itself.
- A planned dedicated `SalesCompletionRecord` owns milestone, method, active or
  cancelled state, dates, and actor provenance. `SalesStat` remains a unique
  `(salesId, type)` aggregate recomputed from `QtyControl` and is never an
  override store.
- The canonical resource identifier is `status_only_sales_completion`; its
  `StatusOnlySalesCompletion` permission resource persists the rows `view status
  only sales completion` and `edit status only sales completion`, which resolve
  to `viewStatusOnlySalesCompletion` and `editStatusOnlySalesCompletion`.
- The shared backend resolver must keep operational truth separate from
  completion satisfaction. Status-only Fulfillment may close order-level
  pending-completion views and action locks while operational inventory,
  dispatch, tax, accounting, and volume projections remain evidence-driven.

## Next step

Implement, review, land, and approve Ticket 03. Create each successor stack-item
handoff only after its predecessor is approved so its worktree starts from the
landed state. The active Codex Goal remains open until all five review units are
approved, documented, and reconciled.
