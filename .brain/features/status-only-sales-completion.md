# Status-only Sales Completion

## Status

Decision-complete specification; implementation not started.

## Outcome

An authorized user may choose **Update status only** for one Sales Order's
Production Completion or Fulfillment Completion when the real-world milestone
happened but the intermediate GND workflow history is absent. Full workflow
remains selected by default and retains all current side effects.

## GND Authority Boundary

- Status-only Production Completion and Fulfillment Completion are
  Administrative Completions stored in a planned `SalesCompletionRecord`.
- Status-only Fulfillment satisfies order-level completion but does not produce
  canonical Fulfilled. Canonical Fulfilled still requires accepted delivery
  proof plus committed inventory/dispatch completion.
- `SalesStat` remains recomputed `QtyControl` progress and receives no override.
- Operational inventory, dispatch, packing, proof, tax, accounting, and volume
  projections remain unchanged by a Status-only action.

## Permission Contract

- Resource identifier: `status_only_sales_completion`
- Resource name: `StatusOnlySalesCompletion`
- Persisted rows: `view status only sales completion` and `edit status only
  sales completion`
- Runtime capabilities: `viewStatusOnlySalesCompletion` and
  `editStatusOnlySalesCompletion`

View controls presentation and provenance visibility. Edit controls mark and
cancel mutations and are rechecked by the backend. Existing Full workflow
permissions remain unchanged.

## Canonical Artifacts

- `.scratch/status-only-sales-completion/map.md`
- `.scratch/status-only-sales-completion/spec.md`
- `.scratch/status-only-sales-completion/issues/02-reconcile-gnd-lifecycle-and-sales-stat-authority.md`
- `.brain/plans/2026-09-01-feature-status-only-sales-completion.md`
- `.brain/decisions/ADR-081-administrative-sales-completion-authority.md`

## Scope Boundary

This feature does not bulk-complete orders, infer uncertain historical work,
fabricate operational evidence, or redesign the existing Full workflow.
