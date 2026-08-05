# Phase 2: Inventory-Bound Driver Execution

Status: Proposed
Dependency: Canonical manifest identity and revision contract

## Objective

Make warehouse packing and driver completion move the exact inventory allocations associated with the active dispatch while preserving canonical delivery records and resumable proof completion.

## Schema Decision

Recommended approach: add nullable `orderDeliveryId` ownership to `StockAllocation` after splitting allocations to the exact dispatch quantity. This keeps `StockAllocation.status` as the single allocation lifecycle and makes one allocation auditable to one dispatch.

Required schema work:

1. Add `StockAllocation.orderDeliveryId` and relation/index to `OrderDelivery`.
2. Add transition evidence fields or an append-only event contract for reserved/picked/consumed/released actor and time. Prefer existing inventory/audit infrastructure when it can express the event without denormalized mutable actor fields.
3. Add a dispatch manifest revision/fingerprint checkpoint to `OrderDelivery.meta` initially; introduce a model only if query/index needs justify it.
4. Backfill only active inventory-backed dispatch candidates through a dry-run-first command. Historical completed dispatches remain compatibility history and are not retroactively consumed.
5. Add an ADR before migration approval covering allocation-to-dispatch ownership, split behavior, cancellation policy, and legacy fallback.

## Command Plan

1. `assignDispatchInventory`
   - validates active sale/dispatch ownership and manifest revision;
   - selects only approved allocations for required components;
   - splits oversized allocations safely;
   - sets `orderDeliveryId` and transitions them to `reserved` in a serializable transaction;
   - returns shortage/review evidence without inventing stock.
2. `packDispatchInventory`
   - accepts exact dispatch-bound allocation ids or manifest line quantities;
   - moves only `reserved` allocations for that dispatch to `picked`;
   - rejects stale revision, cross-dispatch allocation, excess quantity, and terminal sale/dispatch state;
   - writes/updates legacy packing compatibility rows only after inventory transition succeeds.
3. `releaseDispatchInventory`
   - releases dispatch-bound approved/reserved allocations under normal cancellation/reset policy;
   - requires manager review for already picked allocations if physical unpack confirmation is needed;
   - never releases consumed allocations.
4. `completeDispatchWithProof`
   - retain the current deterministic proof upload and resumable request checkpoint;
   - during canonical finalization, validate that inventory-backed lines have sufficient picked, dispatch-bound allocations;
   - consume exact picked allocations, update existing `OrderDelivery`/`OrderItemDelivery`, fulfillment projections, completion metadata, payment review, and note once;
   - same request id replays success; a competing request conflicts; stale allocation writes abort completion before delivery status changes.
5. Mixed orders
   - inventory lines execute through allocation commands;
   - legacy lines retain existing production-submission packing compatibility;
   - completion requires every line's declared execution mode to pass; missing mapping is not silently treated as inventory-ready.

## UI Behavior Plan

- Warehouse operators see allocation readiness and can pick only reserved quantities.
- Drivers see `Ready to load`, `Partially ready`, `Backordered`, `Inventory review`, or `Legacy item` per line.
- `Start Trip` is enabled only when the configured dispatch policy is satisfied. Manager override, if retained, must be explicit, permission-gated, reasoned, and audited.
- A manifest revision change after packing blocks start/completion and requires refresh/review.
- Cancellation explains whether reservations were released or picked stock needs warehouse confirmation.

## Reconciliation Plan

Add a dry-run reconciliation report with these invariants:

- consumed allocation quantity equals inventory-backed delivered component quantity;
- picked quantity belongs to exactly one active dispatch;
- completed inventory-backed dispatches have no remaining reserved/picked allocations;
- cancelled dispatches have no bound reserved allocations;
- `OrderItemDelivery` sale-line quantity agrees with the fulfillment projection;
- no allocation is consumed twice and no active stock quantity becomes negative.

## Tests and Acceptance

1. Unit tests: split, bind, reserve, pick, release, consume, stale revision, mixed modes.
2. Transaction tests: concurrent pick, concurrent completion, retry, cancellation race, cross-dispatch allocation id, terminal sale.
3. API permission tests: assigned driver versus packing operator versus manager.
4. End-to-end fixture tests: complete, partial/backorder, inbound received, mixed BOM, legacy-only, order edited after pack.
5. Completion passes only when exact picked allocations are consumed once and the same proof request can retry without duplicate inventory, delivery, payment-review, document, or note effects.

## Rollout Safety

- Gate inventory mutation by sale/dispatch eligibility and feature flag.
- Run manifest shadow comparison before mutation enablement.
- Keep compatibility delivery writes until an ADR explicitly changes shipment source of truth.
- Roll back by disabling new inventory command entry; do not revert already consumed allocation state without an audited repair command.
