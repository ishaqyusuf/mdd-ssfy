# Production Assignment And Material Readiness

## Status

Current assignment policy updated on 2026-07-28. The 2026-07-27 override flow is
retained only for compatibility and historical audit.

## Operator Behavior

- The Sales Overview Production tab shows an order-level readiness notice above
  the production list only when at least one production-capable line exists.
  Orders with no production items show only the production empty state and do
  not load material readiness.
- Production can be assigned whether materials are ready, awaiting allocation,
  awaiting inbound, or not yet configured.
- Configured orders with unresolved stock, allocation, or inbound evidence show
  blocker counts, pending/open inbound quantities, a bounded component sample,
  and a direct link to the Inventory tab.
- Material blockers use the same canonical inventory tracking policy as the
  Inventory tab. Only monitored `Needs` components participate; untracked and
  component-kind `Not Needed` rows do not block production readiness.
- A monitored component explicitly resolved as `fulfilled` is ready even when
  its physical stock, allocation, inbound, and receipt quantities remain zero.
  This preserves the audited manual-fulfillment decision without fabricating
  inventory movement.
- Assigned production order detail shows pending material names, quantities,
  and the linked inbound expected date when available.
- Orders without inventory component configuration can still be assigned.
  Production-only users do not see the admin setup notice because missing setup
  is not proof that material is physically unavailable.
- Production-only users may submit only when configured material evidence for
  the submitted item is ready. Awaiting inbound/allocation, configured blockers,
  and an unavailable projection block submission. Admin/supervisor submissions
  retain the nonblocking material-review flow.
- Fulfilled and cancelled orders remain read-only.
- `submitAll` and production-only worker submissions are subject to material
  readiness enforcement at their respective shared command boundaries.
- Assignment does not mutate inbound demand, stock, allocation, or receipt
  records.
- Assignment is excluded from the post-command inventory lifecycle sync; the
  assignment task can succeed independently of inventory projection health.
- Direct single-item, legacy item, and batch assignment paths follow the same
  rule and do not run inventory lifecycle synchronization after creating
  assignments.

## Implementation Boundaries

- `@gnd/sales` owns readiness projection and the command policy that excludes
  `createAssignments` from readiness enforcement.
- The production planner reads inventory/category product kind and stock mode,
  applies `resolveSalesInventoryTrackingPolicy`, and derives material status
  from both physical quantity evidence and the component's explicit resolution
  status.
- The Trigger task enforces readiness for `submitAll`; the shared direct
  submission authority separately enforces the production-only worker gate.
- The active Production tab loads the core production overview first, then
  starts readiness from the resolved order identity. Readiness never participates
  in the core items response, so a slow or failed projection cannot blank or
  indefinitely load the production list.
- If the readiness projection is temporarily unavailable, the tab keeps the
  core items and assignment available. Admins see the Inventory-directed
  notice; production-only users see a submission-blocked availability notice.
- `sales.productionOrderDetailV2` reads inventory production-plan evidence
  lazily for the expanded worker/admin order and exposes per-item material
  status, open inbound quantity, and expected inbound date.
- If detail material enrichment fails, the core order/items still return with
  `materialsState=unavailable`; the worker's assignment remains active but a
  direct submission is blocked until availability can be verified.
- Production queue material enrichment is bounded to 100 orders and fails open
  to an explicit `unavailable` display state.
- The persisted override model, API, and audit history remain compatible but are
  not consulted by assignment.

## Historical Override

ADR-030 documented the previous revision-bound exception. ADR-035 supersedes
that authorization model: assignment is now unconditionally independent of
inventory readiness. ADR-062 adds the role-specific production-only submission
gate without changing assignment authorization.
