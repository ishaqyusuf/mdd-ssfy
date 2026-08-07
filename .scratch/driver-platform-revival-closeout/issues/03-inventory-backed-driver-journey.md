# 03 — Complete the inventory-backed driver journey in Expo Go

**What to build:** Run a reversible inventory-backed dispatch from warehouse
packing through the assigned driver's queue, Start Trip, proof completion, and
exact inventory consumption in Expo Go. Preserve the existing resumable proof
contract and capture durable before/after evidence.

**Blocked by:** 01 — Genuine development employee quick login.

**Status:** ready-for-agent

- [ ] The local-only fixture can be dry-run, applied, inspected, completed, and
      rolled back without touching non-fixture dispatch or inventory data.
- [ ] Before warehouse confirmation, the fixture shows the correct target,
      zero packed quantity, inventory-review readiness, and a blocked Start Trip
      reason.
- [ ] Warehouse confirmation binds and picks the exact required allocation
      quantity, updates compatibility shipment evidence, and changes readiness
      to ready-to-load.
- [ ] The selected assigned driver sees the fixture in their authoritative queue
      and cannot see another driver's protected dispatch.
- [ ] Start Trip succeeds only after server-authoritative readiness passes and
      persists the canonical in-progress state.
- [ ] Signature/photo proof completion succeeds through the existing resumable
      flow and consumes only picked allocations bound to the fixture dispatch.
- [ ] Shipment quantity, completion metadata, proof records, activity evidence,
      and inventory fulfillment agree after completion.
- [ ] Repeating the same completion request replays success without duplicate
      consumption, shipment, proof, payment-review, document, or activity
      effects.
- [ ] Expo Go evidence captures login, queue, detail, warehouse transition,
      Start Trip, proof completion, and the final completed state.
- [ ] Reconciliation snapshots before and after the journey prove exact quantity
      movement and no remaining active allocation for the completed dispatch.

