# Reconcile GND lifecycle and SalesStat authority

Type: grilling
Status: closed
Blocked by: None
Parent: [`../map.md`](../map.md)

## Question

How should Status-only Production Completion and Fulfillment coexist with GND's existing authorities without claiming facts the system does not possess?

Resolve all three connected boundaries:

1. `CONTEXT.md` defines **Fulfilled** as requiring accepted delivery proof plus committed inventory/dispatch completion and explicitly distinguishes it from manual completion. Decide whether the new declaration may produce canonical Fulfilled state, produces a separately named administrative closure state, or requires another clearly bounded interpretation.
2. `SalesStat` is a progress aggregate with a unique `(salesId, type)` row and values recomputed from `QtyControl` records. Decide whether the declaration belongs in `SalesStat` with explicit override provenance and resolver precedence, uses dedicated non-aggregate status types, or belongs in a separate durable declaration model. A naked `percentage = 100` write is not stable because current recomputation can overwrite it.
3. GND's standard permission model derives separate `viewStatusOnlySalesCompletion` and `editStatusOnlySalesCompletion` capabilities from a `StatusOnlySalesCompletion` resource, whereas the approved wording names `status_only_sales_completion` as the permission. Decide the exact persisted permission rows and compatibility mapping while retaining those exact runtime capability names.

The answer must preserve every unaffected Q1–Q15 product decision and update `spec.md`, the map, GND `CONTEXT.md` if domain language changes, and the relevant Brain planning/permission/database documentation. It must not implement the feature.

## Decision

Approved 2026-09-01:

1. Status-only Fulfillment produces **Status-only Fulfillment Completion**, a
   separately named Administrative Completion. It satisfies the order-level
   completion resolver, pending-completion queues, and the approved action-lock
   matrix, but it does not produce canonical **Fulfilled**. Canonical Fulfilled
   remains evidence-bound to accepted delivery proof plus committed
   inventory/dispatch completion. Operational inventory and dispatch
   projections continue to report their actual state.
2. Persist completion provenance in a dedicated, non-aggregate
   `SalesCompletionRecord`. Its milestone is `PRODUCTION_COMPLETED` or
   `FULFILLMENT_COMPLETED`, its method is `STATUS_ONLY` or `FULL_WORKFLOW`, and
   its lifecycle is `ACTIVE` or `CANCELLED`. `SalesStat` remains a recomputed
   `(salesId, type)` progress aggregate owned by `QtyControl`; neither its
   percentage nor its status is an override authority.
3. `status_only_sales_completion` is the canonical resource identifier. The
   role system represents it as the `StatusOnlySalesCompletion` resource and
   persists two ordinary permission rows: `view status only sales completion`
   and `edit status only sales completion`. Existing normalization therefore
   yields the exact runtime capabilities `viewStatusOnlySalesCompletion` and
   `editStatusOnlySalesCompletion` without a one-row compatibility exception.

## Consequences

- The backend projection exposes canonical operational truth separately from
  administrative completion satisfaction and provenance.
- Status-only Fulfillment must be labelled `Fulfillment completed — status
  only` or equivalent; an unqualified `Fulfilled` label is forbidden.
- Order-level pending-completion views may close, while operational exception,
  dispatch, inventory, tax, accounting, and workflow-volume views continue to
  use their existing evidence authorities.
- A Status-only cancellation cancels only its `SalesCompletionRecord` and audit
  evidence. It never runs operational reversal logic.
- Existing `SalesStat`, `SalesOrders.status`, or `SalesOrders.prodStatus` values
  are not migrated into Status-only records by inference.

## Rejected alternatives

- Treating an administrative declaration as alternate proof of canonical
  Fulfilled, because downstream GND domains are entitled to rely on Fulfilled's
  evidence invariant.
- Writing `SalesStat.percentage = 100`, because recomputation would overwrite it
  and the row cannot preserve independent provenance or cancellation history.
- Persisting only `status_only_sales_completion`, because the current role
  generator would not derive the required view/edit runtime capabilities from
  that single row.
