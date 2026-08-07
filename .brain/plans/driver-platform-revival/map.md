# Driver Platform Revival and Inventory Cutover

Date: 2026-08-05
Status: Source phases implemented; approved closeout tickets remain
Owner: Mobile / Sales Fulfillment / Inventory
Scope: Revive the Expo driver and warehouse delivery platform, close the client-reported manifest gaps, and cut driver execution over to inventory-backed fulfillment without breaking legacy dispatch compatibility.

## Implementation Update — 2026-08-06

Phases 0-3 are implemented in source: dispatch reads are protected and
assignment-scoped; the work queue and summary are server-authoritative; the
typed manifest exposes explicit due dates, handing evidence, configuration, and
inventory readiness; exact stock allocations bind to a dispatch and transition
through reserve/pick/consume/release; split-trip quantities are scoped; and
mobile uses sectioned summary-first lists and detail-on-demand.

The smaller development router removed the prior Expo Go Hermes crash. Expo Go
54.0.8 device proof covers ordinary login, the development-only employee list,
assigned queue/detail, dark-theme rendering, and warehouse preparation of a
reversible inventory fixture from unpacked/review state to packed/ready state.
That proof found two remaining product boundaries: selecting an employee does
not authenticate that selected account, and mixed legacy/inventory packing is
still sequenced across separate mutation paths. Start/proof completion,
failure/reconciliation evidence, and pilot handoff remain open.

## Approved Closeout Specification — 2026-08-07

The remaining work is specified in
`.scratch/driver-platform-revival-closeout/map.md` and published as five local
`ready-for-agent` tickets with explicit blocking edges:

1. genuine development employee quick login;
2. atomic mixed inventory and legacy dispatch packing;
3. complete the inventory-backed driver journey in Expo Go;
4. prove lifecycle failure safety and reconciliation;
5. produce pilot, cutover, and handoff evidence.

Tickets 01 and 02 form the immediate execution frontier. Implementation remains
paused until one of those tickets is selected.

## Objective

Restore the driver platform as a reliable daily work surface: drivers must see the right due-date priority, complete item and door configuration, current packing readiness, and safe trip actions. The final state must make inventory allocations the operational source of truth while `OrderDelivery` and `OrderItemDelivery` remain the canonical shipment records during the current cutover phase.

## Assumptions

- The user's “private platform” refers to the driver/delivery platform shown in the client video.
- The requested “media planner” refers to the Midday migration planner and its architecture patterns.
- The first target is the existing Expo driver stack under `apps/mobile/src/app/(drivers)`; dashboard dispatch administration and warehouse packing remain supporting surfaces.
- Existing legacy dispatches must remain readable and completable during migration.
- Inventory-backed orders should progressively use inventory allocation truth; mixed and unmapped legacy orders require an explicit fallback rather than silent inference.
- No production rollout occurs until assigned-driver authorization, manifest correctness, allocation reconciliation, and Android device proof pass.

## Client Message Review

The 70-second recording shows Miguel logged into the driver app and opening order `08980DB`. The client is asking for:

1. A clearly labeled delivery/due date on the driver card. The example card shows `07/30/26` under an `Urgent / Due Today` heading on August 5, so an overdue job is visually mixed with due-today work and the date pill has no explicit meaning.
2. Complete item details from the packing list, not only a product title and broad type/size subtitle.
3. Door-specific configuration, especially pre-hung door swing/handing (left/right), plus enough construction/style information for the loading crew to identify the correct physical doors.
4. The information available immediately so delivery staff can load trucks and begin daily work confidently.

The request is operational, not cosmetic: the current screen does not provide a sufficiently verifiable loading manifest.

## Current Status Review

| Area | Current state | Readiness | Main gap |
| --- | --- | --- | --- |
| Driver authentication and routing | Dedicated Expo driver stack, section switching, notifications, settings, and assigned-dispatch routes exist. | Partial | Dispatch read procedures themselves are not protected consistently. |
| Driver dashboard | Assigned/in-progress cards, infinite query, pull-to-refresh, and a five-item `Urgent / Due Today` list exist. | Partial | The list is merely the first five pending dispatches; it does not calculate overdue/due-today/upcoming buckets. Counts reflect loaded pages, not authoritative totals. |
| Dispatch list | Status chips and pagination exist. | Partial | Status filtering is client-side over already loaded pages; `scheduleDate` exists in the schema but is not applied by `whereDispatch`. Search/date/count semantics are not server-authoritative. |
| Dispatch detail | Customer, phone, address, packing list, activity, issue, trip, and completion surfaces exist. | Partial | Due-date context is absent from the detail summary; missing address is not elevated as a pre-trip blocker. |
| Packing list | Item images, title, subtitle, packed state, quantity, update/reset actions, and packing history exist. | Partial | Row and item modal do not expose a structured manifest: item type, size, handing, ordered/packed LH/RH quantities, SKU/variant, configuration selections, or inventory readiness. |
| Door data | Sales/HPT records select door dimension, swing, LH/RH quantities, product image, and title. Legacy dispatch subtitle attempts to join section, size, and swing. | Partial | The API returns flattened text and the UI totals the quantity matrix. If `swing` is blank but LH/RH quantities exist, the UI hides the usable handing evidence. The example pre-hung rows show size but no left/right detail. |
| Trip lifecycle | Start, cancel, issue, complete, signature/photo proof, notifications, and payment-review integration exist. | Strong legacy foundation | Completion updates legacy dispatch truth only; it does not consume inventory allocations. |
| Completion resilience | Request-scoped, idempotent, resumable proof completion and stored-document handling are implemented. | Strong | Inventory consumption must be incorporated without weakening this retry contract. |
| Warehouse packing | Separate mobile warehouse-packing workspace reuses the dispatch detail execution flow. | Partial | It still uses the legacy dispatch packing projection rather than allocation-bound pick work. |
| Inventory foundation | `LineItem`, BOM components, variants, stock, allocations, inbounds, backorders, partial shipments, inventory dispatch commands, print packets, and web workspaces exist. | Strong foundation | The driver manifest and driver commands do not consume this source of truth. |
| Mobile inventory | Backorder and partial-shipment mobile workspaces were added on 2026-08-05. | Partial | Inventory dispatch assign/pack/fulfill/release has not been brought into the driver stack. |
| Security | Mutations are protected and assigned-driver/manager guarded. | Not ready | `dispatch.index`, `assignedDispatch`, `dispatchOverviewV2`, `packingList`, and related detail reads use `publicProcedure`; unauthenticated or over-broad reads can expose operational/customer data. |
| Tests and runtime proof | Proof completion, packing payload, inventory transitions, and mobile fulfillment model tests exist. | Partial | No focused contract/component coverage proves due buckets, assigned-only reads, structured door details, or inventory-backed driver completion. Latest mobile export reached the full Metro graph before a package-resolution blocker; that blocker is recorded fixed, but driver device proof has not been rerun. |

## Architectural Decision

Create one protected driver work-queue contract and one protected dispatch-manifest contract. The manifest combines, without conflating:

1. sales configuration truth: customer-facing item title, door style/type, size, swing/handing, LH/RH/total ordered quantity, and saved configuration selections;
2. inventory truth: inventory item/variant identity, human-readable attributes, required component coverage, allocation state, picked quantity, shortages, and inbound/backorder state;
3. dispatch truth: assigned driver, due bucket, packing quantities, trip state, delivery address, proof state, and current `OrderDelivery` identity.

Inventory-backed commands must be bound to the existing dispatch. Approved allocations are split to exact quantities where required, attached to one `OrderDelivery`, then transition `reserved → picked → consumed` or `released`. Driver completion consumes only allocations already picked for that dispatch and updates the existing delivery compatibility rows in the same canonical completion operation. Legacy-only lines remain visible through a clearly labeled fallback and never receive invented inventory or swing data.

## Detailed Execution Plan

### Phase 0 — Immediate Recovery and Privacy Gate

Execute [01-immediate-recovery-and-security-plan.md](01-immediate-recovery-and-security-plan.md).

- Protect and capability-scope dispatch reads.
- Return authoritative due buckets/counts.
- Relabel the home card date and separate Overdue, Due Today, and Upcoming.
- Add a structured item detail presentation using already available sales/HPT data, including explicit LH/RH quantities.
- Ship behind a driver-platform feature flag after focused Android proof.

Exit gate: the client-reported order class can be loaded by its assigned driver, every visible pre-hung row shows size and explicit handing evidence or `Handing not recorded`, and unauthenticated/cross-driver access is rejected.

### Phase 1 — Canonical Driver Work Queue and Manifest

Execute [02-canonical-work-queue-and-manifest-plan.md](02-canonical-work-queue-and-manifest-plan.md).

- Replace flattened legacy subtitles with typed manifest fields.
- Keep list summaries small and load manifest detail on demand.
- Normalize exact date/timezone semantics and item detail completeness.
- Add query invalidation, explicit loading/error/empty/offline states, and fixture coverage.

Exit gate: another engineer can render the same manifest on Expo, dashboard, and packing print without re-deriving domain meaning in each UI.

### Phase 2 — Inventory-Bound Dispatch Execution

Execute [03-inventory-bound-execution-plan.md](03-inventory-bound-execution-plan.md).

- Bind stock allocations to a dispatch.
- Reserve on dispatch assignment/readiness, pick during warehouse packing, consume during proof completion, and release on cancellation/reset under explicit policy.
- Reuse the existing inventory transition invariants and resumable proof contract.
- Reconcile `StockAllocation`, `OrderDelivery`, `OrderItemDelivery`, and sales fulfillment projections.

Exit gate: a successful driver completion consumes the exact picked inventory once, a retry is idempotent, and cancellation cannot leak reservations or consume stock.

### Phase 3 — Mobile UX, Pilot, and Cutover

Execute [04-mobile-rollout-and-cutover-plan.md](04-mobile-rollout-and-cutover-plan.md).

- Adopt the Midday summary-first, filter-owned, detail-on-demand workflow in native form.
- Pilot with a small driver/warehouse cohort.
- Shadow-compare legacy and inventory manifests before enabling inventory mutations.
- Complete Android phone/tablet QA, observability, runbook, and rollback proof.

Exit gate: pilot operators can load, pack, start, and complete representative delivery types with zero unexplained manifest or inventory reconciliation mismatch.

## Sequencing and Estimate

| Slice | Dependency | One-engineer estimate | Parallelizable work |
| --- | --- | --- | --- |
| Phase 0 | None | 3-5 working days | API authorization tests and Expo detail UI can proceed in parallel. |
| Phase 1 | Phase 0 contracts | 1-2 weeks | Manifest projection and mobile presentation can overlap after schema freezes. |
| Phase 2 | Phase 1 identity contract | 2-3 weeks | Schema/domain commands and completion orchestration can be split after the binding decision. |
| Phase 3 | Phases 1-2 | 1-2 weeks | Device QA, fixtures, documentation, and telemetry can overlap. |

Planning range: roughly 5-8 engineering weeks for one engineer, or 3-5 weeks with two coordinated engineers and dedicated operator QA. This is a planning range, not a delivery commitment; real active-order data completeness and the allocation-binding migration decide the final schedule.

## Success Metrics

- 100% of active driver work-queue reads are authenticated and assigned/permission scoped.
- 100% of due jobs have an explicit `Overdue`, `Due today`, `Due tomorrow`, `Upcoming`, or `No due date` label using the configured business timezone.
- 100% of pre-hung manifest lines show size and handing/swing or an explicit missing-data warning; blank is not acceptable.
- 100% of inventory-backed completions reconcile picked and consumed allocation quantity with delivered sale-line quantity.
- Zero duplicate consumption or duplicate delivery records under completion retry.
- Driver work-queue and manifest query failure rates, stale-data age, packing conflicts, missing configuration count, and inventory reconciliation drift are observable.

## Skills List Used

- `plan`: required a concrete, phased execution plan with assumptions, dependencies, validation, and risks.
- `project-brain`: aligned the plan with current inventory, dispatch, API, decisions, task status, and progress records.
- `midday-migration-planner`: compared the driver workflow with Midday's invoice work-queue/detail-on-demand patterns and produced a migration contract rather than a cosmetic redesign.

## Risks and Mitigations

- **Public dispatch data exposure:** protect reads first; add unauthenticated, cross-driver, packing-role, and manager permission tests before UI rollout.
- **Incomplete historical door configuration:** never infer a swing from a title. Prefer explicit swing, then show LH/RH quantity evidence, otherwise render `Handing not recorded` and route repair to sales/admin.
- **Double inventory consumption:** bind exact allocations to one dispatch, use serializable status-and-quantity guarded writes, and preserve request-id idempotency.
- **Mixed legacy/inventory orders:** return per-line execution mode and keep legacy fallback read-only with explicit warning; do not treat missing inventory mapping as available stock.
- **Order edits after packing:** store manifest revision/fingerprint at pick confirmation and force refresh/review when the sale or inventory projection revision changes.
- **Offline or weak mobile network:** retain query cache for read access, show last-updated time, queue no stock mutation blindly, and reuse the existing proof retry checkpoint for final completion.
- **Over-broad rewrite:** ship Phase 0 separately, keep feature flags and compatibility writes, and require a measured shadow comparison before inventory mutation cutover.
- **Stale Brain status:** some older inventory sections still say browser proof is pending while later evidence records it complete. Treat the dated evidence and current code as authoritative, and refresh those status summaries during implementation.

## Reference Compared

### GND target inspected

- `apps/mobile/src/app/(drivers)/dispatch/index.tsx`
- `apps/mobile/src/app/(drivers)/dispatch/all.tsx`
- `apps/mobile/src/app/(drivers)/dispatch/[dispatchId].tsx`
- `apps/mobile/src/features/dispatch/api/use-assigned-dispatch-list.ts`
- `apps/mobile/src/features/dispatch/api/use-dispatch-overview.ts`
- `apps/mobile/src/features/dispatch/components/driver-dashboard-dispatch-item.tsx`
- `apps/mobile/src/features/dispatch/components/dispatch-list-screen.tsx`
- `apps/mobile/src/features/dispatch/components/dispatch-detail-screen/index.tsx`
- `apps/mobile/src/features/dispatch/components/dispatch-detail-screen/components/scroll-content.tsx`
- `apps/mobile/src/features/dispatch/components/dispatch-detail-screen/modals/packing-item-modal.tsx`
- `apps/api/src/trpc/routers/dispatch.route.ts`
- `apps/api/src/db/queries/dispatch.ts`
- `apps/api/src/prisma-where.ts`
- `packages/sales/src/sales-control/get-sale-information.ts`
- `packages/sales/src/sales-control/get-dispatch-information.ts`
- `packages/sales/src/sales-control/tasks.ts`
- `packages/sales/src/sales-fulfillment-plan.ts`
- `packages/sales/src/sales-inventory-overview.ts`
- `packages/db/src/schema/sales.dispatch.prisma`
- `packages/db/src/schema/inventory.prisma`

### Midday reference inspected

- `apps/dashboard/src/app/[locale]/(app)/(sidebar)/invoices/page.tsx`
- `apps/dashboard/src/components/invoice-header.tsx`
- `apps/dashboard/src/components/open-invoice-sheet.tsx`
- `apps/dashboard/src/components/invoice-search-filter.tsx`
- `apps/dashboard/src/components/sheets/invoice-sheet.tsx`
- `apps/dashboard/src/components/invoice-sheet-header.tsx`
- `apps/dashboard/src/components/invoice-content.tsx`
- `apps/dashboard/src/components/invoice/form-context.tsx`
- `apps/dashboard/src/hooks/use-invoice-params.ts`
- `apps/dashboard/src/hooks/use-invoice-filter-params.ts`
- `apps/dashboard/src/components/tables/invoices/data-table.tsx`
- `apps/dashboard/src/components/tables/invoices/columns.tsx`
- `apps/dashboard/src/components/tables/invoices/table-header.tsx`
- `apps/dashboard/src/components/tables/invoices/actions-menu.tsx`
- `apps/dashboard/src/components/tables/invoices/bottom-bar.tsx`
- `apps/dashboard/src/components/tables/invoices/skeleton.tsx`
- `apps/dashboard/src/components/tables/invoices/empty-states.tsx`

Midday elements intentionally omitted from the native driver UI: desktop column resize/reorder, DnD, sticky table columns, and a desktop bulk-action portal. Their architectural intent is retained through a small prefetched summary, server-owned filters, detail-on-demand loading, explicit states, URL/route-owned selection, and deliberate invalidation.
