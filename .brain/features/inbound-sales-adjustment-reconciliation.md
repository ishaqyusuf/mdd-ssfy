# Inbound and Sales Adjustment Reconciliation

## Current behavior (2026-08-06)

- An open inbound shipment can reduce or remove one linked sales demand from
  its overview. The command is scoped to the selected demand so another sale
  sharing the same inbound item is not changed.
- The operator must have `editInboundOrder`, enter a reason, and explicitly
  confirm the change. Quantity cannot increase and cannot fall below quantity
  already received. Removing an unreceived row detaches it from the shipment
  and leaves the sales demand open for reassignment.
- The shipment item planned quantity is reduced by the same delta, bounded by
  good and issue quantities already received. Completed, closed, and cancelled
  shipments remain immutable through this direct editor.
- Every direct inbound adjustment writes an actor-attributed inbound activity,
  an actor-attributed Sales activity, and the demand/item change in one
  transaction, then synchronously repairs the affected sale inventory
  projection. A repeated reduction is a no-op that can retry projection without
  duplicating either activity; a removed demand remains discoverable by its
  release marker for the same recovery path.
- Cancelling an inbound shipment releases reversible demand and synchronously
  rebuilds every affected sales projection before returning. The Sales list no
  longer relies on a later repair job to leave the cancelled projection state.
  Released-demand markers preserve the affected sale IDs so a failed projection
  can be retried after demand links have been detached.
- Existing-sale quantity reductions use the Sales Change Review. When the
  changed lines have allocation, inbound, production, completion, or delivery
  evidence, the review explains the impact and requires explicit acknowledgement
  rather than blocking the edit.
- If open inbound exists, the sales representative must choose one disposition:
  cancel the reduced open supplier quantity, or retain that supplier quantity
  for general warehouse stock. The adjustment job changes the sale and
  reconciles the approved inbound snapshot in one transaction, rebuilds the
  sales projection, and only then marks the adjustment applied.
- Reconciliation rejects demand, shipment-link, shipment-status, planned-
  quantity, or received-quantity drift after approval and rolls back the sale,
  wallet, refund, and inbound transaction together. A later projection or
  activity failure returns the adjustment to a retryable state; the order marker
  and durable adjustment-record reconciliation checkpoint let the job resume
  projection/activity work without depending on mutable form metadata, revalidating
  mutable demand notes, or duplicating those writes. A
  live `APPLYING` retry schedules itself at the three-minute lease boundary; the
  delayed worker can then take over after a process crash where no catch handler
  ran.
- Completed production, received quantities, stock movements, and fulfillment
  evidence are never deleted to make a corrected sales quantity appear clean.
  They remain visible audit evidence attached to the actor-approved change.

## Validation

- Focused cancellation and direct-query transaction/retry behavior: 3 tests / 8
  assertions.
- Direct inbound reduce/remove and sales-adjustment disposition domain matrix:
  8 tests / 18 assertions.
- Inbound route validation: 1 test / 6 assertions.
- Inbound mutation permission boundary: 1 test / 3 assertions.
- Sales activity and Change Review contracts: 8 tests / 31 assertions.
- Apply-lease scheduling, exact takeover, and durable checkpoint recovery: 5
  tests / 7 assertions.
- Total focused coverage: 26 tests / 73 assertions.
- Broader selected regression run: 74 passing tests. Eight unrelated existing
  inbound receipt/component-guard fixture mismatches and one cold router import
  timeout remain outside this feature slice.
- Inventory package typecheck reaches only the existing `@gnd/errors` NodeNext
  extension diagnostics; no touched inventory-file diagnostic remains.
- API and Jobs package typechecks pass.

## Follow-up verification

- Authenticated browser proof should cover an unreceived removal, a partial
  reduction bounded by received quantity, both Sales Change Review dispositions,
  and cancelled-inbound status recovery on the Sales list.
