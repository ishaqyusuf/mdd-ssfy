# Status-only Sales Completion

## Status

In progress. Tickets 03-04 deliver approved Status-only Production and
Fulfillment Completion. Full-workflow provenance backfill, cross-consumer
projection parity, and exhaustive release verification remain in Tickets 05-07.

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

## Delivered: Status-only Production Completion

- `SalesCompletionRecord` now persists Production administrative completion
  provenance, optional effective time, automatic recording time, authenticated
  actor, cancellation provenance, and one active record per order/milestone.
- The shared projection exposes operational Production truth separately from
  completion satisfaction, source, method, dates, history, and server-owned
  action locks. Canonical Fulfilled remains operational evidence only.
- Protected mark/cancel commands use serializable transactions, request
  idempotency, revision checks, database uniqueness, and same-transaction Sales
  History audit events. They write no operational workflow model.
- The Sales confirmation defaults to Full workflow. The Status-only choice is
  single-order and view-permission gated, requires edit permission to submit,
  warns about skipped effects and recent orders, and preserves method-aware
  cancellation history.
- Status-only Fulfillment is deliberately not exposed or writable in Ticket 03.

## Implemented: Status-only Fulfillment Completion

- A single-order Fulfillment confirmation retains Full workflow as the default
  and adds the exact-permission Status-only path. The administrative warning
  explicitly names delivery proof, inventory commitment, dispatch, shipment,
  tax, accounting, notifications, commission, payout, and integrations as
  skipped effects.
- Status-only Fulfillment writes only an audited `FULFILLMENT_COMPLETED`
  completion record. It yields `ADMINISTRATIVELY_COMPLETED`, implies Production
  satisfaction without manufacturing a Production record, and never changes
  proof-bound `canonicalFulfilled`.
- Independent canonical evidence wins Fulfillment disposition presentation
  while administrative history remains visible. Cancellation preserves the
  record and restores explicit Status-only Production, independent operational
  Production, or unresolved state according to the surviving evidence.
- Mark/cancel use the same serializable, revision-aware, request-idempotent
  command boundary as Production. Full-workflow provenance is rejected by the
  Status-only cancellation command.
- Ticket 04 adds no schema or migration; it reuses the Ticket 03 ledger and
  exact view/edit permission rows.
