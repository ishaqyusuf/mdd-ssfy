# Phase 1: Canonical Driver Work Queue and Manifest

Status: Proposed
Dependency: Phase 0 security and detail contract

## Objective

Replace ad hoc mobile derivation and flattened item subtitles with reusable, typed work-queue and manifest projections that can serve Expo, dashboard dispatch tasks, warehouse packing, and print parity.

## Contract Plan

1. Add protected query contracts:
   - `dispatch.driverWorkQueue({ cursor, limit, q, dueBuckets, statuses })`
   - `dispatch.driverWorkQueueSummary({ q, dueBuckets, statuses })`
   - `dispatch.manifest({ dispatchId })`
2. Keep work-queue rows bounded: dispatch/order id, customer/ship-to, safe contact summary, address readiness, status, due date/bucket, packing summary, item/unit counts, and next allowed action.
3. Load the manifest only when detail opens. Do not fan out full inventory, history, and proof data into the list query.
4. Define each manifest line with stable identities:
   - dispatch line/control uid;
   - sales item id and optional door id;
   - inventory line item id;
   - inventory/variant ids and SKU when mapped;
   - execution mode: `inventory`, `legacy`, or `review_required`.
5. Define human-facing fields separately from identity fields: title, item type, size, swing/handing, quantity matrix, configuration attributes, image, and notes.
6. Include manifest revision/fingerprint derived from saved sale revision, relevant door/item configuration, and current fulfillment projection.

## Data Composition Plan

1. Extract the reusable sales configuration projection from `getSaleInformation`; route code must not parse display subtitles.
2. Join inventory `LineItem`, `LineItemComponents`, `InventoryVariant`, variant attributes, allocations, and inbound demand by canonical sales item/control identity.
3. Treat the sales configuration as the authority for what the customer ordered and inventory as the authority for what stock/component coverage can be executed.
4. Return inventory attributes in a human-readable, ordered list. Normalize door size UIDs to standard display values.
5. Return readiness at both finished-line and required-component grain, but keep component detail collapsed by default for drivers.
6. Return explicit warnings for missing mapping, stale projection, configuration conflict, shortage, backorder, production review, and manifest revision mismatch.

## Expo Route and State Plan

1. Keep route entry files compositional and move filter/date/item formatting into `features/dispatch` models.
2. Represent list filters in Expo route params so refresh/deep links preserve the selected queue.
3. Use one `useDriverWorkQueue` infinite query and a separate small summary query.
4. Use one `useDispatchManifest` detail query with on-demand activity/proof history rather than mounting all secondary data immediately.
5. On close or successful mutation, invalidate the exact manifest, queue, summary, packing-list, and relevant inventory fulfillment keys.
6. Preserve last successful data with a visible `Updated …` indicator; show offline/stale state and disable state-changing actions when freshness cannot be proven.

## Midday Adaptation

- Reuse invoice-style independent summary queries, URL-owned filters, infinite list loading, explicit skeleton/empty/no-results/error states, row-open detail behavior, and targeted invalidation.
- Adapt the invoice sheet split to native ownership:
  - route wrapper;
  - top/header summary;
  - manifest content router;
  - focused item-detail sheet;
  - packing/trip action footer.
- Omit desktop DnD, resizable columns, column visibility, and portal bulk bars because they do not fit a driver phone/tablet task flow.

## Target Files

- Create `packages/sales/src/dispatch-manifest/*` for contract composition and normalization.
- Add typed input/output schemas near `apps/api/src/schemas/sales.ts` and protected procedures in `dispatch.route.ts`.
- Add focused query modules instead of expanding the monolithic `apps/api/src/db/queries/dispatch.ts` indefinitely.
- Create `apps/mobile/src/features/dispatch/lib/driver-work-queue-model.ts`.
- Create `apps/mobile/src/features/dispatch/lib/dispatch-manifest-model.ts`.
- Create `apps/mobile/src/features/dispatch/api/use-driver-work-queue.ts` and `use-dispatch-manifest.ts`.
- Split manifest header, item list, item detail, readiness alert, and footer ownership under `apps/mobile/src/features/dispatch/components/dispatch-detail-screen/`.

## Validation and Acceptance

- Contract tests prove size/swing/LH/RH normalization and inventory/legacy/review modes.
- Query tests prove stable cursor pagination and global summaries beyond the first page.
- Mobile tests prove filter serialization, empty/no-results/error/offline states, and item detail output.
- Print comparison proves manifest identity and quantities align with inventory packing-list packet data.
- A deep link to one assigned dispatch opens only the active manifest; secondary history loads only when opened.
