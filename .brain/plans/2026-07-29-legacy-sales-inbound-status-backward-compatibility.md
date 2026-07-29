# Plan: Legacy Sales Inbound Status Backward Compatibility

## Type

Backward-compatibility feature and migration UX

## Status

Implemented for the per-order automatic adaptation path; rollout audit and the
full disposable-fixture browser matrix remain release verification work.

## Created Date

2026-07-29

## Last Updated

2026-07-29 — clarified automatic migration outcomes for `PENDING ORDER`,
`ORDERED`, and `AVAILABLE`.

## Objective

Make historical sales orders with a recognized manual inbound status visible and
actionable in the Sales Orders `Inbound` column, then automatically convert the
saved prompt into the current inventory-backed model when the Inventory tab is
opened.

The implementation must preserve the historical operator intent without
inventing stock, receipts, or supplier assignments. When supplier resolution is
unambiguous, the migration should automatically generate canonical inbound
shipments that match the historical meaning: `PENDING ORDER` becomes a pending
inbound, `ORDERED` becomes an in-progress inbound, and `AVAILABLE` runs the
guarded manual need-fulfillment workflow. Inventory remains the operational
source of truth after migration, in accordance with
`ADR-009-inventory-owned-inbound-demand-status.md`.

## Current Problem And Root Cause

The current list and detail surfaces derive state from different inputs:

- `sales.getOrders` returns both the old `SalesOrders.inventoryStatus` value and
  an inventory applicability projection.
- The Sales Orders `Inbound` cell gives `not_synced` / `failed` projection state
  precedence over the saved manual status, so a historical `ORDERED` order can
  display `Not synced`.
- The Inventory tab independently derives `setupMode=legacy_status_locked` when
  a saved manual status exists but no inventory-backed rows have been created.
  It therefore shows the old value and blocks automatic setup.
- The existing legacy-resolution service has two actions:
  - `reset` clears the saved status, then synchronizes inventory.
  - `override` preserves the saved status, then synchronizes inventory.
- The labels `Reset status and configure` and `Override and configure` require
  the operator to understand internal implementation language. They do not
  explain which action preserves historical intent.

This creates a real contradiction: the table says the sale is not synchronized,
while the detail view says it has a locked historical status.

## Governing Invariants

1. An active linked `InboundShipment` is always the highest-precedence source for
   the Sales Orders `Inbound` column.
2. A recognized legacy status is compatibility evidence, not proof of stock,
   allocation, receipt, supplier, or shipment linkage.
3. Continuing from a legacy status synchronizes inventory requirements and
   `InboundDemand` using the inventory-owned resolver
   `resolveOrderInboundDemandStatus(...)`.
4. Migration never downgrades shipment-linked, partially received, or received
   demand.
5. `AVAILABLE` uses the existing guarded `Mark all needs fulfilled` semantics:
   fulfill eligible needs and cancel only mutable, unlinked, unreceived demand;
   do not fabricate physical stock or allocation.
6. `PENDING ORDER` creates supplier-resolved inbound shipments with shipment
   status `pending`.
7. `ORDERED` creates supplier-resolved inbound shipments with shipment status
   `in_progress`, or advances an already-linked pending inbound to
   `in_progress`.
8. Automatic shipment creation uses existing supplier configuration only:
   preferred active supplier, inventory default supplier, or the sole active
   supplier. Missing or ambiguous supplier assignments remain review work.
9. Every mutation is guarded by the exact reviewed legacy status and is
   transactionally audited.
10. Retrying the same action must not duplicate inventory rows, demand, shipment
   items, or history that claims work occurred twice.

## Desired Compatibility State Matrix

| Persisted/effective state | Sales Orders `Inbound` display | Click behavior | Primary Inventory-tab action | Canonical result |
| --- | --- | --- | --- | --- |
| Active linked inventory inbound exists | Existing inventory-owned shipment status | Open the linked inbound | Existing inbound actions | No compatibility migration |
| Legacy `ORDERED`, no linked inbound, no configured inventory rows | Amber `ORDERED` badge with legacy/setup-required indicator | Open Inventory tab and start migration | Automatic on open | Synchronize requirements; automatically create supplier-resolved inbound shipment(s) as `in_progress` |
| Legacy `PENDING ORDER`, no linked inbound, no configured inventory rows | Amber `PENDING ORDER` badge with legacy/setup-required indicator | Open Inventory tab and start migration | Automatic on open | Synchronize requirements; automatically create supplier-resolved inbound shipment(s) as `pending` |
| Legacy `AVAILABLE`, no linked inbound, no configured inventory rows | Amber `AVAILABLE` badge with legacy/setup-required indicator | Open Inventory tab and start migration | Automatic on open | Synchronize requirements; automatically run guarded `Mark all needs fulfilled` without changing physical stock |
| Recognized legacy status plus existing inventory rows, but no linked inbound | Show canonical demand/readiness summary; include legacy prompt only as context | Open Inventory Needs/Stock segment | Reconcile only if a conflict exists | Inventory demand remains operational truth |
| Unrecognized non-empty legacy status | Red `Status needs review` badge | Open a blocking review card | `Clear unsupported status` or map through an explicit admin repair | No silent mapping |
| No legacy status and no projection | Existing `Not synced` behavior | Open Inventory setup | `Configure inventory` | Normal setup path |
| Projection ready with zero requirements | `N/A` | Show informational toast | None | No inbound work |

Amber is the default legacy tone because the state is known and actionable, not
necessarily erroneous. Red is reserved for an unsupported value, a failed
migration, or a conflict that cannot be reconciled safely.

## Automatic Migration And Recovery UX

For recognized legacy statuses, remove the reset/override decision from the
normal path. Opening the Inventory tab should start one idempotent migration and
show a temporary state such as:

- `Adapting legacy ORDERED status…`
- `Creating inventory requirements and in-progress inbounds.`

Before or during migration, a compact explanation should state:

- the saved status being preserved;
- the number of inventory requirements that will be synchronized, when known;
- whether pending or in-progress supplier inbounds will be created;
- which supplier rule will be used, and which rows still need supplier review;
- whether needs will be manually fulfilled without a physical stock change;
- where the operator will land after success.

After success, replace the migration card with the canonical Inventory view.
Recovery actions should appear only when automatic migration cannot finish:

- `Choose supplier` for missing or ambiguous supplier assignments;
- `Retry migration` after a transient failure;
- `Clear legacy status and configure from scratch` as a visually de-emphasized,
  confirmed fallback;
- explicit admin review for unsupported historical values.

Remove `override` from visible UI language. Retain it temporarily as an API
compatibility alias for old clients, normalized server-side to `continue`.

## Detailed Execution Plan

### Phase 0: Read-Only Scope Audit

1. Add a bounded, read-only report/query for legacy status candidates grouped by:
   - normalized legacy status;
   - lifecycle status;
   - inventory projection state;
   - inventory requirement-row count;
   - active linked-inbound count;
   - open/received demand presence;
   - supplier resolution outcome: fully resolved, partially resolved, missing,
     or ambiguous.
2. Classify every non-empty legacy status as:
   - recognized and locked;
   - already represented by canonical inventory;
   - unsupported;
   - terminal/read-only;
   - conflicting.
3. Include stable order identifiers and reason codes in a small operator sample.
4. Run this as a dry read only. Do not repair or bulk-migrate records as part of
   discovery.
5. Use the result to confirm whether production data contains status spellings
   beyond `AVAILABLE`, `ORDERED`, and `PENDING ORDER`.

### Phase 1: Shared Compatibility Policy

1. Add a pure compatibility resolver in `packages/sales`, adjacent to the
   existing inventory applicability/setup policy.
2. Input should include:
   - legacy order prompt;
   - projection state and need count;
   - configured inventory-row count;
   - active linked-inbound ownership;
   - demand summary, including receipt/linkage evidence;
   - order lifecycle.
3. Return a typed compatibility contract:
   - `state`: `none | legacy_locked | legacy_reconciled | conflict |
     unsupported | terminal`;
   - `normalizedLegacyStatus`;
   - `displayLabel`;
   - `tone`;
   - `description`;
   - `recommendedAction`;
   - `canContinue`;
   - `canClear`;
   - `destinationSegment`;
   - `targetShipmentStatus`: `pending | in_progress | null`;
   - `targetNeedAction`: `create_inbound | fulfill_manually | none`;
   - machine-readable `reasonCode`.
4. Keep demand-state translation in
   `@gnd/inventory/inbound-policy`; the sales compatibility resolver may select
   a workflow but must not duplicate `ORDERED` / `PENDING ORDER` demand mapping.
5. Add an explicit `AVAILABLE` fulfillment policy:
   - use the guarded manual-fulfillment service after inventory synchronization;
   - fulfill eligible tracked components;
   - cancel only mutable, unlinked, unreceived demand associated with those
     fulfilled components;
   - leave shipment-linked, partially received, and received demand protected;
   - return a partial/review result when protected needs remain.
6. Keep active linked inbound ownership ahead of every legacy/manual state.

### Phase 2: Enrich Sales Order And Overview Contracts

1. Extend the server-owned sales order DTO with an
   `inventoryLegacyCompatibility` object from the shared resolver.
2. Build the DTO in `apps/api/src/db/queries/sales-orders-v2.ts`, beside
   `inventoryApplicability` and `inventoryInboundOwnership`.
3. Return the same compatibility object from
   `packages/sales/src/sales-inventory-overview.ts` so list and Inventory tab use
   one definition.
4. Avoid inferring `legacy_locked` in the browser from two unrelated fields.
5. Preserve current response fields during rollout so older clients continue to
   work.
6. Update API contract documentation with precedence and reason-code semantics.

### Phase 3: Fix The Sales Orders `Inbound` Column

1. Extend `resolveSalesInboundColumnState(...)` with a dedicated
   `legacy_status_locked` state.
2. Apply display precedence in this exact order:
   - active linked inventory inbound;
   - active synchronization;
   - legacy compatibility state;
   - projection failure/not-synced attention;
   - not applicable;
   - ordinary manual/create-inbound action.
3. For recognized locked values:
   - display the normalized old label, not `Not synced`;
   - use an amber badge and a small lock/history icon;
   - tooltip:
     `Legacy ORDERED status — inventory setup is required to continue.`;
   - clicking opens the Inventory tab and starts automatic legacy migration,
     rather than opening the ordinary inbound creation form.
4. For unsupported values:
   - display `Status needs review` in red;
   - include the raw value only in the detailed review card, safely escaped.
5. Preserve keyboard activation and row-click event isolation.
6. Ensure inbound-management and overview-header surfaces use the same display
   precedence where they expose the same status.

### Phase 4: Replace Reset/Override With Automatic Migration And Recovery

1. Rename the domain action from `override` to `continue`.
2. For backward compatibility, accept:
   - canonical actions: `continue | clear`;
   - deprecated API aliases: `override -> continue`, `reset -> clear`.
3. Normalize aliases at the API boundary and write only canonical action names
   in new audit history. Include `requestedAction` when an old alias was used.
4. Update the Inventory tab so `setupMode=legacy_status_locked` automatically
   calls the canonical `continue` mutation once for the exact
   `salesOrderId + legacyStatus` baseline.
5. Guard the client trigger against React remounts and query refetches, while
   relying on server idempotency as the real duplicate-execution protection.
6. Show:
   - a status-specific migration progress card while the mutation runs;
   - the canonical Inventory view immediately after success;
   - supplier-resolution actions after partial success;
   - a Retry action after transient failure;
   - a secondary Clear action with confirmation for explicit recovery.
7. Do not automatically retry a failed mutation in a render/effect loop.
   Require operator Retry after the first failure and show the returned reason.
8. Use a success summary based on actual canonical effects instead of generic
   `rows synced` copy.
9. Rename service concepts to reflect migration, for example
   `resolveSalesInventoryLegacyStatusMigration`, while retaining a temporary
   export wrapper if other packages call the current service name.
10. Do not expose an unrestricted privileged override flag.

### Phase 5: Implement Transactional Continue Behavior

1. Re-read the overview immediately before mutation and require:
   - the order still exists;
   - lifecycle still permits migration;
   - `setupMode` is still `legacy_status_locked`;
   - the exact persisted status still matches the reviewed baseline;
   - no active linked inbound appeared since preflight.
2. Run inventory synchronization in the same transaction using
   `syncSalesInventoryLineItems`.
3. Preserve the legacy order prompt during `continue`.
4. Let the existing inventory-owned resolver create/reconcile demand before
   status-specific materialization:
   - `ORDERED` initially projects unreceived, unlinked open demand as `ordered`;
   - `PENDING ORDER` initially projects unreceived, unlinked open demand as
     `pending`;
   - positive received quantities retain `partially_received` or `received`;
   - shipment-linked open demand retains shipment-owned status.
5. Materialize `PENDING ORDER`:
   - collect active unlinked demand created or reconciled by the sync;
   - resolve supplier per demand using the shared deterministic supplier rule;
   - group demand by supplier;
   - call a refactored transaction-capable inbound orchestration once per
     supplier group with `status: "pending"` and
     `orderPromptEffect: "preserve"`;
   - keep `SalesOrders.inventoryStatus="PENDING ORDER"`;
   - do not call the current API wrapper unchanged, because it always writes
     `SalesOrders.inventoryStatus="ORDERED"` after linking demand;
   - after linkage, allow the existing inventory invariant to represent linked
     demand as `ordered`; the shipment lifecycle `pending` is the user-facing
     indication that the supplier order has not started;
   - return unresolved demand ids for supplier selection when supplier
     resolution is missing or ambiguous.
6. Materialize `ORDERED`:
   - reuse and generalize the existing `planOrderedInboundAutomation(...)`
     behavior;
   - advance existing linked `pending` shipments to `in_progress`;
   - group unlinked demand by safely resolved supplier;
   - call `createInboundShipmentFromDemands` with `status: "in_progress"`;
   - keep already-active or terminal linked shipments unchanged;
   - keep `SalesOrders.inventoryStatus="ORDERED"`;
   - return unresolved demand ids for supplier review instead of assigning a
     placeholder supplier.
7. Materialize `AVAILABLE`:
   - synchronize requirements first;
   - invoke the same guarded domain operation used by
     `fulfillSalesInventoryNeedsManually`;
   - mark eligible pending tracked components `fulfilled`;
   - cancel only mutable, unlinked, unreceived `pending` / `ordered` demand;
   - preserve protected demand and return its component ids for review;
   - set/retain `SalesOrders.inventoryStatus="AVAILABLE"`;
   - record `noPhysicalStockChange=true`; do not claim allocation, receipt, or
     stock movement.
8. Refactor the existing manual-fulfillment implementation into a
   transaction-capable core so the legacy migration does not open a nested,
   independently committing transaction.
9. Refactor the inbound-from-demand API orchestration so automatic migration
   preserves its existing supplier validation, inbound activity, linked-order
   evidence, and payment-review side effects while allowing the caller to
   preserve `PENDING ORDER` instead of always forcing `ORDERED`.
10. Run synchronization, status materialization, shipment creation/status
   transition, order-state preservation, and audit history atomically for each
   sale. Do not copy the current note-side best-effort failure behavior into
   this migration.
11. Create one `SalesHistory` entry after effects are known, containing:
   - previous prompt;
   - canonical action;
   - created/updated/skipped counts;
   - demand status counts;
   - created inbound ids and their initial statuses;
   - advanced inbound ids;
   - manually fulfilled and protected component ids;
   - supplier-unresolved demand ids;
   - conflict reason codes;
   - actor and timestamp;
   - projection/sync operation identifier if available.
12. Return a structured result:
   - `result: migrated | migrated_with_review | already_migrated | blocked`;
   - `legacyStatus`;
   - `createdCount`, `updatedCount`, `skippedCount`;
   - `demandStatusCounts`;
   - `createdInbounds: Array<{ id, supplierId, status }>`;
   - `advancedInboundIds`;
   - `fulfilledComponentCount`, `protectedComponentIds`;
   - `unresolvedSupplierDemandIds`;
   - `linkedInboundIds`;
   - `nextSegment`;
   - `messages` / reason codes.
13. Re-query post-transaction state for the response or invalidate all affected
   list, overview, demand-queue, summary, and inbound queries.

### Phase 6: Implement Safe Clear Behavior

1. Show a confirmation dialog before clearing.
2. Reuse the exact status/setup/lifecycle concurrency guards from Continue.
3. Clear only `SalesOrders.inventoryStatus`.
4. Synchronize inventory requirements normally.
5. Do not modify received, partially received, or shipment-linked inventory
   records.
6. Audit the removed prompt and all sync effects with canonical action `clear`.
7. Land the operator in the Inventory `Needs` or `Stock` segment according to
   the resulting requirements.

### Phase 7: Automatic Inbound Generation And Destination UX

1. Move or re-export `planOrderedInboundAutomation(...)` from the API-local
   query layer into a shared package-level policy that can plan both pending and
   ordered migration without duplicating supplier selection rules.
2. Use this supplier precedence for each unlinked demand:
   - preferred active `SupplierVariant`;
   - inventory `defaultSupplierId`;
   - the sole active supplier variant;
   - otherwise unresolved.
3. Group resolvable demand by supplier so one sale may generate multiple inbound
   shipments when its items use different suppliers.
4. Create shipments with status determined by the legacy prompt:
   - `PENDING ORDER` -> `pending`;
   - `ORDERED` -> `in_progress`.
5. Do not create a generic or placeholder supplier merely to force automatic
   completion. For unresolved rows:
   - complete migration for safely resolvable rows;
   - return `migrated_with_review`;
   - open the Create inbound form with unresolved demand preselected;
   - require the operator to select or configure a supplier.
6. After successful `PENDING ORDER` or `ORDERED` migration:
   - switch to the Inventory `Inbounds` segment;
   - expand the only created/advanced inbound when exactly one exists;
   - otherwise show the generated inbound list and a summary toast.
7. After `AVAILABLE` migration:
   - switch to the Inventory `Needs` / `Stock` segment;
   - show eligible needs as fulfilled;
   - if protected components remain, show a review alert and link to their
     inbounds;
   - use wording such as `Needs marked fulfilled — no physical stock movement
     was recorded`.
8. Once shipments exist, normal inventory ownership takes precedence in every
   display:
   - pending shipment displays `Pending`;
   - in-progress shipment displays `In progress`;
   - multiple generated shipments display the existing count/summary state.

### Phase 8: Idempotency, Concurrency, And Failure Recovery

1. Use existing unique/projection constraints and guarded `updateMany` writes so
   repeated synchronization cannot duplicate canonical rows.
2. Add an operation key or equivalent audit correlation for a migration attempt.
3. If a retry finds canonical rows already synchronized and compatible:
   - return `already_migrated`;
   - do not write a second success history record;
   - route to the current canonical segment.
4. If a linked inbound, receipt, lifecycle change, or prompt change races the
   mutation:
   - abort or return `blocked`;
   - do not partially clear the prompt;
   - refresh the UI with the newer source of truth.
5. Transaction failure must leave both the prompt and canonical inventory state
   unchanged.
6. A failed projection remains visible as red/review state with a retry path; it
   must not fall back to an apparently successful legacy badge.

### Phase 9: Tests And Verification

#### Pure policy tests

- All three recognized legacy statuses.
- Whitespace/case handling at the normalization boundary.
- Unsupported non-empty statuses.
- Linked inbound precedence.
- Projection syncing/failure precedence.
- Terminal lifecycle behavior.
- `PENDING ORDER` targets shipment status `pending`.
- `ORDERED` targets shipment status `in_progress`.
- Supplier resolution uses preferred, then default, then sole active supplier.
- Missing and ambiguous suppliers are returned for review.
- `AVAILABLE` targets guarded manual fulfillment.

#### Service tests

- Continue preserves the exact prompt and synchronizes rows.
- `ORDERED` creates/updates unlinked mutable demand and generates an
  `in_progress` inbound per resolved supplier.
- `ORDERED` advances an existing pending linked inbound to `in_progress`.
- `PENDING ORDER` creates/updates unlinked mutable demand and generates a
  `pending` inbound per resolved supplier.
- Linking `PENDING ORDER` demand may make demand status `ordered` while keeping
  the shipment lifecycle `pending`.
- Shipment-linked `PENDING ORDER` demand is not downgraded.
- Partially received and received demand is not downgraded.
- `AVAILABLE` uses manual need fulfillment, cancels only mutable unlinked
  unreceived demand, and records no physical stock change.
- `AVAILABLE` reports protected linked/received components without altering
  them.
- Multiple suppliers produce separate shipments.
- Missing/ambiguous suppliers produce `migrated_with_review` without a fake
  supplier.
- Clear removes only the prompt and synchronizes normally.
- Stale prompt, new inbound, or lifecycle changes block the transaction.
- Retry returns an idempotent result without duplicate audit.
- Transaction rollback covers sync, shipment, fulfillment, status-transition,
  and history failures.
- Deprecated `reset` / `override` inputs map to canonical actions.

#### Contract and UI tests

- Sales list DTO and overview DTO produce the same compatibility result.
- `Not synced + legacy ORDERED` renders amber `ORDERED`.
- Unsupported legacy status renders red review state.
- Active linked inbound wins over every legacy value.
- Clicking a legacy badge opens the Inventory tab and starts one migration.
- React remount/refetch does not start duplicate client attempts.
- A failed attempt does not automatically loop; Retry is operator-driven.
- The progress card names the legacy status and target operation.
- Normal success exposes no reset/override/continue decision.
- Clear confirmation describes what will and will not change.
- Toasts summarize created pending/in-progress inbounds, fulfilled needs, and
  any supplier/protected-demand follow-up.
- Keyboard and row navigation behavior remains intact.

#### Browser acceptance matrix

- Historical `ORDERED` order with no inventory rows.
- Historical `PENDING ORDER` order with no inventory rows.
- Historical `AVAILABLE` order with fulfillable requirements.
- Historical `AVAILABLE` order with protected linked/received requirements.
- Historical order whose demands resolve to multiple suppliers.
- Historical order with missing or ambiguous supplier assignment.
- Historical status with existing canonical demand but no shipment.
- Historical status with a linked inbound.
- Historical status with a partial receipt.
- Unsupported historical value.
- Concurrent/stale simulation where the prompt changes before migration commits.
- Reload and back/forward behavior after migration.

Use a disposable fixture or captured baseline with restoration for mutation
tests. Existing production-like sales may be used for read-only inspection only
unless the user explicitly authorizes mutation.

### Phase 10: Rollout And Observability

1. Roll out display compatibility before enabling the mutation:
   - list correctly shows the legacy value;
   - clicking explains the locked state;
   - audit candidate counts and unsupported values.
2. Enable automatic per-order migration on Inventory-tab open after the
   read-only candidate report and focused tests pass.
3. Record metrics/log counters for:
   - candidate count by status;
   - continue success;
   - continue-with-review;
   - clear;
   - generated pending inbound;
   - generated in-progress inbound;
   - manually fulfilled needs;
   - unresolved supplier demand;
   - protected fulfillment needs;
   - unsupported;
   - stale/concurrent block;
   - migration failure.
4. Review outcomes before considering a bulk tool.
5. If a batch tool is later needed:
   - dry-run by default;
   - accept only explicit reviewed sales-order ids;
   - revalidate each baseline at apply time;
   - never bulk-clear unsupported or `AVAILABLE` conflicts;
   - return changed, skipped, and remaining candidates.
6. Keep deprecated action aliases for one release window, measure their use, then
   remove them after all active clients use canonical actions.

## Expected File And Package Touch Points

- `packages/sales/src/sales-inventory-applicability.ts`
- `packages/sales/src/sales-inventory-policy.ts`
- new `packages/sales/src/sales-inventory-legacy-compatibility.ts`
- `packages/sales/src/sales-inventory-overview.ts`
- `packages/sales/src/sales-inventory-legacy-status-setup.ts` or its renamed
  migration service
- `packages/sales/src/manual-fulfill-sales-inventory-needs.ts`
- `packages/sales/src/sync-sales-inventory-line-items.ts`
- `packages/inventory/src/application/inbound/inbound-demand-policy.ts`
  (tests or minimal extensions only; preserve inventory ownership)
- `apps/api/src/db/queries/sales-inventory-inbound-automation.ts` (move its
  reusable planning policy to a package-level module)
- `apps/api/src/db/queries/note.ts` (reuse the shared automation policy)
- `apps/api/src/db/queries/sales-orders-v2.ts`
- `apps/api/src/trpc/routers/inventories.route.ts`
- `apps/dashboard/src/components/sales-inbound-status-badge.tsx`
- `apps/dashboard/src/components/tables-2/sales-orders/columns.tsx`
- `apps/dashboard/src/components/sales-overview-system/tabs/inventory-tab.tsx`
- focused package, API, component, and browser tests
- `.brain/features/inventory-backed-sales-fulfillment.md`
- `.brain/api/contracts.md`
- `.brain/api/endpoints.md`
- `.brain/decisions/ADR-009-inventory-owned-inbound-demand-status.md` only if the
  governing demand mapping changes
- a new ADR or ADR-009 amendment documenting the automatic legacy-status
  materialization mapping
- `.brain/progress.md` and the appropriate task ledger during implementation

## Database And Migration Impact

No schema migration is required for the recommended first implementation:

- reuse `SalesOrders.inventoryStatus` as the compatibility input;
- reuse inventory projection state, line components, `InboundDemand`, and
  `SalesHistory`;
- derive compatibility state instead of persisting a second status system.

Only add a database field if implementation proves that an idempotency operation
key cannot be represented safely by existing projection/history metadata. Any
such change requires a separate schema review and Brain database updates.

## Acceptance Criteria

- A historical `ORDERED`, `PENDING ORDER`, or `AVAILABLE` value is never hidden
  behind `Not synced` in the Sales Orders `Inbound` column.
- The column clearly distinguishes legacy/setup-required state from an active
  inventory-owned shipment.
- Clicking the legacy badge opens the Inventory tab and automatically starts one
  guarded migration for the exact saved status.
- The automatic migration preserves the recognized status and
  creates/synchronizes canonical inventory requirements.
- `PENDING ORDER` automatically creates `pending` inbound shipments for
  supplier-resolved demand.
- `ORDERED` automatically creates `in_progress` inbound shipments or advances
  existing pending shipments.
- `AVAILABLE` runs the existing guarded `Mark all needs fulfilled` semantics and
  records that no physical stock change occurred.
- Missing or ambiguous supplier assignments are reported for manual review and
  never replaced with a fabricated supplier.
- `ORDERED` and `PENDING ORDER` demand continue to obey ADR-009 mapping after
  shipment linkage.
- Automatic Continue and explicit Clear are guarded, transactional, audited, and
  retry-safe.
- Existing linked, partially received, and received inventory state is never
  downgraded.
- Old API clients using `reset` / `override` continue to work during the
  deprecation window.
- List and Inventory-tab states agree after mutation and reload.
- Focused tests and the browser acceptance matrix pass before release.

## Risks And Mitigations

- **Risk: automatic shipment creation chooses the wrong supplier.**
  Mitigation: use only deterministic preferred/default/sole-supplier resolution,
  group by supplier, and leave missing or ambiguous rows for review.
- **Risk: opening a read-oriented tab unexpectedly performs a write.**
  Mitigation: scope auto-migration only to recognized `legacy_status_locked`
  records, show progress immediately, write complete audit evidence, make the
  server operation idempotent, and expose Retry/Clear only as recovery actions.
- **Risk: `PENDING ORDER` shipment linkage changes demand to `ordered`.**
  Mitigation: document that demand linkage and shipment lifecycle are separate;
  the user-facing shipment remains `pending` until ordering starts.
- **Risk: `AVAILABLE` is mistaken for physical allocation.**
  Mitigation: use the existing manual-fulfillment operation, record
  `noPhysicalStockChange=true`, and show explicit UI copy that no stock movement
  or allocation occurred.
- **Risk: partially successful creation leaves mixed state.**
  Mitigation: run sync, supplier-group creation, status changes, fulfillment,
  order update, and audit atomically per sale; unresolved supplier rows are a
  planned review result, not a caught write failure.
- **Risk: the current inbound API wrapper changes `PENDING ORDER` to
  `ORDERED`.**
  Mitigation: parameterize/refactor the shared orchestration with an explicit
  guarded prompt effect; keep `set_ordered` as the normal create-inbound default
  and use `preserve` only for legacy pending-order migration.
- **Risk: existing production data contains unexpected spellings.**
  Mitigation: run Phase 0 classification and route unsupported values to explicit
  review instead of fuzzy silent conversion.
- **Risk: duplicate rows/history on retries.**
  Mitigation: guarded baselines, transactional sync, idempotent projection
  behavior, and a correlated operation/result contract.
- **Risk: list and detail drift again.**
  Mitigation: return a shared server-derived compatibility DTO and test both
  surfaces against the same fixtures.
- **Risk: old clients still send `override` / `reset`.**
  Mitigation: API aliases with canonical audit names and measured deprecation.
- **Risk: terminal or partially received orders are changed accidentally.**
  Mitigation: lifecycle, linkage, and receipt guards run again inside the
  transaction; terminal records remain review/repair-only.

## Implementation Sequence And Release Gates

1. Phase 0 read-only scope report.
2. Shared policy and contract tests.
3. Display-only column compatibility.
4. Inventory-tab automatic-migration/progress/recovery UX.
5. Transactional automatic Continue/Clear service and API aliases.
6. Full focused test suite.
7. Disposable-fixture browser matrix.
8. Per-order rollout with monitoring.
9. Optional reviewed batch tooling only after measured per-order results.

Do not proceed to a later gate when the prior gate has unsupported status values,
unexplained supplier-resolution gaps, unprotected `AVAILABLE` fulfillment,
failing idempotency tests, or list/detail contract drift.

## Skills Used For This Plan

- `plan`: structured, implementation-ready planning with explicit scope, risks,
  acceptance criteria, and handoff details.
- Project Brain integration: aligned the proposal with existing inventory
  feature documentation, ADR-009, task history, and API ownership boundaries.
