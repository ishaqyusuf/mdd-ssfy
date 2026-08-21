# 01 — Prototype The Connected Admin And Driver Workflow

**Source:** [Fulfillment Admin And Responsive Driver Workflow](../../dispatch-admin-responsive-driver-workflow/spec.md)

**What to build:** Create one non-production connected prototype in which a
desktop office administrator and a 390px-wide driver operate the same realistic
order. The prototype must make assignment, quantity verification, partial
packing, assistance, approval or denial, resume, trip execution, proof, Back
order, and Fulfilled outcomes understandable before production presentation is
locked.

**Blocked by:** None — can start immediately.

**Status:** in-progress — awaiting representative feedback

- [x] The admin and driver views share one simulated state and demonstrate assignment through final fulfillment.
- [x] The prototype includes successful, denied, physical-shortage, partial, stale-revision, reassignment, weak-network retry, and duplicate-submit states.
- [x] Drivers see one clear next action and can distinguish Status, Assigned To, Packing blocked, Back order, Delivered, and Fulfilled.
- [ ] Representative admin and driver feedback is recorded with the resulting terminology and interaction decisions.
- [x] The prototype performs no production API, email, inventory, dispatch, proof, or hosted-data writes.

## Review evidence

- Local-only route: `/sales-book/fulfillment/prototype`
- Admin blocked-state screenshot: [ticket-01-admin-blocked.png](../screenshots/ticket-01-admin-blocked.png)
- Driver weak-network screenshot: [ticket-01-driver-retry-full.png](../screenshots/ticket-01-driver-retry-full.png)
- Focused validation: 8 tests / 30 assertions.
- Browser validation: URL-owned scenario switching, blocked assistance copy,
  single driver primary action, and weak-network retry were verified in the
  authenticated in-app browser.
