# 12 — Enforce Approval At Packing And Dispatch Boundaries

**What to build:** Complete the operational enforcement matrix by applying the shared server decision to packing and dispatch progression, leaving those operations available in the first two modes and protecting them in Block All Operations.

**Blocked by:** 10 — Enforce Approval At Purchasing Boundaries.

**Status:** complete

- [x] Warning Only permits packing and dispatch progression with consistent warning metadata and deduplicated would-block observability.
- [x] Block Purchasing & Production continues to permit packing and dispatch when all other business rules allow.
- [x] Block All Operations rejects new packing and dispatch progression for governed orders without Current Approval.
- [x] Current Approval, Not Required, and legacy/unmanaged orders continue in every mode when other permissions and rules allow.
- [x] Viewing, cancellation, release, rollback, reconciliation, error recovery, and correction of existing evidence remain available.
- [x] The gate does not reverse existing packing, dispatch, tracking, delivery, or payment evidence when approval becomes stale.
- [x] Every authoritative manual, automated, batch, and background packing or dispatch entry point invokes the shared server decision.
- [x] Staff surfaces explain the current warning/block and link back to the appropriate Sales approval action.
- [x] Immediate settings and approval-state changes are honored without trusting stale UI or task payload state.
- [x] Matrix tests cover all packing and dispatch entry points, modes, states, exceptions, permissions, automation, and bypass attempts.

## Implementation progress (2026-08-13)

- Packing, inventory fulfillment, dispatch, and background-job progression gates use the shared decision; recovery/release paths remain exempt.
- Forward-only dispatch transition tests and a passing entry-point source contract protect cancellation, rollback, and recovery behavior.
- Final acceptance completed packing/dispatch UI and direct-bypass checks.
