# Ship Status-only Fulfillment Completion and implied Production Completion

Type: implementation
Status: ready-for-agent
Label: ready-for-agent
Blocked by: [`03-ship-status-only-production-completion-end-to-end.md`](03-ship-status-only-production-completion-end-to-end.md)
Parent: [`../map.md`](../map.md)
Source specification: [`../spec.md`](../spec.md)

## Outcome

An authorized user can use **Update status only** for Fulfillment Completion.
The order becomes administratively completed for order-level completion
consumers, Production Completion is implied, and canonical Fulfilled remains
false unless independent proof and committed inventory/dispatch evidence exist.

## Deliverables

1. Extend the shared resolver with administrative Fulfillment Completion,
   implied Production Completion, `fulfillmentDisposition`, precedence when
   canonical evidence later appears, provenance, and the approved action matrix.
2. Add authenticated, transactional, idempotent Fulfillment mark/cancel commands
   using `FULFILLMENT_COMPLETED`, without writing operational fulfillment state.
3. Enforce Fulfillment-before-Production cancellation order and restore explicit
   or operational Production Completion correctly after cancellation.
4. Add milestone-specific confirmation/history/status wording that never labels
   a proofless Status-only result as unqualified **Fulfilled**.
5. Add backend and UI permission enforcement, stale-state handling, refresh, and
   focused tests for implication, precedence, locking, cancellation, audit, and
   forbidden side effects.

## Acceptance criteria

- Specification scenarios 2, 3, 8-10, 14, 15, 17, 19-21 pass.
- Status-only Fulfillment yields `ADMINISTRATIVELY_COMPLETED` and
  `canonicalFulfilled = false` without canonical evidence.
- Later canonical evidence changes disposition to `FULFILLED` without rewriting
  or deleting Status-only history.
- No delivery proof, dispatch completion, inventory commitment, tax recognition,
  accounting entry, notification, shipment, commission, or payout is fabricated.

## Required checks

- Resolver precedence and implication tests.
- Mark/cancel concurrency, idempotency, audit, permission, and transition tests.
- Focused Dashboard Fulfillment modal/history/locking tests.
- Relevant API, Sales, Dashboard, and permission typechecks/tests.
- `git diff --check` for the review unit.

## Boundaries

- Do not weaken canonical Fulfilled or tax-recognition evidence requirements.
- Do not close or mutate operational dispatch/inventory/proof records.
- Do not add bulk Status-only completion.

