# Sales Overview Production Material And Actions Polish

## Status

Implemented and verified on 2026-09-04.

User clarification during implementation supersedes the richer item-notice
copy in phases 1 and 3: item rows show only one exact compact material badge.
They do not append coverage, configuration guidance, or Inventory actions.

Implementation resolves an available item projection with no tracked Need as
`not_required` for every item type. Every displayed item participates in the
material lookup, so an explicit tracked Need still overrides that empty-state
result even when the item has not yet been assigned.

## Objective

Make the Sales Overview Production tab communicate material state in one clear,
role-appropriate line; stop treating production-enabled services as missing
material setup; hide empty/non-meaningful Details sections; and make bulk
assignment, submission, and deletion actions visibly pending, confirmation-safe,
due-date-aware, and immediately consistent after completion.

## Assumptions

- “Notification” means the per-item material status/notice shown in the
  Production item, not the application notification inbox.
- A production-capable item and a material-required item are separate concepts.
  A service can require production work while explicitly requiring no tracked
  inventory material.
- The Inventory tab's canonical `Needs` / `Not Needed` classification is the
  primary material-applicability authority. Service item type is a safe fallback
  only when no tracked material requirement exists; an explicitly configured
  Need always wins.
- A two-step confirmation means first choosing the destructive action and then
  pressing an explicit Confirm button. It must not depend on a literal mouse
  double-click, which would be inaccessible and unreliable on touch devices.
- Existing assignment, submission, material-review, payroll, packing, dispatch,
  and fulfillment authorization rules remain unchanged.
- `SalesOrders.prodDueDate` remains the canonical order-level default for new
  production assignments under ADR-076; assignment rows retain their own
  independently editable due dates.
- The current dirty worktree belongs to concurrent/user work. Implementation
  must preserve it and reconcile overlapping edits before modifying shared
  Production files.

## Detailed Execution Plan

### 1. Lock the material-state and audience contract

1. Define one explicit item-level material applicability model:
   `required`, `not_required`, `unknown`, or `conflict`.
2. Keep work eligibility separate from material applicability. Do not infer
   material requirement from `itemConfig.production`, an existing assignment,
   or a production submission.
3. Use these presentation rules:
   - tracked Need with incomplete coverage: one actionable line such as
     `MATERIAL NEEDED · 0 OF 1 COVERED · REVIEW INVENTORY`;
   - tracked Need on inbound: one line containing remaining quantity and the
     expected arrival when available;
   - explicit Not Needed/service with no tracked Need: admin sees
     `NO MATERIAL NEEDED`, with a small Inventory repair affordance if that is
     incorrect; production-only workers see no setup warning;
   - genuine missing mapping for a material-bearing item: admin sees
     `MATERIAL SETUP MISSING · CONFIGURE IN INVENTORY`; production-only workers
     do not receive an inventory-administration task;
   - contradictory inventory/production classification: admin sees a concise
     `INVENTORY SETUP MISMATCH` line plus current coverage and an Inventory
     action; workers see only the operational availability statement;
   - material ready: retain only the compact ready state if it is still useful
     beside the production-stage badge; do not render expanded evidence.
4. Keep evidence revisions and blocker provenance in the domain/review data for
   concurrency, audits, and admin review. Remove raw hashes such as
   `Evidence a300b6bdbb` from the ordinary item UI.
5. Validate the contract against order `09556LM`: the service becomes
   not-required, while the door keeps its real `0 of 1` uncovered Need and does
   not lose that operational fact behind a generic conflict message.

### 2. Separate material applicability from production capability in the domain

1. Extend the Production material projection in
   `packages/sales/src/sales-fulfillment-plan.ts` and
   `packages/sales/src/production-v2/application/production-materials.ts` to
   retain per-sales-item applicability before tracked components are filtered
   out.
2. Resolve each item's applicability from canonical source evidence:
   - any tracked required component => `required`;
   - mapped components explicitly classified Not Needed/untracked, with no
     tracked Need => `not_required`;
   - a Services item with no tracked Need => `not_required` fallback;
   - unreadable/unavailable evidence => `unknown`;
   - genuinely contradictory source classification => `conflict`.
3. Change `buildProductionItemMaterialStatus` to accept that explicit
   applicability instead of deriving it from `configuredProduction` and
   `hasOperationalProduction`.
4. Feed the same resolver from both Production surfaces:
   - `apps/api/src/trpc/routers/sales.route.ts` for Sales Overview
     `sales.productionOverview`;
   - `packages/sales/src/production-v2/application/get-production-order-detail-v2.ts`
     for Production order detail.
5. Preserve the existing `ItemMaterialStatus` response shape when possible so
   this remains a semantic correction, not a new client API. If a new response
   field proves necessary, document it in `.brain/api/contracts.md`.
6. Add package tests for: service/no Need, service with an explicit Need,
   door with `0 of 1` coverage, explicit Not Needed, true missing setup,
   unavailable projection, and genuine conflict.

### 3. Restore a single-line item material notice

1. Replace the expanded bordered material card in
   `apps/dashboard/src/components/production-v2/item-material-status-badge.tsx`
   with a compact, wrapping, semantic status line.
2. Render the material notice once per item in
   `production/v2/production-tab-v2.tsx`; remove the duplicated header badge plus
   expanded detail treatment.
3. Keep the existing concise inbound treatment, but normalize every non-ready
   state to the same one-line visual language: status, the smallest useful
   quantity/date fact, and an admin-only Inventory action.
4. Pass the current audience (`admin` or `worker`) into the presentation helper
   so setup/mismatch language is never leaked as worker work.
5. Ensure the line wraps safely at narrow sheet widths and communicates meaning
   through text, not color alone.
6. Add focused presentation tests proving there is no raw `Evidence` label, no
   nested material card, no duplicate status, and no service `SETUP NEEDED`.

### 4. Render Details only when the item has meaningful production configuration

1. Add a pure display-config selector beside the Production V2 item document.
2. Exclude structural metadata such as `Item type` from Details; that value is
   already communicated by the item headline/subtitle.
3. Return `null` for the entire Details section and its separator when no
   substantive configuration remains.
4. Expected results:
   - Services with only `ITEM TYPE · SERVICES`: no Details section;
   - configuration-free moulding/service rows: no Details section;
   - door or moulding items with real manufacturing configuration: show only
     those useful fields;
   - Notes & activity remains available regardless of Details visibility.
5. Cover service, empty moulding, configured moulding, and configured door
   examples in a pure selector/component test.

### 5. Introduce one production bulk-action controller

1. Refactor
   `apps/dashboard/src/components/sheets/sales-overview-sheet/production-item-menu.tsx`
   so action eligibility/count derivation is a pure tested model and mutation
   state is owned by one controller.
2. Track the active action explicitly: assigning, submitting, deleting
   submissions, or deleting assignments.
3. Immediately disable every conflicting action after the first accepted click;
   mark the menu/action region `aria-busy`; and replace the active label with
   `Assigning…`, `Submitting…`, or `Deleting…` plus a spinner.
4. Keep the Assign All due-date step visible while the request is being started;
   make `Proceed` read `Assigning…`, disable it, and close/reset only after
   confirmed success. This prevents blind repeat clicks.
5. Add action-specific feedback:
   - non-expiring start feedback while the Trigger task is active;
   - success toast naming the completed action;
   - destructive/error toast with the trusted task error;
   - no generic `Success!` or misleading “assignment” error for every action.
6. Add explicit confirmation steps for bulk Delete Assignments and Delete
   Submissions. Show affected quantity/item count, Cancel, and a destructive
   Confirm button. Retain the existing single-assignment `ConfirmBtn` behavior.
7. Keep server authorization, pipeline revision checks, and submit idempotency
   authoritative. The pending guard prevents accidental duplicate starts but
   does not replace backend correctness.
8. Reset menu step, selected worker, confirmation target, and transient error
   only after success or an explicit cancel; preserve recoverable user input on
   a start failure.

### 6. Default Assign All to the order production due date

1. Read `prod.data.order.prodDueDate`, already returned by the Production
   overview, rather than initializing the bulk picker to `new Date()`.
2. Normalize the stored date through the shared production date-only helpers so
   browser and America/New_York business dates do not shift by one day.
3. When an order default exists:
   - preselect it when the Due Date step opens;
   - show a compact `Order production due date` caption;
   - keep a distinct calendar ring on that original suggested date even after
     the user selects an override.
4. When no order default exists, begin with no date selected and retain the
   explicit `No Due Date` option.
5. The chosen override applies only to the created assignments and never
   rewrites `SalesOrders.prodDueDate`.
6. Add tests for default present, default absent, manual override, No Due Date,
   and timezone-safe round trips.

### 7. Make mutation completion refresh every visible Production state

1. Stop relying on an eventual page refresh or the broad
   `useAfterTaskTrigger` listener as the only completion signal for this menu.
2. On confirmed task completion, await one scoped `sales.production.changed`
   event carrying the current order reference.
3. Directly await the current `productionOverview` refetch before clearing the
   local pending state so footer counts, item stage badges, assignment pending
   quantities, and action enablement change together.
4. Let the same scoped event refresh mounted per-item assignment providers and
   invalidate the existing registry targets: Sales Overview, Production lists,
   dashboard/summary/calendar, material status/readiness, and review detail.
5. Make `assignmentSubmissionUpdated` preserve/accept the default sales scope,
   matching `assignmentUpdated`, and await event delivery in completion paths.
6. Recompute action counts from refreshed server data; do not hand-maintain
   parallel counts or optimistically invent assignment/submission truth.
7. Keep the current five-second cross-session assignment refresh as resilience,
   but immediate same-session correctness must no longer depend on it.
8. Add integration tests that simulate assign/delete completion and assert, with
   no browser reload:
   - Assign All and Submit All eligibility changes;
   - Delete action eligibility changes;
   - item-level Assigned/assignment records update;
   - the scoped production event reaches both overview and assignment-detail
     consumers.

### 8. Validation and acceptance

1. Run the narrowest package tests for material applicability/status and
   Production V2 projection first.
2. Run focused Dashboard tests for the status line, conditional Details,
   action model/controller, due-date default, and query-event refresh.
3. Run scoped Biome, touched-file TypeScript diagnostics, and `git diff --check`.
   Run the broad Dashboard typecheck only after focused tests and report any
   unrelated existing baseline separately.
4. Authenticated admin browser acceptance on a disposable/local fixture:
   - service shows no setup warning or Details-only item type;
   - door shows the real uncovered Need in one line with no evidence hash;
   - Assign All preselects the order production due date and allows override;
   - Proceed visibly loads and cannot be double-started;
   - both delete actions require confirmation and visibly load;
   - footer counts, item badges, and assignment rows update without refresh.
5. Authenticated production-worker acceptance:
   - no service setup/mismatch administration copy;
   - genuine operational material status remains concise;
   - assignment/submission ownership and permissions remain unchanged.
6. Repeat visual/accessibility checks at desktop, 768px, and 390px, including
   keyboard navigation, focus return, touch-safe confirmation, reduced motion,
   and no horizontal overflow.
7. Do not perform destructive browser acceptance against a real operational
   order without an explicitly disposable fixture or separate user approval.

### 9. Brain documentation impact check

1. Update `.brain/features/sales-production-workspace.md` with the final
   material audience contract, conditional Details rule, bulk-action feedback,
   and immediate refresh behavior.
2. Update `.brain/features/inventory-backed-sales-fulfillment.md` if the
   canonical Needs/Not Needed applicability projection changes.
3. Update this plan, `.brain/tasks/in-progress.md` / `.brain/tasks/done.md`, and
   `.brain/progress.md` with actual implementation and validation evidence.
4. Update `.brain/api/contracts.md` only if implementation adds or changes a
   public tRPC response field. No database, migration, permission, or new ADR
   update is expected because existing ADR-035, ADR-039, ADR-063, and ADR-076
   already authorize the intended behavior.

## Skills List Used

- `plan`: structured the request as an implementation-ready phased plan without
  starting code changes.
- `from-in-app-browser`: verified the exact Production and Inventory states on
  order `09556LM` and mapped the visible behavior to its source components.
- Project Brain protocol: aligned the plan with existing Production,
  material-review, query-invalidation, and due-date decisions and persisted the
  plan for later execution.

## Risks and Mitigations

- **Not Required could hide a real unmapped Need.** Derive it from canonical
  Inventory tracking evidence first; let an explicit tracked Need override the
  service fallback; keep genuine unknown/setup states admin-visible.
- **Removing the material card could remove important facts.** Preserve the
  smallest actionable quantity, inbound date, and Inventory repair action in
  the single line; keep full evidence in the dedicated admin review workflow.
- **Conflict presentation could conceal inventory inconsistency.** Retain the
  conflict in domain/audit data and show an admin mismatch action while giving
  workers only operational availability copy.
- **Async Trigger completion could clear loading before queries refresh.** Own a
  local completion/refetch phase and clear pending only after scoped event
  delivery and the active Production overview refetch settle.
- **Duplicate assignment starts could create operational duplicates.** Disable
  synchronously on first accepted click and retain server revision/transaction
  guards; add a rapid-repeat regression test.
- **Due dates could shift across time zones.** Use the shared production
  date-only conversion helpers and test UTC/America/New_York boundaries.
- **Details filtering could remove useful door data.** Use an allow/meaningful
  selector with explicit service, moulding, and door fixtures rather than a
  blanket section-name check.
- **Current uncommitted work overlaps Production files.** Inspect and preserve
  the existing diff before implementation; make focused patches and rerun the
  affected material-review tests after any shared-file edit.
