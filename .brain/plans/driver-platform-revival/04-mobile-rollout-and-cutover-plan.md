# Phase 3: Driver Mobile Rollout and Cutover

Status: Proposed
Dependency: Canonical manifest and inventory-bound commands

## Objective

Deliver the revived driver workflow to operators through a controlled pilot, with device proof, observability, documentation, and a reversible feature cutover.

## Final Native Flow

1. Home opens quickly with authoritative Overdue, Due Today, In Progress, and Upcoming summaries.
2. Search and filter state is route-owned and preserved across detail navigation.
3. A dispatch row shows explicit delivery date meaning, customer/stop, address readiness, packing readiness, and the one valid next action.
4. Dispatch detail loads a small header and manifest first. Activity, proof history, and component depth load only when opened.
5. Manifest rows show product image/title, type/style, size, handing, ordered/packed/remaining quantities, and inventory readiness.
6. Item detail shows full loading information and allocation/component exceptions without exposing pricing or irrelevant administrative data.
7. Warehouse packing picks inventory; driver start verifies freshness/readiness; completion reuses resumable proof and consumes inventory exactly once.

## Pilot Plan

1. Create local and preview fixtures for overdue/today/upcoming, pre-hung LH/RH, bifold, moulding, mixed inventory/legacy, partial shipment, backorder, missing address, and edited-after-pack cases.
2. Enable read-only manifest shadow mode for internal admins and compare legacy versus canonical rows/quantities.
3. Pilot the new read experience with one warehouse operator and one driver while mutations remain legacy.
4. Enable allocation-bound packing for the pilot cohort.
5. Enable inventory-bound completion only after reconciliation remains clean for the agreed observation window.
6. Expand cohort gradually; keep an explicit operator rollback switch.

## QA Matrix

- Android phone portrait at 390x844-class size.
- Android tablet/foldable landscape and the 1080x1298-class viewport shown in the client recording.
- Cold start, warm cache, pull-to-refresh, deep link, app background/restore, weak network, lost network, and retry after proof upload.
- Long titles, missing images, missing address, no due date, overdue date, DST/timezone boundary, and more than one page of assigned jobs.
- Packing keyboard behavior, scrolling with fixed footer, modal dismissal, image preview, issue flow, trip start/cancel, and proof completion.
- Accessibility labels, text scaling, contrast, touch target size, and screen-reader order for manifest facts.

## Validation Commands

- Focused Bun tests for sales manifest, API permission/query, inventory transitions, and mobile models/components.
- `bun run typecheck` with the focused package/app diagnostics reviewed first.
- Narrow mobile Expo export/build using the repository's existing scripts.
- API/dashboard smoke for dispatch admin, task, packing list, and inventory dispatch workspaces.
- Real-device authenticated QA using an assigned driver account; no production mutation until the pilot gate explicitly authorizes it.

## Observability

Track:

- queue/manifest latency, error rate, and stale age;
- unauthorized and cross-driver access rejections;
- missing address, missing handing, missing inventory mapping, and stale revision counts;
- reserve/pick/release/consume transition conflicts;
- completion retry/replay/conflict outcomes;
- post-completion allocation/delivery reconciliation mismatches;
- pilot operator issue submissions by workflow stage.

## Cutover and Rollback

1. Document feature flags, eligibility rules, on-call owner, reconciliation command, and rollback decision thresholds.
2. Keep old response fields and legacy execution fallback through the pilot.
3. Roll back the new read UI independently from inventory mutations.
4. Once an allocation is consumed, repair only through an audited inventory correction/reconciliation workflow; never “roll back” by blindly changing status.
5. Remove legacy driver derivation only after the pilot cohort and a broader cohort complete with zero unexplained reconciliation mismatch and accepted client sign-off.

## Completion Evidence

- Before/after screenshots for the client example class.
- Recorded device flow from queue to item detail to pack/start/complete.
- Permission matrix results.
- Manifest completeness report.
- Inventory reconciliation report before and after pilot completion.
- Exact test/build commands and results.
- Updated Brain feature, API contract/permission, schema/relationship/migration, ADR, task, and progress documentation.
