# Production Readiness Override

## Status

Implemented and locally validated on 2026-07-27.

## Operator Behavior

- The Sales Overview Production tab shows an order-level readiness notice above
  the production list.
- Ready orders show that production can be assigned.
- Configured orders blocked by stock, allocation, or inbound evidence show
  blocker counts, pending/open inbound quantities, a bounded component sample,
  and a direct link to the Inventory tab.
- Admins with `editProduction` may affirm that all required materials are
  physically available. The confirmation does not receive, cancel, or rewrite
  inbound demand, stock, or allocation records.
- Orders without inventory component configuration remain blocked and direct
  the operator to Inventory; they cannot be overridden.
- Fulfilled and cancelled orders remain read-only.
- A confirmed override may start assignment only while its SHA-256 evidence
  revision exactly matches the current order-wide inventory plan. Any inventory
  evidence change makes the confirmation stale.
- `submitAll` remains subject to the strict readiness gate; the override applies
  only to production assignment.
- Confirm, assignment use, and revoke actions write Sales History audit
  evidence. The override can be revoked from the Production tab.

## Implementation Boundaries

- `@gnd/sales` owns readiness projection, evidence revision, confirmation,
  revocation, and final gate behavior.
- The Sales API owns authenticated permission checks and actor resolution.
- The active Production tab loads the core production overview first, then
  starts readiness from the resolved order identity. Readiness never participates
  in the core items response, so a slow or failed projection cannot blank or
  indefinitely load the production list.
- If the readiness projection is temporarily unavailable, the tab keeps the
  core items visible and shows an Inventory-directed warning.
- The dedicated readiness query, confirmation mutation, and Trigger assignment
  gate remain strict; the availability warning never authorizes production.
- The Trigger task rechecks readiness immediately before assignment. Assignment
  rows and override-use audit evidence commit in the same transaction.

## Validation

- Focused readiness, override, and assignment transaction coverage passes 28
  tests / 86 assertions.
- `@gnd/sales`, `@gnd/api`, `@gnd/jobs`, and `@gnd/db` typechecks pass.
- Local browser validation on order `08869PC` showed 14 blocked components and
  22 open inbound quantity, confirmed the warning/dialog/override UI, and
  exercised the production worker selection flow.
- A local domain smoke used the same order and exact selected control UID to
  create a 2-unit assignment for Samuel Gonzalez under the active override. The
  assignment was verified, deleted, and the override revoked; zero active test
  assignments remained.
- Regression coverage verifies that the core production endpoint contains no
  readiness lookup and that the active tab loads readiness independently.
