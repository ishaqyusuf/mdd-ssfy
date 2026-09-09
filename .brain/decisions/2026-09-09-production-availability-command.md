# Scoped Production availability command

Date: 2026-09-09
Status: Accepted for the current implementation

Use one scoped availability transaction for the selection form and mark-all shortcut. Reuse the existing demand splitting, receiving, allocation, review and projection functions. Add no schema migration and no broad Inventory permission for workers.

The read contract distinguishes actual inbound history, unfinished inbound priority, uncovered materials and unapplied receipt evidence. Merged display rows retain individual component capacities. Receipt plus its allocation is one quantity of coverage; the canonical receiver/recompute and Inventory display must not add both.

Allocate only newly received demand IDs, avoiding historical receipt replay. Persist actor/idempotency-key/request hash and receipt allocation quantities in Event. Allocation evidence groups by component/stock pair, capped by current committed quantities, so splitting IDs or editing operational notes does not erase provenance. Unknown legacy provenance is conservative.

Received date is a calendar date normalized to business noon in America/New_York. Audit creation time remains actual save time. This uses existing receivedAt fields.

Production and explicitly expanded calendar details reuse these scoped contracts. The explicit Sync transaction applies eligible received shipment quantities, valid allocation proposals and received-stock reservations before finalizing eligible submissions. It creates no new receipt, stock movement or submission, retains residual attention, and uses durable replay evidence. Historical covered-review reconciliation is a separate no-new-receipt operation; GET/hover/expand must not mutate inventory or approve submissions.
