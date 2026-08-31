# Production/Fulfillment 20-Record Query And Batch Limits (2026-08-29)

Status: Completed

## Goal

- Cap one Production Completed batch at 20 orders.
- Make Production and Fulfillment list pagination request 20 records per query.
- Surface the exact actionable server validation message when a task cannot
  start, while keeping unknown runtime failures sanitized.

## Implementation

- [x] Add a red regression for Production batches above 20 orders.
- [x] Change Production and Fulfillment page-size defaults from 50 to 20.
- [x] Preserve sanitized task errors while exposing trusted start-validation
  messages to the user.
- [x] Run focused contract/UI tests and authenticated browser QA.
- [x] Reconcile Brain feature, API, task, and progress documentation.

## Risk

- Production and Fulfillment use infinite queries in multiple tabs. Change the
  page size without changing cursor semantics or server-wide counts.
- Do not expose raw Trigger/runtime errors; only server-classified start errors
  may bypass the generic production toast.

## Result

- Production and Fulfillment operational list/search requests are bounded to
  20 records while preserving cursor-based infinite loading.
- Both durable bulk status contracts reject more than 20 unique Sales Order
  ids before enqueueing.
- Schema-owned task-start errors and explicit application errors retain their
  actionable public text; unknown failures stay on the shared generic message.
- Authenticated QA selected 40 loaded Production orders and received the exact
  20-order limit with no Trigger run or data mutation.

---

# Production Two-Row Tabs And Filters Header (2026-08-29)

Status: Completed

## Goal

- Keep the Production workspace tabs together on one horizontal row.
- Place search, active filters, and table actions on the row below, matching
  the established Sales Orders adaptive header composition.

## Implementation

- [x] Add regression coverage for adaptive custom page tabs.
- [x] Extend the shared search/filter header to stack custom tabs correctly.
- [x] Enable the adaptive layout on the Production header.
- [x] Run scoped validation, authenticated browser QA, and Brain reconciliation.

## Risk

- The shared search/filter header is used across multiple workspaces. Preserve
  the current layout unless a caller explicitly opts into adaptive page tabs.

## Result

- The adaptive header now supports caller-supplied page-tab content while
  retaining the existing saved-tab behavior for Sales Orders.
- Production opts into that layout: its tab rail owns the first row, while
  search, active filters, and column controls render below it.
- Desktop QA showed all seven tabs at `y=282` and search at `y=334`. At a
  900-pixel viewport, the three visible tabs stayed at `y=398`, the remaining
  four moved into the existing overflow control, and search started at `y=446`.
- Focused validation passed 24 tests / 51 assertions; scoped Biome and
  whitespace checks passed.

---

# Production Invoice Visibility and Filters (2026-08-29)

Status: Completed

## Goal

- Add a read-only Invoice column to the admin Production table so operators can
  see total and paid/outstanding status without leaving the queue.
- Add Invoice Status plus the applicable Sales Orders customer/order filters to
  the Production filter menu and preserve them through the production query.
- Replace generic Search fallbacks for Assigned To, Queue state, Due date,
  Material state, and Sort with semantic icons.

## Implementation

- [x] Add focused query/projection/filter/icon regressions.
- [x] Extend the production list contract and projection with invoice fields.
- [x] Add the admin Invoice column and responsive-card payment status.
- [x] Expose applicable Sales Orders filters through the Production toolbar and
  keep summary/list queries filter-consistent.
- [x] Run scoped validation, authenticated UI QA, and Brain reconciliation.

## Risk

- Production and Sales query files contain unrelated active work. Preserve
  existing batch, inventory, lifecycle, and dispatch behavior while changing
  only the read/filter projection.
- Payment status is read-only on Production; payment mutations remain owned by
  Sales Orders and Sales Overview.

## Result

- Admin Production rows now show invoice total plus Paid, Outstanding, or Not
  set status on table and mobile-card layouts; production-worker views remain
  finance-free.
- Production supports Customer, Phone, P.O., Sales Rep, Order #, Item, and
  Invoice Status filters in addition to its operational filters. Paid and
  Outstanding filter through the same URL/query contract used by list and
  summary reads.
- Assigned To, Queue state, Due date, Material state, and Sort now render
  semantic icons instead of the generic Search fallback.
- Focused validation passed 39 tests / 119 assertions, scoped Biome passed for
  the changed production/UI files, and whitespace validation passed.
- Authenticated browser QA confirmed the Invoice column, Paid row states, the
  expanded filter menu, and distinct filter icons. A subsequent reload exposed
  an unrelated pre-existing missing dispatch-manifest module, so the final
  Outstanding click-through could not be repeated after reload.

---

# Tables-2 Selection Checkbox Alignment (2026-08-29)

Status: Completed

## Goal

- Match every restarted `tables-2` selection column to the canonical Sales
  Orders V2 header/body checkbox alignment.
- Keep selection columns fixed, centered, and non-reorderable without adding
  page-specific offsets.

## Implementation

- [x] Add a shared alignment regression for default and compact table density.
- [x] Center checkbox descendants through the shared table-cell padding
  contract used by headers and virtual rows.
- [x] Repair selection-column ordering/stickiness in inventory Backorders and
  Partial Shipments.
- [x] Run the restarted-table suite, scoped formatting/type validation, browser
  QA, and Brain documentation reconciliation.

## Risk

- The worktree contains unrelated Sales/Production changes. Restrict edits to
  the table-core alignment seam, the two inconsistent inventory table configs,
  focused tests, and documentation.

## Result

- The shared table-cell contract centers checkbox descendants and removes their
  asymmetric horizontal padding in both default and compact density.
- All 24 restarted tables that declare a selection column are now audited to
  keep that column sticky and non-reorderable.
- Inventory Backorders and Partial Shipments now render their actual select-all
  controls through their custom headers and keep header/body selection cells in
  one vertical line.
- Focused validation passed 19 tests / 164 assertions. The broader Tables V2
  run passed 337 of 349 tests; its 12 failures are existing stale route/count
  parity assertions outside these files. Dashboard typecheck also remains on
  the repository's existing broad baseline.
- Authenticated browser QA confirmed aligned header/body checkboxes on
  Production and Inventory Backorders without mutating selection or records.

---

# Production Mark-All Terminal Order Skip Fix (2026-08-29)

Status: Completed

## Goal

- Allow Production `Mark all` → `Production completed` to finish even when a
  selected legacy row has already been fulfilled.
- Use canonical delivery evidence consistently in the Production queue,
  dependency resolver, and durable parent task.
- Skip orders already past production completion before any inventory,
  inbound, or production-review mutation.

## Implementation

- [x] Add focused regressions for stale production stats plus completed delivery
  evidence and authoritative dependency filtering.
- [x] Correct the Production read model and shared completion predicate.
- [x] Filter dependency work and parent-task candidates using canonical
  fulfillment evidence.
- [x] Run focused tests, type checks, authenticated batch QA, and reconcile Brain
  documentation.

## Root cause

- Order `07471PC` is still projected as `in_production` from legacy order/stat
  fields, while its actual completed delivery makes inventory read-only.
- The one-click dependency resolver therefore attempts to mark inventory
  available for an already fulfilled order and aborts the entire selected set.

## Result

- Production queue projection, dependency resolution, and the durable bulk
  parent now use canonical completed-delivery evidence.
- Already-completed or fulfilled orders are removed before inventory and review
  work; the parent independently rechecks the same evidence before child runs.
- Authenticated QA selected all 40 loaded Past Due rows and completed the batch
  in one monitored run. Past Due refreshed from 1,058 to 1,018.
- 35 focused tests / 69 assertions, scoped Biome, and whitespace validation
  passed. Sales/Jobs typechecks retain only unrelated repository baseline
  diagnostics.

---

# Inventory Attention Dialog Outside Dismissal (2026-08-29)

Status: Completed

## Goal

- Allow the shared `Inventory and production need attention` modal to close when
  the user clicks outside it.
- Preserve the existing in-flight lock while dependency resolution is running.

## Implementation

- [x] Add scoped backdrop dismissal to the shared Sales Mark-as dialog.
- [x] Cover idle dismissal and the resolving guard with a focused regression.
- [x] Verify backdrop dismissal on the authenticated Production page.
- [x] Record Brain documentation impact and validation.

## Result

- The shared alert-dialog content now supports optional overlay props, and the
  inventory-attention flow opts into backdrop pointer dismissal.
- Outside dismissal remains disabled while `Receive, approve and continue` is
  resolving inventory and production dependencies.
- Focused regressions, scoped formatting, whitespace validation, and
  authenticated browser QA passed without starting a live batch action.

---

# Shared Sales/Production Batch Status Actions

Date: 2026-08-29
Status: Completed

Plan:
- Add admin-only row selection to the canonical Sales Production table and its
  responsive cards.
- Reuse the canonical Sales Orders `SalesMenu.MarkAs` workflow from the
  Production batch bar and row actions.
- Resolve an eligible order subset per batch action so production-completed or
  fulfilled orders are skipped before inventory preflight and task dispatch.
- Apply the same skip policy to Sales Orders batch actions.
- Add focused selection, table-parity, and production-lifecycle coverage, then
  update Brain documentation.

Validation:
- Focused dashboard batch-selection and Sales Production table tests.
- `packages/sales/src/sales-production.test.ts`.
- Targeted Biome/typecheck where practical and `git diff --check`.

Progress:
- [x] Read the existing Production table, Sales Orders bottom bar, canonical
  Mark-as workflow, lifecycle model, and relevant Brain documentation.
- [x] Add failing focused coverage for batch eligibility and Production parity.
- [x] Implement shared skip behavior and Production selection UI.
- [x] Run validation and reconcile Brain documentation.

Risks:
- The worktree contains unrelated in-progress dispatch/packing changes,
  including changes in `sales-menu.tsx`; preserve those edits exactly.
- Production-worker routes must not gain admin batch controls.
- Skipped terminal orders must never reach inventory preflight, dispatch
  creation, or sales-control task dispatch.

Result:
- Admin Production supports accessible desktop and mobile selection with a
  floating shared status-action bar; worker tables remain unchanged.
- Sales Orders and Production use one eligible-subset policy before preflight
  and monitored task dispatch.
- Focused tests, targeted Biome, whitespace checks, changed-path typecheck
  review, and authenticated no-mutation browser QA passed.

---

# View-Prefixed Mark Sales Order Fulfilled Permission

Date: 2026-08-24
Status: Completed

Plan:
- Replace the standalone `markSalesOrderFulfilled` capability with the
  view-prefixed `viewMarkSalesOrderFulfilled` capability and persist
  `view mark sales order fulfilled` through the normal permission editor path.
- Preserve legacy direct grants as a temporary authentication alias and migrate
  them to the canonical view-prefixed permission when a role or employee is
  next saved.
- Apply the renamed capability consistently at dashboard, API, task-dispatch,
  and terminal sales-control boundaries without granting order editing or
  dependency-manager authority.
- Update focused permission contracts and Brain documentation.

Validation:
- Focused auth, role/employee editor, dashboard, API-boundary, and sales-control
  permission tests.
- Targeted old-symbol scan and `git diff --check` for touched files.

Progress:
- [x] Confirmed the prior direct permission and historical role-editor binding
  mismatch.
- [x] Defined the canonical view-prefixed permission and compatibility path.
- [x] Implement shared auth, editor migration, and authorization-boundary changes.
- [x] Update focused tests and Brain documentation.
- [x] Run lightweight focused validation and reconcile the diff.

Risks:
- Existing direct grants must continue working until their role or employee
  record is saved into the canonical view-prefixed form.
- Fulfillment dependency resolution must retain its additive order, inbound,
  and production edit checks.

Result:
- Canonical authorization now uses `viewMarkSalesOrderFulfilled` and the
  `view mark sales order fulfilled` permission record at every fulfillment
  boundary.
- Role and employee editors expose View with no Edit control; legacy direct
  grants remain valid and migrate on save.
- Focused validation passed 65 tests / 382 assertions.

---

# Headless Legacy Inventory Adaptation

Date: 2026-08-24
Status: In Progress

Plan:
- Persist legacy adaptation lifecycle through the existing sales inventory
  projection and run it in a bounded, authorization-checked Trigger task.
- Queue recognized legacy status adaptation only after a successful save and
  let save navigation continue after task acceptance; keep the ordinary
  Configure Inventory modal for non-legacy orders.
- Replace Inventory-tab open-time mutation with persisted background state plus
  explicit Run/Retry recovery actions.
- Monitor the task across navigation and invalidate order, overview, inventory,
  inbound, and Sales Orders queries at completion.
- Prove zero-row `AVAILABLE`, inbound materialization, stale revision,
  authorization, idempotency, save routing, durable failure, and browser
  behavior before deploying the worker and dashboard in that order.

Validation:
- Focused `@gnd/sales`, `@gnd/jobs`, dashboard action/component, and task-monitor
  tests covering the approved seams.
- Scoped package typechecks and final relevant-suite validation.
- Authenticated in-app browser acceptance on order `09405PC` plus Trigger and
  Vercel canary review.
- Scoped code review and `git diff --check`.

Progress:
- [x] Confirmed the endless spinner is a client-only attempt marker combined
  with a missing durable `ready/0` projection.
- [x] Confirmed current checkout, applicable repository rules, and approved
  public test seams.
- [ ] Establish failing focused tests.
- [ ] Implement the worker, durable projection helper, stale guards, queue
  boundary, and persisted monitor intent.
- [ ] Update both save flows and the Inventory-tab recovery UX.
- [ ] Validate, review, document, commit, deploy, and canary.

Risks:
- Existing production-like orders must not be mutated during automated tests;
  browser mutation remains limited to the explicitly supplied `09405PC` flow.
- A queued task must become stale before any inventory, inbound, projection
  success, or history write if a newer save supersedes its revision.
- Worker deployment must precede application code that can enqueue the new task.

---

# Sales Payment Date Super Admin Access

Date: 2026-08-21
Status: Completed

Plan:
- Define one exact `Super Admin` role rule for selecting a manual payment date.
- Hide the date control for all other staff and let the payment-method control use the reclaimed width.
- Clear/omit unauthorized client date state and reject forged payment-date input at the protected payment mutation boundary.
- Add focused role, API-boundary, and UI contract coverage.
- Update Sales Payment feature and API permission documentation.

Validation:
- `bun test packages/sales/src/payment-system/domain/payment-date.test.ts`
- `bun test apps/api/src/utils/sales-payment-date-access.test.ts`
- `bun test apps/dashboard/src/components/widgets/sales-payment-processor/payment-date-control.contract.test.ts`
- `git diff --check`

Progress:
- [x] Confirmed the date control and payment mutation currently have no role gate.
- [x] Add the shared role rule and protected API enforcement.
- [x] Restrict and reflow the dashboard payment UI.
- [x] Run focused validation and reconcile Brain documentation.

---

# Vercel Cost Controls, Liveness, And Fluid Canary Execution

Date: 2026-08-21
Status: In Progress

Plan:
- Add a repeatable Vercel current-cycle cost snapshot that separates fixed
  subscriptions from infrastructure, evaluates the $8/$12/$16/$18 guardrails,
  and reports daily/projected burn.
- Add a public, database-free `GET /api/health/live` endpoint and focused route
  coverage so Sentry can stop probing the authenticated root/login flow.
- Enable Fluid Compute in the dashboard deployment config, validate it in an
  isolated preview, and preserve a one-line rollback.
- Repoint the Sentry uptime monitor to the liveness endpoint at a lower
  frequency once authenticated Sentry access is available.
- Record measured evidence and remaining production gates in Brain.

Validation:
- `bun test scripts/vercel-cost-snapshot.test.ts`
- `bun test apps/dashboard/src/app/api/health/live/route.test.ts`
- `bun test scripts/vercel-deployment-boundary.test.ts`
- `bun --filter @gnd/dashboard typecheck`
- Preview deployment and HTTP smoke for `/api/health/live`
- `git diff --check`

Progress:
- [x] Confirmed current billing-cycle infrastructure usage is $3.95, native
  75%-of-credit web/email notifications are already enabled, and dashboard
  traffic owns nearly all attributable infrastructure usage.
- [x] Establish the cost snapshot and threshold validation harness.
- [ ] Accumulate comparable 24-hour and seven-day route duration, invocation,
  error, timeout, and memory evidence.
- [x] Implement and validate the public liveness route.
- [x] Enable and preview-canary Fluid Compute.
- [ ] Repoint Sentry uptime monitoring and verify one invocation per check.
- [x] Complete code review and Brain reconciliation.
- [ ] Complete the 12-24-hour canary gate, then explicitly promote and repoint
  Sentry in production.

---

# Sales Orders Filtered Excel Export Execution

Date: 2026-07-10
Status: Completed

Plan:
- Add a focused export mapping helper and tests for Sales Orders V2 rows.
- Track selected numeric sales IDs from the Sales Orders V2 table so the header can export selected rows.
- Add the filtered/selected Excel report button to the Sales Orders V2 header, using the existing `sales.getOrders` API and lazy `xlsx-js-style` import.
- Update Brain docs after implementation, then run the narrow export test and review the diff before committing.

Validation:
- `bun test apps/dashboard/src/components/sales-orders-export.test.ts`
- `bunx biome check --formatter-enabled=false apps/dashboard/src/components/sales-orders-export.ts apps/dashboard/src/components/sales-orders-export.test.ts apps/dashboard/src/components/sales-orders-v2-export.tsx apps/dashboard/src/components/sales-orders-v2-header.tsx apps/dashboard/src/components/tables-2/sales-orders/data-table.tsx apps/dashboard/src/store/sales-orders.ts`
- `git diff --check`

---

# Sales Form Office/Dealer Shareability Execution

Date: 2026-05-24
Status: Completed

## Goal

Implement the office/dealer sales-form cleanup so `@gnd/sales/sales-form` owns
portable contracts, shared schemas, pricing composition, workflow capability
gating, and reusable adapter helpers while `www` and dealership keep only
host-owned UI and routing.

## Execution Rules

- Keep moving through all phases unless a directly related test/gate fails.
- Keep `bun run test:new-sales-form-migration` as the primary migration gate.
- Preserve rollback controls until browser QA and rollback signoff are complete.
- Do not remove legacy `www` workflow fallback in this pass.

## Checklist

- [x] Restore safe `www` package-panel default.
- [x] Make `SalesFormEnginePanel` the documented shared entrypoint.
- [x] Add shared runtime schemas for sales-form payloads.
- [x] Reuse shared schemas in dealer save input.
- [x] Centralize dealer pricing/save composition in the shared sales-form package.
- [x] Keep DB query modules persistence-focused where feasible.
- [x] Consolidate repeated workflow adapter helpers.
- [x] Move dealer state/payload normalization toward shared package utilities.
- [x] Add/extend contract and parity tests.
- [x] Run focused migration gate.

## Results

- `@gnd/sales/sales-form` now exports shared portable Zod schemas, dealer quote
  record/save/payload composition, dealer quote pricing snapshots, and workflow
  image resolver helpers.
- Dealer quote saving now routes through `apps/api/src/db/queries` so the API
  layer can compose shared sales-form pricing while still using DB persistence
  and dealer visibility checks.
- `apps/dashboard` defaults the package workflow panel to legacy unless explicitly
  opted into `package`.
- The dealership app now delegates dealer quote state hydration, line creation,
  pricing, and save payload mapping to package helpers.

## Notes

- Browser QA is still a separate external gate if local auth/MySQL is unavailable.
- `www` legacy/package switch remains available through env, URL override, and
  local storage until production signoff.
- `bun run test:new-sales-form-migration` passed with 88 sales package tests,
  19 dealer persistence tests, dealership typecheck, and the tolerated `www`
  baseline check.
- Full `@gnd/api` typecheck still has existing unrelated workspace failures; a
  filtered check found no errors in the touched API route/schema/query files.

---

# WWW Unused/Old Code Cleanup Continuation

Date: 2026-06-18
Status: Awaiting production environment approval

## Goal

Continue the conservative `apps/dashboard` unused/old-code cleanup from the current
Knip baseline without widening scope or deleting live compatibility code.

## Execution Rules

- Let Knip identify candidates, then require exact path/symbol scans before
  deleting tracked files.
- Keep tests and sales/payment/production/customer/inventory flows unless a
  candidate is proven detached.
- Use lightweight validation only: focused `rg`, refreshed file-only Knip
  snapshot, and scoped whitespace/diff checks.

## Current Slice

- [x] Verify the app-side clean-code production list/action utility pair.
- [x] Delete only files with clean exact-reference scans.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the slice result.

## Follow-On Slice

- [x] Verify the remaining app-side sales/production helper island.
- [x] Delete only detached helpers while keeping tested production assignment code.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new 96-candidate baseline.

## Current Action Slice

- [x] Verify old action leaves and test-read false positives.
- [x] Delete only detached action files while keeping test-read fallback code.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## Second Action Slice

- [x] Verify standalone sales action leaves.
- [x] Delete only app-local actions with no live imports.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## V1 Sales Action Island Slice

- [x] Verify old `app-deps/(v1)/(loggedIn)/sales/_actions` leaves.
- [x] Delete only the self-contained v1 sales action island.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## V1 Sales Customer Island Slice

- [x] Verify remaining old v1 sales customer/type files.
- [x] Delete only the self-contained customer/type island.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## V1 Utility Helper Slice

- [x] Verify old app-deps wallet/settings/progress/pagination helpers.
- [x] Delete only detached v1 utility helpers.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## Root Dispatch Utility Slice

- [x] Verify the root `utils/db/where.dispatch.ts` helper is detached.
- [x] Delete only the root duplicate while keeping live dispatch query helpers.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## App-Local Trigger Email Slice

- [x] Verify the app-local Trigger/email v3 chain is detached from deployment config.
- [x] Delete only the duplicate app-local task/template/resend files.
- [x] Confirm `@gnd/jobs` owns the live `send-composed-email` task.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## Dyke Step Component Action Slice

- [x] Verify old app-local step-component actions are detached from imports.
- [x] Delete only the unused action pair and their private schema exports.
- [x] Confirm the active save/pricing path remains in `@gnd/inventory` via inventories tRPC.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## Duplicate Legacy Step Hook Slice

- [x] Verify the app-deps duplicate `legacy/use-dyke-form-step` hook has no imports.
- [x] Delete only the duplicate app-deps hook while keeping the live app-side hook.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## App-Deps Sales Form UI Leaf Slice

- [x] Verify the old app-deps sales-form UI leaves have no live imports.
- [x] Delete only the detached `component-section-footer`, old `custom-component`, and `data-page/line-input` leaves.
- [x] Keep similarly named live action/shared line-input files.
- [x] Refresh the Knip file-candidate snapshot to the 53-candidate baseline.
- [x] Update Brain report/progress with the new baseline.

## App-Deps Modal Leaf Slice

- [x] Verify orphan `deps-modal` and `height-settings-modal` files have no live imports.
- [x] Delete only the detached modal pairs.
- [x] Keep separate live `component-deps-modal` files.
- [x] Refresh the Knip file-candidate snapshot to the 49-candidate baseline.
- [x] Update Brain report/progress with the new baseline.

## Step Component Wrapper Follow-On Slice

- [x] Verify `step-component-modal` wrapper/hook files have no external opener.
- [x] Delete only the detached wrapper/hook and follow-on orphan search/render-form helpers.
- [x] Keep live `component-deps-modal` and step-products helpers.
- [x] Refresh the Knip file-candidate snapshot to the 45-candidate baseline.
- [x] Update Brain report/progress with the new baseline.

## App-Deps Remaining Form Leaf Slices

- [x] Verify orphan `doors-modal` and private `step-products/product` helper have no live imports.
- [x] Delete only the detached door selector pair while keeping the step-products type barrel.
- [x] Verify duplicate app-deps step/pricing use-case and data-access copies have no live imports.
- [x] Delete only the duplicate app-deps use-case/data-access chain while keeping app-side live copies.
- [x] Verify detached hook/context leaves and empty `hpt-helper` have no live imports.
- [x] Keep live `legacy-dyke-form-helper`, `data-store`, `legacy-hooks`, and `component-deps-modal`.
- [x] Refresh the Knip file-candidate snapshot to the 35-candidate baseline.
- [x] Update Brain report/progress with the new baseline.

## Customer Data And Duplicate Hook Slice

- [x] Verify `CustomerDataSection` customer data island has no live imports.
- [x] Delete only the detached component and private customer data/cache actions.
- [x] Switch `legacy-dyke-form-helper.tsx` to app-side sales-form hook type imports.
- [x] Delete duplicate app-deps `data-store` and `legacy-hooks` type-source files.
- [x] Refresh the Knip file-candidate snapshot to the 30-candidate baseline.
- [x] Update Brain report/progress with the new baseline.

## Payment Resolution Island Slice

- [x] Verify `resolvePaymentAction` has no live imports or action references.
- [x] Verify `delete-payroll.ts` is private to the detached action island.
- [x] Delete only the detached payment-resolution action/helper pair.
- [x] Keep production-control reset files because the regression test reads them directly.
- [x] Refresh the Knip file-candidate snapshot to the 28-candidate baseline.
- [x] Update Brain report/progress with the new baseline.

## Rootless Legacy Dyke Form Chain Slice

- [x] Verify legacy Dyke form hooks/contexts have no live providers or callers.
- [x] Verify app-deps step action/helper/modal files are only referenced inside the same rootless island.
- [x] Verify the app-deps step-products type barrel is private to the deleted island.
- [x] Delete only the rootless legacy Dyke form compatibility chain.
- [x] Keep separate current `zus-step-helper` imports used by active sales-form components.
- [x] Refresh the Knip file-candidate snapshot to the 20-candidate baseline.
- [x] Update Brain report/progress with the new baseline.

## Retained Tail Classification

- [x] Classify remaining file-only Knip candidates after the 20-candidate baseline.
- [x] Confirm 16 remaining candidates are tests and retained by default.
- [x] Confirm 3 remaining production-control files are read directly by `production-control-reset.test.ts`.
- [x] Confirm `styles/globals.css` is tooling-backed by `apps/dashboard/src/components.json` even though it is not runtime-imported.
- [x] Record that no further conservative tracked-file deletion remains without deleting tests or making a tooling/regression-coverage decision.

## Package Dependency Cleanup Slice

- [x] Refresh full Knip issue snapshot including dependencies, unlisted, unresolved, and exports.
- [x] Exact-scan high-confidence stale dependency candidates before package edits.
- [x] Remove unused `@gnd/dashboard` package declarations for old GitHub actions, Cloudinary React helpers, MDX/MDX editor packages, accidental `crypto`/`i`/`npm`, `resend`, and `@types/mdx`.
- [x] Refresh `bun.lock` with `bun install --lockfile-only`.
- [x] Refresh full Knip snapshot to the 39 runtime / 3 dev dependency baseline.
- [x] Update Brain report/progress with the dependency cleanup result.

## Package Dependency Cleanup Slice 2

- [x] Exact-scan the remaining 39 runtime dependency candidates against `apps/dashboard` imports and config.
- [x] Remove only package declarations with no direct `apps/dashboard` import/config owner.
- [x] Remove the stale commented `@gnd/events/client` layout import left behind by the dependency cleanup.
- [x] Delete old unreferenced `apps/dashboard/tailwind-copy.config` and remove its private plugin deps.
- [x] Remove unused package-local `vercel` CLI dev dependency while keeping Vercel runtime packages.
- [x] Keep tooling-sensitive candidates for separate review: `eslint`, `eslint-config-next`, `puppeteer-core`, and `tailwindcss`.
- [x] Refresh `bun.lock` with `bun install --lockfile-only`.
- [x] Refresh full Knip snapshot to the 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the dependency cleanup result.

## Unresolved Import Cleanup Slice

- [x] Inspect the five remaining Knip unresolved import candidates.
- [x] Confirm the affected legacy sales type files are still live through old sales-form paths.
- [x] Retarget stale `@/app/(v2)/(loggedIn)/sales-v2/type` imports to the existing app-deps path.
- [x] Replace deleted private v2 form-action imports with a local structural legacy form type.
- [x] Refresh full Knip snapshot to the 0 unresolved import baseline.
- [x] Update Brain report/progress with the unresolved cleanup result.

## Unlisted Dependency Cleanup Slice

- [x] Verify `server-only` is imported directly by `apps/dashboard` server-only modules.
- [x] Add `server-only` to `@gnd/dashboard` dependencies.
- [x] Refresh `bun.lock` with `bun install --lockfile-only`.
- [x] Refresh full Knip snapshot to the 0 unlisted dependency baseline.
- [x] Update Brain report/progress with the unlisted cleanup result.

## Retained Tooling Candidate Decision

- [x] Verify `eslint` and `eslint-config-next` are retained for package/root lint workflows.
- [x] Verify `puppeteer-core` is retained by Next `serverExternalPackages`.
- [x] Verify `tailwindcss` is retained for Tailwind/PostCSS/shadcn tooling.
- [x] Record the retained-tooling rationale in the cleanup report.

## Export Candidate Triage Slice 1

- [x] Inspect low-risk auth/routing/test-backed export candidates.
- [x] Retain exports that are imported by focused tests.
- [x] Remove only verified unused auth exports: `emptyAuthSnapshot`, `signOut`, and exported `AUTH_LOGIN_ROUTE`.
- [x] Refresh full Knip snapshot to the 550 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 2

- [x] Exact-scan routing, sales-print, payment, and new-sales-form export candidates.
- [x] Demote local-only helpers instead of changing runtime behavior.
- [x] Remove unreferenced new-sales-form hooks/mapper wrappers and unused sales-print wrapper functions.
- [x] Retain test-facing exports in auth, routing, local recovery, payment preview, and sales-print access code.
- [x] Refresh full Knip snapshot to the 525 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 3

- [x] Exact-scan small utility/component export candidates.
- [x] Remove definition-only utility exports while keeping still-imported module helpers.
- [x] Remove now-unused `@date-fns/tz` from `@gnd/dashboard` and refresh `bun.lock`.
- [x] Demote or remove local-only component exports without changing live imports.
- [x] Refresh full Knip snapshot to the 503 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 4

- [x] Exact-scan module-live export candidates where files still have active imports.
- [x] Remove only dead exports from task notification, unit-invoice report definitions, employee list, and community project analytics modules.
- [x] Delete the unmounted debug modal and follow-on `use-debug-params` leaf.
- [x] Refresh full Knip snapshot to the 498 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 5

- [x] Exact-scan filter/query-param hook export candidates.
- [x] Demote private schemas while preserving live hook and loader exports.
- [x] Remove unreferenced inventory/sales-print loaders and duplicate customer-filter inbound view export.
- [x] Remove dead static-trpc path/invalidate helpers while keeping legacy `_trpc` / `_qc` globals.
- [x] Refresh full Knip snapshot to the 482 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 6

- [x] Exact-scan schema/constants/helper export candidates.
- [x] Demote local-only auth schemas and keep live auth form schemas.
- [x] Remove unused legacy payment, dispatch, HRM, numeric, and currency helper exports.
- [x] Demote `queryMeta` and remove stale constants/type exports.
- [x] Refresh full Knip snapshot to the 469 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 7

- [x] Exact-scan small UI/context/table export candidates.
- [x] Demote local-only context and component helper exports while keeping providers, hooks, and compound components live.
- [x] Remove unused Midday search-filter exports, stale table hook/aliases, and duplicate legacy sales-orders columns.
- [x] Delete the unused generic `tables-2/core` bottom bar after confirming migrated tables use domain-specific bottom bars.
- [x] Refresh full Knip snapshot to the 448 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 8

- [x] Exact-scan small helper export candidates.
- [x] Demote local-only status/id/loader/note context helpers behind live public wrappers.
- [x] Remove the unused dev-flow `logError` wrapper while keeping active flow logger exports.
- [x] Refresh full Knip snapshot to the 443 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 9

- [x] Exact-scan small clean-code UI and helper export candidates.
- [x] Demote local-only combo-box/table, sales-form, shelf, door, product variant, and sales-meta helpers.
- [x] Remove definition-only upload/task-monitor helpers and unused `_v1/icons` `Icon` re-export.
- [x] Refresh full Knip snapshot to the 428 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 10

- [x] Exact-scan legacy clean-code sales-form modal export candidates.
- [x] Demote local-only `useInitContext` helpers while keeping live modal opener exports.
- [x] Demote unused modal component default/named exports and keep directly imported `door-size-modal` default export.
- [x] Refresh full Knip snapshot to the 413 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 11

- [x] Exact-scan sales DTO and utility mirror export candidates.
- [x] Remove empty `salesStatisticDto` stubs from app/app-deps mirrors.
- [x] Demote private DTO/dispatch helpers while preserving the live app-deps delivery helper import.
- [x] Refresh full Knip snapshot to the 404 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 12

- [x] Exact-scan low-risk UI/table export candidates.
- [x] Delete unused page-tab TRPC wrapper file while keeping live `PageTabs` barrel export.
- [x] Demote private scroll-header constants and remove unused aggregate table config accessor.
- [x] Refresh full Knip snapshot to the 394 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 13

- [x] Exact-scan clean-code data-table and sales utility export candidates.
- [x] Demote private search-param parser/schema internals while keeping live parser/cache/serializer/type exports.
- [x] Remove unused duplicate `composeStepFormDisplay` helpers from app/app-deps sales step utility mirrors.
- [x] Demote item-control UID implementation helpers and remove the unused app-side shelf/generate helper path while keeping the live app-deps generate export.
- [x] Refresh full Knip snapshot to the 386 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 14

- [x] Exact-scan clean-code utility, table-settings, and percentile export candidates.
- [x] Remove unused duplicate `dotArray` / `dotKeys` helpers while preserving live `dotObject` / `dotSet` utility exports.
- [x] Demote table-settings default helpers behind exported `mergeWithDefaults`.
- [x] Remove dead percentile value helpers while keeping the type export used by data-table query options.
- [x] Refresh full Knip snapshot to the 376 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 15

- [x] Exact-scan barrel and internal-helper export candidates.
- [x] Demote email composer primitives behind the exported `mailComposer` object.
- [x] Trim notification-center and table-core barrel re-exports while keeping live public barrel entries.
- [x] Demote community-template v1 `FormSection` / `styler` internals while keeping concrete section exports.
- [x] Refresh full Knip snapshot to the 366 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 16

- [x] Exact-scan v2 unit invoice/production table export candidates.
- [x] Remove unused `projectTabColumns` and card component exports from the v2 unit table column modules.
- [x] Preserve live table `columns`, row types, and row id helpers imported by current skeleton/store/data-table modules.
- [x] Refresh full Knip snapshot to the 362 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 17

- [x] Exact-scan private helper export candidates.
- [x] Demote custom-component combobox and model-install context internals while preserving live public builders/providers/hooks.
- [x] Demote sidebar access-rule plumbing and remove unused active-link helper.
- [x] Remove unused debug-toast hook/helper while keeping `useDebugConsole`.
- [x] Refresh full Knip snapshot to the 354 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 18

- [x] Exact-scan legacy helper export candidates.
- [x] Remove unused packing item context exports while keeping the live packing provider/hook.
- [x] Remove unused legacy Redux dispatch/static-list/navigation helper exports and stale breadcrumb while keeping the store reducer and live transform helper.
- [x] Remove old unreferenced app-local DB query-builder/search helpers while keeping `transformDate`.
- [x] Refresh full Knip snapshot to the 346 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 19

- [x] Exact-scan dashboard params and app-local sales-control utility exports.
- [x] Demote dashboard date/default-param internals while preserving live dashboard public APIs.
- [x] Remove unused app-local sales-control stat composer and private-only quantity helpers while preserving live quantity exports.
- [x] Remove the follow-on app-deps `generateItemControlUid` helper that only fed the deleted path.
- [x] Refresh full Knip snapshot to the 337 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 20

- [x] Exact-scan old static-data hooks, note/community helpers, filter-command helpers, and app-local sales data access.
- [x] Trim `_v2` static-data hooks to the live `useBuilders` export and delete now-orphan static-loader action files.
- [x] Remove unused note/community helper exports while preserving live note tag and community model/search helpers.
- [x] Remove the detached sales filter preset/type island while preserving the live `__findFilterField` import.
- [x] Delete the old app-local `data-access/sales.ts` module and remove its now-dead legacy date query helper.
- [x] Refresh full Knip snapshot to the 302 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 21

- [x] Exact-scan raw data-table/community-template context exports and legacy utility helper exports.
- [x] Demote raw React context exports while preserving provider and hook exports.
- [x] Demote the local-only clean-code `useDataTable` implementation export.
- [x] Remove unused v1 action utility exports and root sales utility helper exports while preserving live neighboring APIs.
- [x] Refresh full Knip snapshot to the 288 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 22

- [x] Exact-scan action/static helper exports with no current imports.
- [x] Remove unused cached sales-accounting filter, sidebar auth override, token validation, static tRPC bootstrap, and single-query tRPC prefetch exports while preserving live sibling APIs.
- [x] Demote file-local role creation, takeoff root-component loading, and sales-settings tag constants.
- [x] Convert value-dead `salesHaving` to the still-live type-only `SalesHaving` union.
- [x] Refresh full Knip snapshot to the 279 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 23

- [x] Exact-scan utility DB query-builder exports and shared `lib/utils.ts` export candidates.
- [x] Demote internal DB `where*` helpers and the sales search parser while preserving live metadata/query exports.
- [x] Remove unused `mergePermissionsQuery` while preserving `whereUsers`.
- [x] Remove unused shared utility exports and demote `removeEmptyValues` to private use by `transformData`.
- [x] Refresh full Knip snapshot to the 248 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 24

- [x] Exact-scan chat barrel, old sales-accounting table, v1 cache helper, and old sales overview data-access candidates.
- [x] Trim unused chat barrel and legacy sales-accounting table column exports while preserving live imports.
- [x] Remove obsolete v1 cache read/write helpers while preserving `_cache`.
- [x] Delete the old sales overview data-access/type utility pair and remove the now-stranded app-deps `SalesIncludeAll` include object.
- [x] Refresh full Knip snapshot to the 242 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 25

- [x] Exact-scan clean-code DB utility include/date helper candidates in app and app-deps mirrors.
- [x] Remove unused infinite-list, Dyke-form include, app-side `SalesIncludeAll`, and app-side `composeQuery` export surfaces while preserving live include/filter imports.
- [x] Remove unused generic date helper exports while keeping app-deps `anyDateQuery` and pagination helpers that still have callers.
- [x] Demote the step price count include to file-local use by `SalesBookFormIncludes`.
- [x] Refresh full Knip snapshot to the 227 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 26

- [x] Exact-scan utility/action helper export candidates in sales utility mirrors, cached HRM, v1 session utilities, generic DB utils, and sales-form helper code.
- [x] Remove unused exports while preserving live sales status/sort/URL/payment helpers, permissions cache, session/user/auth ID helpers, and current pagination imports.
- [x] Remove the now-unused `bcrypt-ts` app dependency after exact source scans found no remaining `apps/dashboard` import.
- [x] Refresh split Knip snapshots to the 208 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 27

- [x] Exact-scan legacy `_v1` table helper export candidates in row actions, base columns, and follow-on color helpers.
- [x] Remove unused row-action wrapper exports while preserving live `DeleteRowAction` and `MenuItem`.
- [x] Remove unused old base-column helper exports while preserving live `Cell`.
- [x] Remove the follow-on unused `getBadgeColor` / `statusColor` helper path.
- [x] Refresh split Knip snapshots to the 194 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 28

- [x] Exact-scan legacy community unit modal, invoice item component slice, and sales type re-export candidates.
- [x] Demote the unused `HomeModal` default export while preserving the live `useHomeModal` opener.
- [x] Remove unused invoice item component action creator exports while preserving the mounted reducer.
- [x] Remove the unused app-side `HousePackageToolMeta` re-export while preserving file-local type use and the app-deps type surface.
- [x] Refresh split Knip snapshots to the 185 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 29

- [x] Exact-scan legacy Cloudinary and revalidate helper exports.
- [x] Remove the unused no-op Cloudinary `saveToDatabase` export while preserving live `getSignature`.
- [x] Remove the unused raw `__revalidatePath` export while preserving live keyed `_revalidate`.
- [x] Refresh split Knip snapshots to the 183 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 30

- [x] Exact-scan old v1 community builder/project action exports and v1 action pagination utilities.
- [x] Remove unused builder table/task mutation exports while preserving live `staticBuildersAction`.
- [x] Remove unused community project table/update wrappers while preserving live `saveProject`, `staticProjectsAction`, and `updateProjectMeta`.
- [x] Remove follow-on unused `queryFilter` / `getPageInfo` v1 action utilities while preserving live date helpers.
- [x] Refresh split Knip snapshots to the 174 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 31

- [x] Exact-scan old v1 auth, notification, community-template, and follow-on utility exports.
- [x] Remove unused legacy auth reset/login exports while preserving live reset-request, email-login-link, and quick-login helpers.
- [x] Remove unused old notification action exports while preserving live `INotification` and `_notify`.
- [x] Remove unused old community-template mutation/import exports while preserving live `staticCommunity`.
- [x] Remove follow-on unused app-local community cost/pivot and numeric helper exports.
- [x] Refresh split Knip snapshots to the 153 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 32

- [x] Exact-scan old sales-form wrapper and step-helper export candidates.
- [x] Demote the app-local `getSalesBookFormUseCase` value export while preserving the live `GetSalesBookForm` type surface.
- [x] Remove unused app/app-deps `getStepDta` and `validateNextStepIdDta` helpers.
- [x] Remove the unused v1 `_getSalesFormAction` wrapper while preserving live `salesFormData`.
- [x] Refresh split Knip snapshots to the 147 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 33

- [x] Exact-scan app-deps sales-form step mirror exports.
- [x] Remove unused app-deps step routing/delete/meta/update helpers that current callers do not import.
- [x] Preserve app-deps `getSalesFormStepByIdDta`, which remains imported by app-deps sales-form data access.
- [x] Refresh split Knip snapshots to the 140 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 34

- [x] Exact-scan app-deps sales-book use-case, production list, production assignment, labor-cost, and customer-transaction candidates.
- [x] Remove unused app-deps sales-book settings/copy/move use-case exports while preserving live form load/create/save exports.
- [x] Demote internal production list/customer transaction helpers while preserving live exported entry points.
- [x] Demote raw production assignment and labor-cost mutation helpers while preserving public safe-action wrappers.
- [x] Refresh split Knip snapshots to the 129 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

---

# Dashboard Workspace Rename and Sentry Rollout

Date: 2026-07-28
Status: In Progress

## Goal

- Rename the main Next.js workspace from `apps/www` / `@gnd/www` to
  `apps/dashboard` / `@gnd/dashboard`.
- Rename its local port contract from `GND_WWW_PORT` to
  `GND_DASHBOARD_PORT`.
- Preserve external Vercel, route-domain, and Sentry project identities.
- Complete the authenticated Sentry project and alert rollout without running
  local builds or dev servers.

## Checklist

- [x] Create the shared `gnd-prodesk-backend` Sentry project.
- [x] Scope web, mobile, and backend high-priority alerts to `production` with
  one-hour per-issue throttling.
- [x] Inventory exact dashboard path/package/filter/port references.
- [x] Move the workspace to `apps/dashboard`.
- [x] Update Bun/Turbo, scripts, tests, instructions, and path-bearing docs.
- [x] Run focused workspace discovery, stale-reference, test, and diff checks.
- [x] Verify final Sentry project/alert state and record rollout evidence.
- [x] Audit runtime entrypoint loading, preview isolation, and backend event
  privacy across web, API, jobs, and mobile.
- [x] Move the Trigger global hook into the configured task directory, scrub
  SDK-generated API request/user data, and disable non-production mobile
  telemetry/source-map upload.
- [ ] Add backend Sentry values to Vercel Production and Trigger Production
  after explicit production-configuration approval.
- [ ] Verify a controlled backend ingestion event after deployment values are
  available.

## Constraints

- Do not rename the Vercel `gndprodesk` project, production domains, or
  `gnd-prodesk-web` Sentry project.
- Do not run EAS, native, Next.js, or Turbo builds.
- Do not start development servers.
- Do not stage unrelated existing worktree changes.

---

# Next.js 16.2.12 Workspace Upgrade

Date: 2026-07-30
Status: Complete

## Goal

- Upgrade every first-party Next.js app to the latest verified stable patch.
- Keep the shared catalog, Next.js ESLint config, and storefront MDX adapter
  aligned on `16.2.12`.
- Regenerate the Bun lockfile and validate each affected app.

## Checklist

- [x] Inventory runnable Next.js apps and shared catalog consumers.
- [x] Verify `next`, `@next/mdx`, and `eslint-config-next` latest stable
  versions.
- [x] Update root and app-local dependency constraints.
- [x] Regenerate `bun.lock` and confirm a consistent first-party resolution.
- [x] Run dependency consistency checks; Next.js is aligned and the command
  retains 59 pre-existing unrelated mismatches.
- [x] Typecheck all three apps: dealership passes, while dashboard and
  storefront retain their unrelated documented baselines with no Next.js-family
  diagnostic.
- [x] Attempt a production build: dealership reports Next.js `16.2.12`, then
  the sandbox blocks Turbopack's internal worker port. The required unsandboxed
  retry could not be authorized because the approval service was usage-limited.
- [x] Record validation results and Brain documentation impact.

## Scope

- First-party Next.js apps: `apps/dashboard`, `apps/dealership`, and
  `apps/storefront`.
- Shared catalog consumers: `packages/events` and `packages/ui`.
- `apps/api`, `apps/mobile`, and `apps/web` are not Next.js applications and
  require no framework dependency change.

## Result

- Upgrade implementation is complete.
- No application code, API contract, permission, database schema, migration, or
  user-visible behavior changed.
- Full production-build proof remains an environment limitation, not an
  implementation follow-up.
# Production Mark-All and Single-Run Completion Batch (2026-08-29)

Status: Completed

## Goal

- Add an accessible select-all checkbox to the admin Production table.
- Replace per-order Production Completed task starts with one canonical bulk run, matching the recent bulk Fulfilled approach.
- Refresh and execute the authenticated overdue Production queue flow, then verify the queue decreases by the successfully completed count.

## Implementation

- [x] Add a tri-state header checkbox for all currently loaded Production rows.
- [x] Extend the shared bulk task contract/store for Production Completed.
- [x] Add one server task that skips already-completed/fulfilled orders and returns per-order outcomes.
- [x] Route the shared Mark-as UI through that one batch task.
- [x] Add focused contract and UI tests.
- [x] Refresh the local page, select all loaded rows, run Production Completed, and reconcile before/after counts.
- [x] Update Brain documentation and validation evidence.

## Risks

- The overdue queue may contain more records than the currently loaded page; the header checkbox must accurately mean all loaded rows unless the API supplies a server-wide selection token.
- Live local mutation is explicitly requested, so before/after counts and skipped/failed outcomes must be recorded rather than assuming every selected row changed state.

## Result

- Mark All selected 40 loaded overdue rows after refresh.
- The canonical dependency resolver handled 36 affected orders, then one monitored bulk Production Completed parent run processed the selection.
- After terminal completion and a clean refresh, Past Due decreased from 1,099 to 1,059: exactly 40 rows.
- Focused validation passed 18 tests / 51 assertions; scoped Biome and `git diff --check` passed.
