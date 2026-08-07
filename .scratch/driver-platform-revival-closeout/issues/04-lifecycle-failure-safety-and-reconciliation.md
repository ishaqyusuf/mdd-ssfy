# 04 — Prove lifecycle failure safety and reconciliation

**What to build:** Make failure, cancellation, concurrency, and retry outcomes
as trustworthy as the happy path. Operators must receive a deterministic result
while dispatch, shipment, proof, and inventory records remain reconcilable after
every rejected, resumed, cancelled, or competing operation.

**Blocked by:** 02 — Atomic mixed inventory and legacy dispatch packing; 03 —
Complete the inventory-backed driver journey in Expo Go.

**Status:** ready-for-agent

- [ ] Shortage, backorder, missing mapping, stale manifest, excess quantity,
      terminal dispatch, and cross-dispatch allocation attempts fail without
      partial packing, readiness, or inventory effects.
- [ ] Concurrent packing or completion requests produce one successful canonical
      result and deterministic replay/conflict outcomes for the others.
- [ ] Cancelling an approved or reserved dispatch releases only its active bound
      allocations and preserves auditable shipment history.
- [ ] Cancelling picked work requires authorized physical-return confirmation;
      without confirmation the picked stock is not released.
- [ ] Consumed allocations cannot be released or consumed again through cancel,
      reset, retry, or a competing dispatch.
- [ ] A resumed proof request continues from persisted checkpoints and does not
      repeat completed document, note, payment-review, shipment, or inventory
      effects.
- [ ] Reconciliation reports completed dispatches with active reserved/picked
      stock, cancelled dispatches with reservations, quantity mismatches,
      negative stock, and duplicate consumption as explicit failures.
- [ ] The reversible fixture suite covers inventory-only, legacy-only, mixed,
      split delivery, shortage, stale-after-pack, cancellation, and retry cases.
- [ ] Focused domain, transaction, permission, and application-contract tests
      pass with externally observable state assertions.

