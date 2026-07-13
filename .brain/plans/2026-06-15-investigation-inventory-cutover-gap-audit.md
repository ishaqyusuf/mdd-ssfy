# Plan: Inventory Pending 17 - Inventory Cutover Gap Audit Execution Matrix

## Type
Investigation

## Status
Done

## Created Date
2026-06-15

## Last Updated
2026-06-15

## Intake
- Intake File: brain/intake/2026-06-15-inventory-cutover-pending-scope.md
- Intake Item: what are we missing?

## Goal Or Problem
The inventory migration now spans Dyke sync, sales inventory projections, production, dispatch, print, stock, inbound, backorder, dashboard, and validation. The team needs one current-state gap matrix that proves which requested capabilities are implemented, planned, duplicated, blocked, or missing before more handoffs are generated.

## Current Context
Brain already tracks the inventory-backed fulfillment master model in `brain/features/inventory-backed-sales-fulfillment.md` and proposed plans `pending-02` through `pending-15`. Pending 01 inventory-to-Dyke sync has a completed handoff/review trail. The current worktree also contains ongoing implementation files that may be ahead of Brain or not fully verified.

## Proposed Approach
Perform a read-only audit and produce a gap matrix that maps each requested capability to:
- current code evidence
- current Brain plan or handoff
- implementation status
- verification status
- next recommended plan/handoff
- owner model recommendation

Do not implement code. Do not create handoffs. This investigation prepares approval/handoff sequencing.

## Implementation Steps
- Read `brain/features/inventory-backed-sales-fulfillment.md`.
- Read relevant pending plans:
  - Pending 02 price sync
  - Pending 03 production lifecycle bridge
  - Pending 04 dispatch inventory mode
  - Pending 05 shipment record decision
  - Pending 06 print parity
  - Pending 07 reconciliation jobs
  - Pending 08 production readiness gates
  - Pending 09 partial shipment screen
  - Pending 10 repeat receive/auto-release guardrails
  - Pending 11 item dashboard
  - Pending 12 variants workspace
  - Pending 13 top-sales analytics
  - Pending 14 stock audit verification
  - Pending 15 browser validation
- Inspect current code for authoritative evidence around:
  - inventory-to-Dyke sync
  - variant/supplier price sync
  - production assignment/completion hooks
  - inventory print route/data composer
  - dispatch assign/pack/fulfill state
  - stock tracking and low-stock alerts
  - item dashboard/variants/top-sales pages
  - reconciliation and monitoring jobs
- Create a report under `brain/reviews/` or `brain/reports/` with a capability matrix.
- Recommend whether existing plans should be approved as-is, refined, merged, or split.
- Update Brain progress with the audit location and key findings.

## Affected Files Or Areas
- `brain/features/inventory-backed-sales-fulfillment.md`
- `brain/plans/2026-06-12-feature-pending-*.md`
- `brain/handoffs/inventory-to-dyke-sync-handoff.md`
- `brain/handoffs/completed/2026-06-12-inventory-to-dyke-sync-pending-01-fix-2.md`
- `brain/reports/`
- `brain/reviews/`
- current code under `packages/inventory`, `packages/sales`, `packages/jobs`, `apps/api`, and `apps/www`

## Acceptance Criteria
- A gap matrix exists and covers every requested capability from the intake.
- Each row cites current code and/or Brain evidence.
- Each row has one status: Implemented, Partially Implemented, Planned, Duplicate, Missing, Blocked, or Needs Clarification.
- The report recommends which pending plans should be approved next.
- The report identifies any missing plans that still need intake.
- No handoffs or implementation code are created.

## Test Plan
- Read-only verification only.
- Validate report links point to existing Brain files or code paths.
- Run no builds/typechecks unless explicitly requested.

## Brain Update Requirements
- Create the audit report under `brain/reports/` or `brain/reviews/`.
- Update `brain/progress.md`.
- Optionally update `brain/features/inventory-backed-sales-fulfillment.md` with a short pointer to the audit.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Brain report created
- Files inspected
- Plans recommended for approval
- Missing/duplicated plans found
- Unresolved questions

## Risks / Edge Cases
- Current worktree may include uncommitted implementation that Brain does not yet reflect.
- Some capabilities may appear implemented but lack verification; the matrix must separate implementation from proof.
- Existing plan names use pending numbers, so the audit should not renumber them.

## Open Questions
- TODO: Should the audit live under `brain/reports/` or `brain/reviews/` as the canonical location?

## Linked Task
- Task Title: Inventory Pending 17 - Inventory Cutover Gap Audit Execution Matrix
- Task File: brain/tasks/roadmap.md

## Completion Report
- Brain report created: `brain/reports/2026-06-15-inventory-cutover-gap-audit.md`
- Files inspected: inventory-backed fulfillment feature doc, Pending 02-16 plans, inventory/sales/jobs/API/web code paths listed in the report.
- Plans recommended for approval: Pending 02, 03, 04, 05, 06, 08, 10, 14, 16, and 15; Pending 07 after core invariants land; Pending 11/12/13 as the dashboard expansion track.
- Missing/duplicated plans found: no duplicate plan needed for the user-requested items already covered by Pending 02-16; no new missing plan beyond Pending 16 and this audit.
- Unresolved questions: stock tracking granularity, low-stock alert sophistication, shipment source of truth, production lifecycle persistence, and canonical browser validation environment.
