# Sales Change Review: Accurate Operational Impact and Modal

Status: Proposed
Date: 2026-08-25
Scope: Development environment only until validation and explicit deployment approval

## Problem

The sales-order change review currently presents whole-order commitment totals as if they describe the lines being changed. In particular:

- `inboundQty` includes projected inbound requirements and unlinked demand, so it can be non-zero even when no inbound shipment exists.
- Allocation, production, and fulfillment totals can include unchanged order lines.
- The review is displayed in a side sheet, while this blocking approval workflow should use a centered modal.

This makes labels such as `Inbound 9` and `Allocated 7` misleading during a quantity reduction.

## Objective

Make the review describe only the operational impact of the proposed changes, distinguish an actual open linked inbound shipment from projected inbound demand, and render the review in an accessible responsive modal.

## Non-goals

- Do not change production data or production deployments during this work.
- Do not change fulfillment-worker behavior unless focused tests reveal a separate reconciliation defect.
- Do not add a database migration; the necessary shipment linkage and status data already exist.

## Execution Plan

### 1. Establish authoritative impact semantics

- Add a shared domain calculation for affected commitments using only reduced/changed sales lines.
- Define `affectedOpenInboundQty` as the remaining quantity on active, linked inbound shipment items for those affected lines.
- Exclude unlinked inbound demand, projected `qtyInbound`, and completed, closed, or cancelled inbound shipments.
- Calculate affected allocated, production, completed-production, and fulfilled quantities from the same changed-line set.
- Reuse this calculation for both the numeric summary and the `requiresInboundDisposition` decision so the two cannot drift.

Proposed preview contract:

```ts
operationalImpact: {
  affectedLineCount: number;
  allocatedQty: number;
  openInboundQty: number;
  productionQty: number;
  completedProductionQty: number;
  fulfilledQty: number;
}
```

Payment remains separate settlement context because it is order-level, not affected-line activity.

### 2. Correct the adjustment preview API

- Build `operationalImpact` in `previewNewSalesFormAdjustment` from the already identified changed commitments.
- Continue returning the precise inbound-disposition requirement, but base it on the same linked/open-inbound helper.
- Stop using whole-order `commitments` as the source for review badges.
- Prefer the inferred tRPC router output type in the client instead of maintaining a handwritten duplicate review type.
- Keep the preview self-contained so opening the modal does not trigger secondary requests.

Primary files:

- `packages/sales/src/adjustment-system/domain/change-analysis.ts`
- `apps/api/src/db/queries/new-sales-form-adjustments.ts`
- `apps/api/src/trpc/routers/new-sales-form.route.ts`

### 3. Remove misleading figures from every review entry point

- In the pre-review warning/banner, use qualitative affected-line labels until the authoritative preview is available, rather than displaying whole-order numbers.
- In the review, display only non-zero values from `operationalImpact`.
- Show `Open inbound N` and the Cancel/Keep choice only when an affected line has a real, active, linked inbound shipment with remaining quantity.
- Use wording such as `Allocated inventory` and `Open inbound` so projected demand is never presented as physical inbound activity.
- Add short explanatory copy indicating that the figures cover the lines being changed, not the entire order.

Primary files:

- `apps/dashboard/src/components/forms/new-sales-form/new-sales-form.tsx`
- `apps/dashboard/src/components/forms/new-sales-form/sections/sales-change-review-sheet.tsx`

### 4. Replace the side sheet with a modal

- Rename the form-specific component to `SalesChangeReviewDialog` and its file to `sales-change-review-dialog.tsx`.
- Replace the sheet primitives with the shared Radix-based dialog primitives.
- Use a centered responsive layout approximately `max-w-3xl`, constrained to the viewport height.
- Keep the header and action footer visible while the review body scrolls.
- Preserve existing staged-change, acknowledgement, inbound-disposition, submission, loading, and error behavior.
- Preserve focus trapping, keyboard navigation, Escape handling, accessible title/description, and safe close behavior.
- On small screens, use a near-full-width, height-constrained modal rather than reverting to a side sheet.

### 5. Add regression coverage

Domain/API cases:

1. Projected inbound quantity or unlinked demand exists, but no shipment is linked: open inbound is zero and no disposition is requested.
2. A linked inbound exists only on an unchanged line: it is excluded.
3. An affected line has an active linked shipment with quantity 4 and received quantity 1: open inbound is 3 and disposition is required.
4. Completed, closed, and cancelled shipments are excluded.
5. Allocation on unchanged lines is excluded; allocation on affected lines is counted accurately.

UI cases:

- The review imports dialog primitives and no sheet primitives.
- Impact badges use the affected-line contract.
- Inbound choices are absent without actual open linked inbound and present with the exact affected quantity when required.
- Approval remains disabled until every required decision/acknowledgement is supplied.
- Closing and reopening resets local review decisions without corrupting staged form changes.

### 6. Validate on the development page

- Start the dashboard dev stack through the shared Portless setup; the currently open local tabs are stale 404 pages and there is no active route.
- Use a deterministic local fixture matching order `09433PC` semantics; do not mutate production.
- Test quantity reductions with projected demand only, unrelated-line inbound, affected-line open inbound, and completed inbound.
- Verify desktop and mobile modal dimensions, scrolling, focus, keyboard behavior, cancel, and approve paths.
- Run the focused domain/API/UI tests, then `bun run typecheck` and the narrowest relevant dashboard validation.
- Capture the before/after values and screenshots in the implementation report.

## Acceptance Criteria

- A projected inbound requirement without an actual linked open shipment never appears as inbound activity.
- Unchanged lines cannot inflate allocation, inbound, production, or fulfillment figures in the review.
- Inbound disposition appears only for affected quantities on active linked inbound shipments.
- The review opens as a centered responsive modal with accessible keyboard and focus behavior.
- Existing adjustment submission and worker reconciliation remain correct.
- All validation is completed locally before any production deployment is proposed.

## Documentation Impact on Implementation

When implemented, update the sales adjustment feature documentation with the affected-line semantics and modal behavior. No database documentation update is expected unless implementation uncovers a schema change.
