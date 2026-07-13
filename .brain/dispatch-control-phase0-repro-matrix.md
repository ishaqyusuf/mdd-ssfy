# Dispatch Control Stabilization - Phase 0 Repro Matrix

Date: 2026-03-12
Owner: Codex + Product/Engineering
Status: In Progress

## Goal

Build a deterministic before/after evidence pack for the 6 reported control issues before any behavior-changing implementation.

## Scope

1. Packing list accuracy for non-production deliverables.
2. Mark-as-fulfilled flow correctness (dispatch creation/completion/packing).
3. Dispatch list packing progress consistency against packing detail.
4. V2 control system adoption on all relevant paths.
5. Mobile packing parity with web/API control behavior.
6. Permanent control logic documentation.

## Fixture Set (Required Before Implementation)

- [ ] `F1`: Order with mixed lines: produceable deliverables + non-produceable deliverables.
- [ ] `F2`: Order with dispatch already listed, partial packed, with pending packings. (`dispatchId=3419`)
- [ ] `F3`: Order where fulfillment path creates new dispatch.
- [ ] `F4`: Order used on both web and mobile to compare same dispatch numbers. (`dispatchId=3420`)

For each fixture, capture:
- `salesId`
- `dispatchId`
- `orderNo`
- item mix summary (produceable/shippable/qty)

Reported priority dispatch IDs:
- `3419`
- `3420`

## Repro Matrix

### Issue 1 - Packing list excludes non-production deliverables

Expected:
- Non-produceable but shippable items are pack-available when deliverable.

Evidence Sources:
- API: `dispatch.dispatchOverview`
- Control logic: `packages/sales/src/utils/with-sales-control.ts`
- Deliverables builder: `packages/sales/src/sales-control/get-sale-information.ts`

Checklist:
- [ ] For `F1`, capture `dispatchOverview.dispatchItems[*].deliverables`.
- [ ] For `F1`, capture `dispatchOverview.dispatchItems[*].deliverableQty|listedQty|packedQty|nonDeliverableQty`.
- [ ] Confirm missing items in packing UI and compare with API payload.

### Issue 2 - Mark as fulfilled does not pack correctly

Expected:
- Fulfillment flow uses canonical control command chain and submits only after required packing behavior completes.

Evidence Sources:
- Web: `apps/www/src/components/tables/sales-orders/columns.tsx`
- Legacy server action path: `apps/www/src/actions/sales-mark-as-completed.ts`

Static Baseline Findings:
- `columns.tsx` fulfillment path can trigger `packItems` asynchronously and then immediately call `submitDispatch` without waiting.
- `sales-mark-as-completed.ts` directly mutates `qtyControl.autoComplete` and `orderDelivery.status`, bypassing control mutation service.

Checklist:
- [ ] For `F3`, record network/task timeline for mark-fulfilled.
- [ ] Capture resulting dispatch status + packing rows + control stats.
- [ ] Verify if any path bypasses `update-sales-control` command chain.

### Issue 3 - Dispatch list progress mismatch

Expected:
- Dispatch row progress uses dispatch-scoped control values and matches dispatch overview item math.

Evidence Sources:
- Web list: `apps/www/src/components/tables/sales-dispatch/columns.tsx`
- Mobile list: `apps/expo-app/src/features/dispatch/components/dispatch-list-item.tsx`
- API list query: `apps/api/src/db/queries/dispatch.ts`

Static Baseline Findings:
- Web progress currently falls back across `order.control`, `dispatch.control`, and `statistic`, which can mix scopes.
- Mobile progress currently uses `order.control` only, not dispatch-scoped control.

Checklist:
- [ ] For `F2` and `F4`, capture web list progress numbers.
- [ ] For same dispatch IDs, capture mobile list progress numbers.
- [ ] Cross-check with `dispatchOverview.dispatchItems` aggregate packed/pending.

### Issue 4 - Ensure all controls use new control system

Expected:
- Control-sensitive read/write paths use V2 module contracts; legacy paths are compatibility-only and non-authoritative.

Evidence Sources:
- Router/query: `apps/api/src/db/queries/dispatch.ts`, `apps/api/src/db/queries/sales.ts`
- Control module: `packages/sales/src/control/*`
- Legacy compatibility: `packages/sales/src/utils/with-sales-control.ts`

Checklist:
- [ ] Inventory all read paths used by dispatch list/overview/sales list.
- [ ] Inventory all write paths used by packing/start/cancel/submit/fulfill.
- [ ] Mark each path `V2`, `compat`, or `legacy bypass`.

### Issue 5 - Mobile packing correctness

Expected:
- Mobile packing payload and completion behavior matches web/API contract and waits for task completion.

Evidence Sources:
- Mobile payload builder: `apps/expo-app/src/features/dispatch/lib/packing-payload.ts`
- Mobile packing trigger: `apps/expo-app/src/features/dispatch/api/use-dispatch-packing.ts`
- Mobile completion flow: `apps/expo-app/src/features/dispatch/components/dispatch-detail-screen/index.tsx`

Checklist:
- [ ] For `F4`, run pack selection, pack available/all, and complete flow.
- [ ] Capture task payloads and completion timing.
- [ ] Validate mobile post-action numbers against API dispatch overview.

### Issue 6 - Control logic documentation

Expected:
- One authoritative brain doc for terms, formulas, and accepted flow sequences.

Checklist:
- [ ] Record canonical definitions: `qty`, `pendingAssignment`, `pendingSubmission`, `packables`, `pendingPacking`, `packed`.
- [ ] Record computation scope per surface: order-level vs dispatch-level.
- [ ] Record mandatory command sequence for fulfillment and complete-all.

## Phase 0 Evidence Capture Format

For each fixture and issue:
- [ ] `before` screenshots (web and mobile where applicable)
- [ ] `before` API payload snapshot
- [ ] `before` task payload snapshot
- [ ] mismatch summary (`expected`, `actual`, `delta`)

Store under:
- `ai/dispatch-control-evidence/<fixture-id>/<issue-id>/`

## Initial Path Inventory (Static Audit)

| Surface | Path | Current State | Notes |
| --- | --- | --- | --- |
| Dispatch list query | `apps/api/src/db/queries/dispatch.ts#getDispatches` | `V2 + compat mapper` | Uses `withDispatchListControl` with legacy `statistic` compatibility mapping. |
| Dispatch overview query | `apps/api/src/db/queries/dispatch.ts#getDispatchOverview` | `V2 + compat fallback` | Flagged V2 overview, still keeps legacy fallback/parity path. |
| Control compute utility | `packages/sales/src/utils/with-sales-control.ts` | `compat authority for fallback` | Contains packables/pendingPacking derivation used by compatibility paths. |
| Mark fulfilled (web table action) | `apps/www/src/components/tables/sales-orders/columns.tsx` | `mixed/orchestration risk` | `packItems` trigger not awaited before `submitDispatch` in pack-all mode. |
| Mark fulfilled (legacy server action) | `apps/www/src/actions/sales-mark-as-completed.ts` | `legacy bypass` | Directly mutates `qtyControl` + dispatch status; bypasses command chain. |
| Dispatch progress (web list) | `apps/www/src/components/tables/sales-dispatch/columns.tsx` | `mixed scope` | Falls back across `order.control`, `dispatch.control`, and `statistic`. |
| Dispatch progress (mobile list) | `apps/expo-app/src/features/dispatch/components/dispatch-list-item.tsx` | `mixed scope` | Uses `order.control` pending/packed for dispatch row card. |
| Mobile pack trigger | `apps/expo-app/src/features/dispatch/api/use-dispatch-packing.ts` | `V2-aligned` | Uses `startAndWait` and canonical `packingLines`. |
| Jobs command router | `packages/jobs/src/tasks/sales/update-sales-control.ts` | `V2-aligned` | Routes actions through new control command mapping. |

## Exit Criteria (Phase 0 Complete)

- [ ] All 6 issues have at least one reproducible fixture with concrete data.
- [ ] Static baseline inventory labels each relevant path (`V2`/`compat`/`legacy bypass`).
- [ ] Evidence folders are created with required artifacts.
- [ ] Phase 1 implementation can start without ambiguity.
