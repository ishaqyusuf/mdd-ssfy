# Done

### Sales PDF V2 Release Proof
- Status: Done
- Description: Authenticated browser validation rendered and downloaded quote
  `03341LM` through the HTML preview with an HTTP 200 quote-mode response, then
  selected orders `08894LM` and `08893LM` and downloaded a valid two-page
  merged order PDF. Extracted text and rendered-page inspection confirmed the
  requested order, readable tables, unclipped totals, and valid one-page and
  two-page artifacts.
- Completed Date: 2026-07-23

## Purpose
Tracks notable completed work snapshots. Use `brain/progress.md` for the detailed chronological log.

## Recent Highlights
### Sales Customer Editing From Form And Overview
- Priority: High
- Description: Added distinct customer Edit and Change actions to the new sales
  form and one shared Edit customer action across all Sales Overview variants,
  backed by coherent customer-change refresh behavior and existing ownership
  rules.
- Related Feature: Sales customer editing
- Status: Done
- Plan File:
  `.brain/plans/2026-07-23-bug-fix-sales-customer-editing-from-form-and-overview.md`
- Feature File: `.brain/features/sales-customer-editing.md`
- Validation: 49 focused tests / 95 assertions, focused Biome, API and sales
  typechecks, scoped diff checks, and authenticated non-mutating browser proof
  on office order `08890PC`. The broad WWW typecheck retains its documented
  unrelated baseline. The complete repository test run finished with 2,113
  passing, 1 skipped, and 25 existing unrelated failures.
- Review: No documented-standards violations. Permission and pricing-metadata
  spec findings were corrected and confirmed closed before handoff.
- Completed Date: 2026-07-23

### Shared Document Caller Migration
- Priority: High
- Description: Cut the active Expo employee-gallery, dispatch-proof,
  packing-signature, authenticated browser attachment, and Sales PDF callers
  onto canonical `StoredDocument` ownership while preserving compatibility
  URL/path reads.
- Related Feature: Shared document platform
- Status: Done
- Plan File:
  `.brain/plans/2026-07-23-feature-shared-document-caller-migration.md`
- Completed Date: 2026-07-23
- Scope Note: Legacy Prisma `Gallery` has no runtime caller and was closed as
  obsolete/no-op. Inventory `ImageGallery` remains a separate future
  inventory/schema/data decision.
- Validation: 46 focused tests / 329 assertions; API, sales, utils, jobs, and
  storefront typechecks; changed-runtime web/Expo diagnostic filtering;
  focused Biome; diff validation; and two independent no-finding reviews.

### Sales Document WhatsApp And SMS Delivery
- Priority: High
- Description: Unified quote/order delivery behind explicit Email, WhatsApp,
  and SMS intent with validated recipients, reusable short links, Twilio SMS,
  and per-channel activity evidence.
- Related Feature: Sales quote/order document delivery
- Status: Done
- Plan File:
  `.brain/plans/2026-07-02-feature-sales-document-whatsapp-sms-delivery.md`
- Feature File: `.brain/features/sales-document-messaging.md`
- Decision: `.brain/decisions/ADR-027-sales-document-message-delivery.md`
- Validation: 39 focused tests / 92 assertions, notifications/jobs/API
  typechecks, targeted Biome, diff checks, and local authenticated orders data
  smoke passed. Turbo passed 24 of 25 packages; the broad WWW baseline remains.
- Completed Date: 2026-07-23

### Resumable Mobile Dispatch Proof Completion
- Priority: High
- Description: Replaced client-orchestrated proof uploads, pickup packing, and
  final completion with one dispatch-bound server operation that durably stages
  proof paths and idempotently resumes/finalizes the same request.
- Related Feature: Mobile dispatch proof completion
- Status: Done
- Feature File: `.brain/features/mobile-dispatch-proof-completion.md`
- Decision: `.brain/decisions/ADR-026-resumable-dispatch-proof-completion.md`
- Validation: API and sales typechecks, 17 focused tests / 229 assertions,
  targeted Biome, filtered Expo source diagnostics, and diff checks passed.
- Completed Date: 2026-07-23

### Storefront Compiler and Production-Build Gate Repair
- Priority: High
- Description: Reconciled the storefront UI, search, form, icon, and tRPC
  package-boundary types with their current dependencies and removed the
  hardcoded address-autocomplete fallback query.
- Related Feature: Storefront e-commerce replacement
- Status: Done
- Feature File: `.brain/features/storefront-ecommerce-replacement.md`
- Validation: Complete storefront typecheck, targeted lint for all nine changed
  files, diff check, and the Next.js 16.2.10/Turbopack production build passed;
  all 21 static pages generated.
- Completed Date: 2026-07-23

### Operational API Route Hardening
- Priority: High
- Description: Replaced public mutation boundaries across dispatch, inventory
  configuration, contractor jobs/payments, community, and shared settings with
  authenticated, permission-shaped server guards and live ownership checks.
- Related Feature: Operational API authorization
- Status: Done
- Plan File: `.brain/plans/2026-07-23-api-public-route-hardening.md`
- Feature File: `.brain/features/api-operational-route-hardening.md`
- Decision: `.brain/decisions/ADR-025-operational-mutation-permission-boundaries.md`
- Validation: 14 focused tests / 239 assertions and API typecheck passed;
  read-only seeded-role audit matched the documented capability matrix.
- Completed Date: 2026-07-23

### Dealer Quote Post-Request Edit Lock
- Priority: High
- Description: Locked dealer quote editing after pending, approved, or rejected
  order requests in both list/direct-route UI and the transactional save
  boundary, with an actionable API conflict response.
- Related Feature: Dealership quote-to-order approval
- Status: Done
- Feature File: `.brain/features/dealership-quote-to-order-approval.md`
- Validation: 61 focused tests / 187 assertions, dealership and API typechecks,
  targeted Biome, and diff checks passed. Live locked-row interaction remains
  fixture-dependent; no quote data was fabricated.
- Completed Date: 2026-07-23

### Sales Orders Batch Payment Review
- Priority: High
- Description: Replaced parallel per-order review requests with one protected transactional batch mutation for up to 100 selected orders, guarded concurrent results, and one awaited coalesced payment invalidation before selection/menu cleanup.
- Related Feature: Sales Orders payment review, typed query invalidation events
- Status: Done
- Feature Files: `.brain/features/sales-orders-v2.md`, `.brain/features/query-invalidation-events.md`
- Validation: 38 focused tests / 81 assertions passed. Authorized local browser QA proved one UI batch action updated two selected payments together; exact payment and temporary auth state was restored. The local Next runtime failed before post-action DOM capture, so the deterministic orchestration test supplies the no-refresh ordering proof.
- Completed Date: 2026-07-22

### Master Password Support for Sales Rep Transfers
- Priority: High
- Description: Allowed owner-confirmed order and quote sales-rep transfers to use either the owner's account password or the configured master password, with atomic, fail-closed transfer usage auditing and a searchable Master Password Usage review surface.
- Related Feature: Sales rep transfer, authentication audit
- Status: Done
- Plan File: brain/plans/2026-07-08-feature-sales-order-sales-rep-transfer.md
- Feature Files: brain/features/sales-orders-v2.md, brain/features/master-password-login-audit.md
- Decision: brain/decisions/ADR-020-master-password-usage-audit-consistency.md
- Completed Date: 2026-07-22

### Sales Customer Direct Dealership Invitations
- Priority: High
- Description: Added batched partnership status to Sales Customers/Customer
  Overview and Super Admin-only direct invitations with controlled resend,
  provider evidence, hash-only links, concurrency leases, and safe link
  supersession.
- Related Feature: Dealership recruitment, Sales Customers, customer overview,
  transactional email
- Status: Done
- Plan Status: Implemented; provider-backed browser proof remains a rollout QA
- Plan File: brain/plans/2026-07-21-feature-sales-customer-direct-dealership-invitations.md
- Feature File: brain/features/dealership-program-recruitment.md
- Decision: brain/decisions/ADR-015-dealer-customer-privacy-and-recruitment-suppression.md
- Completed Date: 2026-07-22

### Dealership Program Expansion Implementation
- Priority: High
- Description: Implemented tickets 1–8 for dealer branding, customer privacy,
  direct-ship snapshots, recruitment campaigns/email banners, secure
  applications, review/password activation, and dealer lifecycle controls.
- Related Feature: Dealership Program, customer privacy, sales email,
  fulfillment, dealer auth
- Status: Done (implementation slice)
- Plan Status: Implemented; launch proof remains in progress pending schema apply
- Feature File: brain/features/dealership-program-recruitment.md
- Decision: brain/decisions/ADR-015-dealer-customer-privacy-and-recruitment-suppression.md
- Evidence: `.scratch/dealership-program-recruitment/`
- Completed Date: 2026-07-19

### Dealership Quote-to-Order Approval Workflow
- Priority: High
- Description: Completed and authenticated-QA'd dealer quote creation/request,
  Sales Team in-app and email notifications, office completion/approval,
  payment handoff, dealer-owned customer payment management, dashboard progress,
  dual customer/internal PDF surfaces, and office Dealer flag/filter support.
- Related Feature: Dealership Program, sales approval, payments, notifications,
  sales print
- Status: Done
- Plan Status: Implemented and browser-verified
- Feature File: brain/features/dealership-quote-to-order-approval.md
- Decision: brain/decisions/ADR-014-dealer-customer-and-internal-sales-surfaces.md
- Evidence: `.gstack/qa-reports/qa-report-dealership-office-local-2026-07-18.md`
- Completed Date: 2026-07-19

### Central Typed Query Invalidation Events
- Priority: High
- Description: Added one typed domain event registry and global mutation-success trigger for WWW query invalidation, including result/variable-derived entity scope, explicit `meta.queryEventScope` / `meta.queryEvents`, automatic typed tRPC mutation-route mappings, same-browser cross-tab delivery, exact Sales Overview invalidation with broad aggregate invalidation, a typed one-off invalidation helper, and migration of reviewed, office/online payment, autosave/final sales edit, production, fulfillment, copy/move, and dispatch flows.
- Related Feature: Client data freshness, tRPC, TanStack Query, sales, inventory, jobs, HRM, page tabs
- Status: Done
- Plan Status: Implemented foundation and critical-domain rollout
- Plan File: brain/plans/2026-07-17-query-invalidation-event-system.md
- Feature File: brain/features/query-invalidation-events.md
- Decision: brain/decisions/ADR-013-central-query-invalidation-events.md
- Evidence: apps/www/src/lib/query-events; apps/www/src/trpc/query-client.ts; apps/www/src/trpc/client.tsx; apps/www/src/types/react-query.d.ts; apps/www/src/hooks/use-sales-query-client.ts
- Completed Date: 2026-07-18

### Task Monitor Client Simplification And Error Ledger
- Priority: High
- Description: Simplified production background task feedback so normal users see only a loading circle while tasks run and terminal closeable toasts on success/failure, while developer-facing run details move to a durable task-run diagnostics ledger.
- Related Feature: Background task monitor, Trigger.dev task feedback, developer diagnostics
- Status: Done
- Plan Status: Implemented
- Plan File: brain/plans/2026-07-13-spec-task-monitor-client-simplification-and-error-ledger.md
- Feature File: brain/features/background-task-monitor.md
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/42
- Evidence: packages/db/src/schema/task-run-diagnostics.prisma; apps/api/src/db/queries/task-run-diagnostics.ts; apps/api/src/trpc/routers/task-run-diagnostics.route.ts; apps/www/src/components/task-notification.tsx; apps/www/src/app/(sidebar)/task-events/diagnostics/page.tsx
- Completed Date: 2026-07-13

### Sales Orders Filtered Excel Export
- Priority: High
- Description: Restored the historical Sales Orders Excel report action on the current Sales Orders V2 page. The button is hidden for the default unfiltered/unselected page, appears when filters are active or rows are selected, refetches through the current `sales.getOrders` contract, resolves selected UUID row keys to numeric sales ids, and downloads a formatted `.xlsx` report with linked order numbers.
- Related Feature: Sales orders, Sales Orders V2, spreadsheet reporting
- Status: Done
- Plan Status: Implemented
- Plan File: brain/plans/2026-07-10-spec-sales-orders-filtered-excel-export.md
- Feature File: brain/features/sales-orders-v2.md
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/41
- Evidence: apps/www/src/components/sales-orders-v2-export.tsx; apps/www/src/components/sales-orders-export.ts; apps/www/src/components/sales-orders-export.test.ts; apps/www/src/components/tables-2/sales-orders/data-table.tsx; apps/www/src/store/sales-orders.ts
- Completed Date: 2026-07-10

### Sidebar Footer Account Menu Hover Loop
- Priority: Medium
- Description: Stabilized the desktop sidebar footer account menu so clicking the footer opens the dropdown inside the sidebar, movement between the dropdown and other sidebar areas no longer triggers a close/collapse loop, leaving the sidebar hides the dropdown without resetting requested-open state, and hovering back restores it. The footer user control now renders as a flat full-width row attached to the footer border instead of an inset card.
- Related Feature: Site navigation
- Status: Done
- Plan Status: Implemented
- Plan File: brain/plans/2026-07-09-bug-fix-sidebar-footer-account-menu.md
- Feature File: brain/features/site-navigation.md
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/39
- Evidence: packages/ui/src/components/dropdown-menu.tsx; packages/site-nav/src/components/user.tsx
- Completed Date: 2026-07-09

### Unit Invoice Search Parity With Project Units
- Priority: High
- Description: Aligned Community Unit Invoices `q` search with Project Units visible unit search so selected-project searches include units matching only through lot/block text, project title, or builder name. This fixes the reported Breezewood Villas `/01` mismatch where Unit Invoices returned fewer rows than Project Units.
- Related Feature: Community unit invoices, project units, Community operations search
- Status: Done
- Plan Status: Implemented
- Plan File: brain/plans/2026-07-09-bug-fix-unit-invoice-search-parity.md
- Feature Files: brain/features/unit-invoices-table.md; brain/features/community-unit-invoice-reporting.md
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/38
- Evidence: apps/api/src/db/queries/unit-invoices.ts; apps/api/src/trpc/routers/community.route.test.ts
- Completed Date: 2026-07-09

### Sales Email Status Alerts And Transaction Ledger
- Priority: High
- Description: Added provider-result feedback for standard quote/order and custom composed sales document emails, plus a durable `/sales-book/emails` ledger. Sales reps see attempts they sent or attempts attached to them as sales rep, while Super Admin can see all attempts and resend failed/skipped rows. Resend creates linked child attempts and leaves original evidence unchanged.
- Related Feature: Sales quote/order document email, notifications, sales rep dashboard, sales audit
- Status: Done
- Plan Status: Implemented
- Plan File: brain/plans/2026-07-09-feature-sales-email-status-alerts-and-ledger.md
- Feature File: brain/features/sales-email-delivery-ledger.md
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/37
- Evidence: packages/db/src/schema/sales-email-attempts.prisma; apps/api/src/db/queries/sales-email-attempts.ts; apps/www/src/components/sales-email-ledger-page.tsx; packages/notifications/src/index.ts; packages/jobs/src/tasks/sales/create-send-sales-email-task.ts
- Completed Date: 2026-07-09

### Sales Order And Quote Sales Rep Transfer
- Priority: High
- Description: Added an ownership-controlled way to transfer an existing order or quote from the sales overview. Only the current sales rep whose user id matches `SalesOrders.salesRepId` can transfer the sale; `editOrders` grants no override. The mutation requires password confirmation, changes only `salesRepId`, records structured `SalesHistory` audit evidence, and refreshes sales list/overview/dashboard query families from the UI.
- Related Feature: Sales orders, sales overview, sales rep dashboard, sales ownership correction
- Status: Done
- Plan Status: Implemented
- Plan File: brain/plans/2026-07-08-feature-sales-order-sales-rep-transfer.md
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/36
- Evidence: apps/api/src/db/queries/sales-rep-transfer.ts; apps/api/src/db/queries/sales-rep-transfer.test.ts; apps/www/src/components/sales-overview-system/tabs/overview-tab.tsx
- Completed Date: 2026-07-08

### Sales Inventory Non-Stock Status And Tracking Change Repair
- Priority: High
- Description: Added derived `Not Applicable` / `N/A` inbound requirement display for non-stock, not-inventory, untracked, and zero-required sales inventory rows; added a lifecycle boundary for future stock-tracking repair preview; and added a bounded read-only tracking-change repair modal/check after category stock mode becomes tracked.
- Related Feature: Inventory-backed sales fulfillment
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-07-01-feature-sales-inventory-non-stock-status-tracking-repair.md
- Intake File: brain/intake/2026-07-01-sales-inventory-inbounds-tables-polish.md
- Evidence: packages/sales/src/sales-inventory-overview.test.ts; apps/api/src/trpc/routers/inventories.route.ts; apps/www/src/components/sales-overview-system/tabs/inventory-tab.tsx
- Completed Date: 2026-07-02

### Inventory Correctness Cutover Pending Gates Intake Capture
- Priority: High
- Description: Created a user-requested intake consolidating all remaining pending gates for the active Inventory System Correctness Cutover: Phase 8 clean reconciliation decisions, Phase 1-7 operator proof gaps, Phase 9 UI polish, Phase 10 browser proof matrix, and Phase 11 release gates. The intake preserves the binding repair-stop instruction and points back to the existing active cutover plan instead of creating duplicate plan files or roadmap tasks.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Intake File: brain/intake/2026-07-01-inventory-correctness-pending-gates.md
- Ledger Scope: Documentation intake capture only; this does not resume repairs, run evidence, change code, expand scope, close clean reconciliation, complete browser proof, or finish the cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Continued Materializable Backfill Applies IV
- Priority: High
- Description: Applied two more reviewed active/order materializable missing-sales batches after dry-run review, then stopped repairs on user request. Batch `2587` through `2688` material-applied `50` orders and created `70` inventory sale lines; batch `2690` through `2791` material-applied `50` orders and created `82` inventory sale lines. Both batches had `0` failed orders and `0` mapping-blocked orders; skipped item-level mapping warnings were `26` and `58`. The latest successful evidence reports sync coverage `3.05%`, `20449` missing sales, `0` componentless lines, `0` stale lines, `9` shipment/allocation drift, `1` skipped comparison, and `hasMore=true`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: scripts/inventory-reconciliation-repair.ts; scripts/inventory-reconciliation-evidence.ts; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Reviewed materializable active/order backfill apply only; this does not finish missing-sales backfill, decide non-active/mapping-blocked scope, resolve shipment/allocation drift, close clean reconciliation, browser proof, release acceptance, or the full cutover. Repairs are stopped by user request and should not resume without explicit user instruction.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Continued Materializable Backfill Applies III
- Priority: High
- Description: Applied one more reviewed active/order materializable missing-sales batch after dry-run review. Batch `2485` through `2581` material-applied `50` orders and created `81` inventory sale lines. The batch had `0` failed orders and `0` mapping-blocked orders; skipped item-level mapping warnings were `44`. At that checkpoint, evidence reported sync coverage `2.58%`, `20549` missing sales, `0` componentless lines, `0` stale lines, `9` shipment/allocation drift, `1` skipped comparison, and `hasMore=true`; this checkpoint has since been superseded by continued materializable backfill applies.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: scripts/inventory-reconciliation-repair.ts; scripts/inventory-reconciliation-evidence.ts; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Reviewed materializable active/order backfill apply only; this does not finish missing-sales backfill, decide non-active/mapping-blocked scope, resolve shipment/allocation drift, close clean reconciliation, browser proof, release acceptance, or the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Continued Materializable Backfill Applies II
- Priority: High
- Description: Applied two more reviewed active/order materializable missing-sales batches after dry-run review. Batch `2275` through `2397` material-applied `50` orders and created `77` inventory sale lines; batch `2398` through `2484` material-applied `50` orders and created `83` inventory sale lines. Both batches had `0` failed orders and `0` mapping-blocked orders; skipped item-level mapping warnings were `77` and `50`. At that checkpoint, evidence reported sync coverage `2.34%`, `20599` missing sales, `0` componentless lines, `0` stale lines, `9` shipment/allocation drift, `1` skipped comparison, and `hasMore=true`; this checkpoint has since been superseded by continued materializable backfill applies.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: scripts/inventory-reconciliation-repair.ts; scripts/inventory-reconciliation-evidence.ts; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Reviewed materializable active/order backfill apply only; this does not finish missing-sales backfill, decide non-active/mapping-blocked scope, resolve shipment/allocation drift, close clean reconciliation, browser proof, release acceptance, or the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Continued Materializable Backfill Applies
- Priority: High
- Description: Applied two more reviewed active/order materializable missing-sales batches after dry-run review. Batch `1927` through `2087` material-applied `50` orders and created `110` inventory sale lines; batch `2088` through `2274` material-applied `50` orders and created `82` inventory sale lines. Both batches had `0` failed orders and `0` mapping-blocked orders; skipped item-level mapping warnings were `65` and `99`. At that checkpoint, evidence reported sync coverage `1.87%`, `20699` missing sales, `0` componentless lines, `0` stale lines, `9` shipment/allocation drift, `1` skipped comparison, and `hasMore=true`; this checkpoint has since been superseded by continued materializable backfill applies.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: scripts/inventory-reconciliation-repair.ts; scripts/inventory-reconciliation-evidence.ts; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Reviewed materializable active/order backfill apply only; this does not finish missing-sales backfill, decide non-active/mapping-blocked scope, resolve shipment/allocation drift, close clean reconciliation, browser proof, release acceptance, or the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Brain Ledger Intake And Pending Phase Alignment
- Priority: High
- Description: Confirmed the inventory correctness cutover is backed by the June 15 inventory cutover pending-scope intake and the June 22 Sales Overview Inventory workflow intake, then aligned the cutover plan, roadmap, in-progress ledger, done ledger, and progress log around the same live state. The full cutover remained In Progress; completed Phase 8 repair, HPT, classification, and materializable backfill slices were done evidence only. At that checkpoint, authoritative evidence was the successful Markdown reconciliation run with `20799` missing sales, `0` componentless/stale rows, `9` shipment/allocation drift, `1` skipped comparison, `hasMore=true`, and next cursor `208`; this checkpoint has since been superseded by continued materializable backfill applies.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Source Intake: brain/intake/2026-06-15-inventory-cutover-pending-scope.md
- Related Intake: brain/intake/2026-06-22-sales-overview-inventory-workflows.md
- Evidence: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md; brain/tasks/roadmap.md; brain/tasks/in-progress.md; brain/progress.md
- Ledger Scope: Documentation alignment only; no inventory runtime, API, database schema, permission, or UI behavior changed in this checkpoint.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Additional Materializable Backfill Applies
- Priority: High
- Description: Applied four more reviewed active/order materializable missing-sales batches after dry-run review. Batch `1523` through `1640` material-applied `50` orders and created `186` inventory sale lines; `1641` through `1718` created `215`; `1720` through `1821` created `156`; and `1822` through `1926` created `181`. All four batches had `0` failed orders and `0` mapping-blocked orders; skipped item-level mapping warnings were `41`, `45`, `52`, and `23`. At that checkpoint, evidence reported sync coverage `1.39%`, `20799` missing sales, `0` componentless lines, `0` stale lines, `9` shipment/allocation drift, `1` skipped comparison, and `hasMore=true`; this checkpoint has since been superseded by continued materializable backfill applies.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: scripts/inventory-reconciliation-repair.ts; scripts/inventory-reconciliation-evidence.ts; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Reviewed materializable active/order backfill apply only; this does not finish missing-sales backfill, decide non-active/mapping-blocked scope, resolve shipment/allocation drift, close clean reconciliation, browser proof, release acceptance, or the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 HPT Door Component Fallback And Zero Component Repair
- Priority: High
- Description: Resolved the Phase 8 HPT zero-component blocker. HPT child door rows that lack their own mapped `stepProduct` now use the HPT root product as the component source, inch-marked door dimensions normalize to Dyke variant UIDs, and zero `totalQty` door rows derive quantity from `lineTotal / unitPrice` when possible. A reviewed zero-component repair dry-run/apply covered the `43` affected sales orders, updated `131` line items, skipped `10` unmapped sales items, and the latest successful evidence reports `0` componentless inventory sale lines and `0` componentless sales.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: packages/sales/src/sync-sales-inventory-line-items.ts; packages/sales/src/sync-sales-inventory-line-items.test.ts; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Phase 8 HPT component fallback and reviewed local repair apply only; this does not finish missing-sales backfill, resolve shipment/allocation drift, close clean reconciliation, browser proof, release acceptance, or the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Zero Component Source Shape Classification
- Priority: High
- Description: Extended the read-only Phase 8 reconciliation evidence command so zero-component componentless rows are classified by source shape. At that checkpoint, evidence kept the cutover not clean and all `86` zero-component rows across `43` orders were classified as `house_package_doors_missing_component_mapping_fields`: linked sales items and deterministic parent mappings existed, while HPT door/form-step source rows had zero component candidate hints.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: scripts/inventory-reconciliation-evidence.ts; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Read-only evidence classification only; this does not create component rows, decide HPT door mapping/product scope, close missing-sales scope, resolve shipment/allocation drift, close clean reconciliation, or complete the full cutover.
- Superseded By: Inventory Correctness Cutover Phase 8 HPT Door Component Fallback And Zero Component Repair.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Brain Ledger Alignment After Materializable Backfill
- Priority: High
- Description: Realigned the cutover plan, roadmap, in-progress ledger, done ledger, progress log, and reconciliation evidence after the first materializable active/order missing-sales backfill apply and zero-component componentless review classification. At that checkpoint, the ledger pointed at the then-current Phase 8 live gate instead of the earlier stale/componentless repair checkpoint: `20999` missing sales, `86` zero-component componentless lines across `43` orders, `61` drift, `105` skipped comparisons, `hasMore=true`, and next cursor `208`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: brain/tasks/roadmap.md; brain/tasks/in-progress.md; brain/progress.md; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Documentation alignment only; completed slices remain evidence only, and this does not close zero-component scope, missing-sales scope, shipment/allocation review, clean reconciliation, browser proof, release acceptance, or the full cutover.
- Superseded By: Inventory Correctness Cutover Phase 8 HPT Door Component Fallback And Zero Component Repair.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Materializable Backfill Apply And Zero Component Review
- Priority: High
- Description: Refined Phase 8 missing-sales repair evidence so active/order candidates are split into materializable and mapping-blocked buckets before any apply. The first old active/order batch (`271` through `609`) applied as a no-op with `0` material writes because every sales item lacked deterministic inventory mapping. The first materializable batch (`1366` through `1521`) then applied successfully with `50` material-applied orders and `147` created inventory sale lines, reducing missing sales from `21049` to `20999`. The resulting `86` componentless lines across `43` orders were classified as zero-component review rows after a reviewed componentless re-sync updated `131` lines but could not create components from `inventorySync.componentCount=0`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: scripts/inventory-reconciliation-evidence.ts; scripts/inventory-reconciliation-repair.ts; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Phase 8 evidence/tooling and reviewed local repair apply only; this does not decide zero-component scope, finish missing-sales backfill, resolve shipment/allocation drift, close clean reconciliation, or complete the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Scoped Missing Sales Backfill Batch Evidence
- Priority: High
- Description: Extended the read-only Phase 8 reconciliation evidence command so the clearest `needs_backfill` scope now produces a first explicit reviewed active/order candidate batch instead of defaulting to broad cursor backfill. The batch contains `50` sales order ids from the `active_sales_status_candidate` and `statusless_order_id_candidate` buckets, with `2224` reviewed active/order candidates total and `2174` remaining after the first batch. The repair companion now accepts explicit missing-sales ids with `--include-missing-backfill --missing-sales-order-ids <csv>` and dry-ran the first batch with `plannedCount=50`, no skipped ids, and no mutation.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: scripts/inventory-reconciliation-evidence.ts; scripts/inventory-reconciliation-repair.ts; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Read-only evidence and dry-run repair planning only; this does not apply missing-sales backfill, decide non-active scope, resolve shipment/allocation drift, close clean reconciliation, or complete the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Missing Sales Scope Classification Evidence
- Priority: High
- Description: Extended the read-only Phase 8 reconciliation evidence command so the broad `needs_backfill` blocker is grouped by sales scope before any broad repair is considered. The latest evidence still is not clean, but the `21049` missing-sale rows now separate into `2209` active-status candidates, `15` statusless order-id candidates, `12` statusless quote-id rows, `63` quote-status rows, `167` terminal/history rows, `725` completed-production rows, `1` manual inventory-status row, and `17857` still-unknown statusless rows.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: scripts/inventory-reconciliation-evidence.ts; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Read-only evidence classification only; this does not backfill missing sales, close clean reconciliation, or complete the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Shipment Allocation Classification Evidence
- Priority: High
- Description: Extended the read-only Phase 8 reconciliation evidence command so shipment/allocation blockers are grouped into actionable classes. The latest evidence still is not clean, but the remaining shipment blockers now separate into `8` completed-delivery-without-consumed-allocation rows, `1` consumed-allocation-without-completed-delivery row, and `1` missing legacy sales-item link skipped comparison.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: scripts/inventory-reconciliation-evidence.ts; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Read-only evidence classification only; this does not repair shipment/allocation drift, close clean reconciliation, or complete the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Brain Ledger Live-State Correction
- Priority: High
- Description: Corrected the live-state Brain wording after the reviewed stale/componentless repair apply so the cutover plan, roadmap, in-progress ledger, done ledger, progress log, and reconciliation evidence agree that stale/componentless repair candidates are cleared while Phase 8 clean reconciliation remains blocked by broad missing-sales scope, `9` shipment/allocation drift rows, and `1` skipped comparison.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: brain/reports/2026-07-01-inventory-reconciliation-evidence.md; brain/tasks/roadmap.md; brain/tasks/in-progress.md; brain/progress.md
- Ledger Scope: Documentation alignment only; this does not close clean reconciliation or the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Reviewed Stale Componentless Repair Apply
- Priority: High
- Description: Applied the reviewed narrow Phase 8 repair slice without broad missing-sales backfill. Stale cleanup removed reviewed line ids `99`, `94`, and `43`; componentless manual inventory sale lines were reduced from `56` to `0`; sales-inventory-sync drift is now `0`; component-fulfillment drift remains `0`. The latest evidence is still not clean because monitor status remains `needs_backfill` and shipment/allocation reconciliation has `9` drift with `1` skipped comparison.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: scripts/inventory-reconciliation-repair.ts; scripts/inventory-reconciliation-evidence.ts; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Reviewed stale/componentless repair only; this does not close clean reconciliation or the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Sync Stale-Cleanup Timestamp Precision Hardening
- Priority: High
- Description: Hardened `syncSalesInventoryLineItems` stale-component and stale-line child cleanup so stock allocation and inbound demand residue deletion uses guarded component/parent identity plus `deletedAt not null` instead of exact timestamp equality. This preserves confirmed-write cleanup semantics while avoiding MySQL timestamp precision mismatches that can leave required relation children behind and block component deletion.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: packages/sales/src/sync-sales-inventory-line-items.ts; packages/sales/src/sync-sales-inventory-line-items.test.ts
- Ledger Scope: Stale cleanup precision fix only; this does not close clean reconciliation or the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Dry-Run-First Repair Runner
- Priority: High
- Description: Added `bun run inventory:reconciliation-repair` as the reviewed repair execution companion to the Phase 8 evidence command. The runner is dry-run by default, reports stale cleanup and componentless sales sync candidates, excludes missing-sales backfill unless explicitly requested, and blocks mutation unless both `--apply` and `--confirm-review` are supplied.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: scripts/inventory-reconciliation-repair.ts; package.json; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Guarded local repair runner only; this does not execute repairs, close clean reconciliation, or complete the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Reviewed Repair Plan Evidence
- Priority: High
- Description: Extended `bun run inventory:reconciliation-evidence` so the read-only Markdown and JSON evidence payloads include a reviewed repair plan. The plan lists exact guarded entrypoint payloads for stale-line cleanup dry-run/apply review, explicit componentless-sales re-sync with `includeAlreadySynced=true`, bounded missing-sales backfill, and the post-repair evidence rerun. This makes the next Phase 8 repair step reproducible without mutating data from the evidence command itself.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: scripts/inventory-reconciliation-evidence.ts; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Read-only evidence and repair planning only; this does not execute repairs, close clean reconciliation, or complete the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Reconciliation Evidence Command And Baseline
- Priority: High
- Description: Added a reusable read-only reconciliation evidence command, `bun run inventory:reconciliation-evidence`, and recorded the first Phase 8 monitor/reconciliation/stale-cleanup/componentless-line evidence snapshot. The initial baseline run was not clean: monitor status was `needs_backfill`, reconciliation status was `needs_review`, drift count was 65, skipped comparisons were 117, componentless manual line count was 56, and stale line count was 3. The command now also reports exact componentless-sales and stale-line repair candidate ids.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: scripts/inventory-reconciliation-evidence.ts; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Evidence runner and unclean baseline only; this does not close Phase 8 clean reconciliation or the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Pending Review Reconciliation Alignment
- Priority: High
- Description: Aligned inventory reconciliation component-fulfillment derivation with sales inventory sync semantics so `pending_review` stock allocations count as suggested allocation coverage. This removed two false component-fulfillment warning drifts from the Phase 8 baseline while leaving missing-component and shipment/allocation blockers visible.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: packages/sales/src/inventory-reconciliation-report.test.ts; brain/reports/2026-07-01-inventory-reconciliation-evidence.md
- Ledger Scope: Reconciliation semantics and evidence quality only; this does not close Phase 8 clean reconciliation or the full cutover.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Repair Path Audit Checkpoint
- Priority: High
- Description: Completed a targeted audit of the Phase 8 sales inventory correctness repair surfaces. The remaining mutating repair paths in scope are now covered by focused proof across reviewed inbound-status repair, sales inventory sync/repair/backfill, explicit backfill repair coverage, stale sale-line cleanup, sync stale-line/component cleanup, and legacy-status setup exact-baseline guards. Inventory import/source-label/product-kind backfills and Dyke sync remain separate import/integration workstreams, not Phase 8 sales inventory correctness repair gates.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: apps/api/src/trpc/routers/inventories.route.ts; packages/jobs/src/schema.ts; packages/jobs/src/tasks/sales/backfill-sales-inventory-line-items.ts; packages/sales/src/sales-inventory-sync-monitor.ts; packages/sales/src/sync-sales-inventory-line-items.ts; packages/sales/src/sales-inventory-legacy-status-setup.ts
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Explicit Backfill Repair Coverage Proof
- Priority: High
- Description: Tightened the sales inventory backfill repair job so explicit `salesOrderIds` are capped at 200 positive integers and targeted backfills query the full explicit id set instead of being truncated by the default `batchSize`. Cursor-based backfills still use bounded `batchSize`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: packages/jobs/src/schema.test.ts; packages/jobs/src/tasks/sales/backfill-sales-inventory-line-items.test.ts
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Legacy Status Setup Exact Baseline Proof
- Priority: High
- Description: Moved legacy-status setup reset/override handling into `@gnd/sales` and guarded both actions by the exact reviewed manual `SalesOrders.inventoryStatus` baseline inside the transaction. Stale reset attempts now stop before audit history or single-sale inventory sync runs, and override checks the same baseline before writing audit/sync evidence.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: packages/sales/src/sales-inventory-legacy-status-setup.test.ts
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Stale Cleanup Repair Input Validation Proof
- Priority: High
- Description: Tightened the stale sales-inventory line cleanup route schema so explicit `lineItemIds` must be a non-empty positive-integer list and repair `limit` must stay within the bounded integer range before stale cleanup scanning runs. This prevents an empty targeted cleanup request from widening into the default repair scan.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: apps/api/src/trpc/routers/inventories-route-import.test.ts
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 4 Inbound Issue Input Validation Proof
- Priority: High
- Description: Tightened inbound issue report and resolve schemas so issue ids and inbound shipment item ids must be positive integers, reported issue quantity must be positive, and resolved quantity cannot be negative before inbound issue rows are created or updated.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: apps/api/src/trpc/routers/inventories-route-import.test.ts
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 5 Allocation Review Input Validation Proof
- Priority: High
- Description: Tightened stock allocation review schemas so single approve/reject and bulk approve reject non-positive or decimal allocation ids before allocation review mutation planning runs. Bulk approve rejects empty batches, and single approve rejects non-positive override quantities when supplied.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: apps/api/src/trpc/routers/inventories-route-import.test.ts
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 3 Inbound Create Assign Input Validation Proof
- Priority: High
- Description: Tightened inbound create and assignment route schemas so supplier, inbound, demand, and line-item component ids must be positive integers before inbound demand preparation or assignment planning runs. Assignment now rejects empty demand batches, and component-selected inbound creation rejects non-positive requested quantities.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: apps/api/src/trpc/routers/inventories-route-import.test.ts
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 4 Receive Status Input Validation Proof
- Priority: High
- Description: Tightened inbound receive and inbound lifecycle status route schemas so non-positive or decimal shipment/item ids are rejected before transaction work starts. Receive inputs also reject negative received, good, issue, and unit-price values before stock, demand, issue, or status mutation planning can run.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: apps/api/src/trpc/routers/inventories-route-import.test.ts
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 5/7 Ship Dispatch Input Validation Proof
- Priority: High
- Description: Tightened ship-available, hold-until-complete, and inventory dispatch route schemas so non-positive or decimal order, line, and allocation ids are rejected before partial-shipment or dispatch mutation planning runs. Focused route schema coverage now pins valid payloads plus invalid order, line, and allocation id rejection for ship-available, dispatch transition, dispatch fulfill, and line hold inputs.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: apps/api/src/trpc/routers/inventories-route-import.test.ts
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Ledger Correction
- Priority: High
- Description: Corrected the inventory correctness cutover Brain ledgers so the July 1 plan, roadmap, in-progress queue, done ledger, and progress log all describe the same state: recent hardening/proof slices are completed evidence, the source and related intake files are linked, and the full cutover remains open until Phase 11 release acceptance is recorded.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Source Intake: brain/intake/2026-06-15-inventory-cutover-pending-scope.md
- Related Intake: brain/intake/2026-06-22-sales-overview-inventory-workflows.md
- Ledger Scope: Documentation alignment only; no inventory runtime, API, schema, or UI behavior changed in this checkpoint.
- Historical Next Gate At Completion: remaining Phase 8 repair-path audit, then clean reconciliation evidence before the broad operator/browser proof matrix.
- Superseded By: Inventory Correctness Cutover Phase 8 Repair Path Audit Checkpoint; the current next gate is clean Phase 8 reconciliation evidence.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 6 Mark As Batch Input Validation Proof
- Priority: High
- Description: Tightened the Mark As inventory preflight and continue route schemas so production-complete/fulfilled inventory gates reject empty, zero, negative, or decimal sales order id batches before preflight or mutation evidence can run. Both routes now share the same positive-integer batch schema capped at 100 orders.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: apps/api/src/trpc/routers/inventories-route-import.test.ts
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Received-Backorder Retry Input Validation Proof
- Priority: High
- Description: Tightened the shared `allocateReceivedInboundToBackorders` API/Trigger schema so retry allocation filters reject non-positive or non-integer sales order ids, line-item component ids, inventory variant ids, and limits before scanning received demand. Empty component-filter arrays remain allowed and continue to mean no component filter.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: packages/jobs/src/schema.test.ts
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Reconciliation Input Validation Proof
- Priority: High
- Description: Tightened inventory reconciliation dry-run evidence inputs so direct reports and queued Trigger runs reject non-positive sales order ids, negative or decimal cursors, and decimal limits before producing reconciliation proof. The sales inventory sync monitor also integer-guards its embedded reconciliation sampling inputs.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: packages/jobs/src/schema.test.ts
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Repair-Entry Validation Proof
- Priority: High
- Description: Tightened sales inventory sync/repair/backfill entry schemas so repair-facing sales order ids must be positive integers at the tRPC and Trigger payload boundaries. `syncSalesInventoryOverview`, `repairSalesInventorySync`, and `resolveSalesInventoryLegacyStatusSetup` now reject invalid `salesOrderId` values before sync work starts, while `sync-sales-inventory-line-items` and `backfill-sales-inventory-line-items` schemas reject decimal, negative, zero, or empty explicit-id payloads; backfill cursor and batch size are integer-guarded.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: packages/jobs/src/schema.test.ts
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Sync Stale-Component Cleanup Proof
- Priority: High
- Description: Tightened `syncSalesInventoryLineItems` stale-component cleanup on still-active synced lines so allocation, inbound-demand, and component cleanup run only when the component still matches the exact pre-read identity: component id, parent line id, sub-component id, and inventory variant id. Focused package coverage pins the guarded cleanup payload.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: packages/sales/src/sync-sales-inventory-line-items.test.ts; brain/reports/2026-07-01-inventory-correctness-invariant-matrix.md
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Sync Stale-Line Cleanup Proof
- Priority: High
- Description: Tightened `syncSalesInventoryLineItems` so repair/manual sync reports removed-sales-item stale line deletion only from confirmed guarded line soft-deletes. Allocation, inbound-demand, and component residue cleanup now runs only under lines confirmed by that sync apply, and focused package coverage proves stale pre-read lines skip child cleanup when the guarded line write is not confirmed.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: packages/sales/src/sync-sales-inventory-line-items.test.ts; brain/reports/2026-07-01-inventory-correctness-invariant-matrix.md
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Stale-Line Cleanup Proof
- Priority: High
- Description: Tightened the stale inventory sale-line cleanup repair so apply mode first confirms the parent line still matches the stale predicate, then releases stock allocations, cancels inbound demand, and removes components only under line items confirmed by that soft-delete write. Focused package coverage now proves stale pre-read lines restored or reassigned before apply do not trigger child cleanup.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: packages/sales/src/sales-inventory-sync-monitor.test.ts; brain/reports/2026-07-01-inventory-correctness-invariant-matrix.md
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Phase 8 Repair Proof
- Priority: High
- Description: Tightened the reviewed inventory inbound-status backfill repair path so apply writes are guarded by active inventory-owned inbound ownership, stale legacy status, and the exact reviewed legacy `SalesOrders.inventoryStatus` baseline. Focused API-query coverage now proves dry-run is non-mutating, audit history is written only for confirmed guarded applies, and stale apply attempts are classified as `changed_before_apply`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: apps/api/src/db/queries/sales-inventory-inbound-ownership.test.ts; brain/reports/2026-07-01-inventory-correctness-invariant-matrix.md
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Brain Tracking Checkpoint
- Priority: High
- Description: Normalized Brain tracking for the active inventory correctness cutover without marking the cutover complete. The plan now includes ledger rules and a current pending-phase checklist, the roadmap and in-progress ledgers identify Phase 8 repair/reconciliation as the next gate, and the progress/done ledgers distinguish completed hardening slices from remaining operator/browser/UI/release gates.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Source Intake: brain/intake/2026-06-15-inventory-cutover-pending-scope.md
- Evidence: brain/reports/2026-07-01-inventory-correctness-invariant-matrix.md
- Ledger Scope: Documentation alignment only; the overall cutover remains in progress until Phase 11 release acceptance is recorded.
- Historical Next Gate At Completion: remaining Phase 8 repair-path audit, then clean reconciliation evidence.
- Superseded By: Inventory Correctness Cutover Phase 8 Repair Path Audit Checkpoint; the current next gate is clean Phase 8 reconciliation evidence.
- Completed Date: 2026-07-01

### Inventory Correctness Cutover Hardening Slices
- Priority: High
- Description: Completed the first July 1 inventory correctness hardening slices without marking the full cutover complete: Phase 0 invariant ownership matrix, fulfilled/cancelled order read-only enforcement, Sales Overview Inventory active-tab loading/read-only controls, inbound create/assign parent-sale guards, stock allocation review parent-sale guards, received-backorder retry/active-component proof, ship-available partial shipment confirmed-consumption guard, Phase 6 Mark As stale-blocker and production lifecycle confirmed-write proof, Phase 7 dispatch release-safety proof, Phase 8 reviewed inbound-status repair exact-baseline proof, Phase 8 stale-line cleanup confirmed-write proof, Phase 8 sync stale-line cleanup confirmed-write proof, and Phase 8 sync stale-component cleanup exact-identity proof. Remaining gates are tracked in the July 1 cutover plan and in-progress ledger.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Evidence: brain/reports/2026-07-01-inventory-correctness-invariant-matrix.md
- Completed Date: 2026-07-01

### Mobile Quote Overview Reuse
- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-28-bug-fix-mobile-quote-overview-reuse.md`.
- Related Feature: Mobile quote list and overview
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-28-bug-fix-mobile-quote-overview-reuse.md
- Created Date: 2026-06-28

- [x] Sales Print C.C.C Partial Payment Footer: completed `brain/plans/2026-06-24-feature-sales-print-ccc-partial-payment-footer.md` by classifying print payment footer states, keeping partial/mixed balances principal-only, loading payment metadata for recorded C.C.C, and adding focused print-data regression coverage (2026-06-24).
- [x] Mobile Invoice Save Stuck: completed `brain/plans/2026-06-23-bug-fix-mobile-invoice-save-stuck.md` by adding a bounded mobile save await path, driving the saving overlay from store `saveStatus`, and returning hung invoice/quote saves to a retryable error state (2026-06-23).
- [x] Completed Inventory Pending 16 operations dashboard stock controls with tracked/untracked stock cards, low/out-of-stock alerts, inbound demand, pending allocation, backorder, production blocker metrics, and drilldowns from `/inventory` (2026-06-15).
- [x] Completed Inventory Pending 14 stock audit verification with an audit matrix/report for stock in/out, return, correction, consume, and release plus stock operations UI evidence and focused tests (2026-06-15).
- [x] Completed Inventory Pending 13 top-sales analytics by adding inventory-backed item/variant rankings for ordered quantity, shipped/consumed allocation quantity, revenue, cost, and margin with reliability counts on `/inventory` and `/inventory/[id]` (2026-06-15).
- [x] Completed Inventory Pending 12 variants workspace by replacing the `/inventory/variants` redirect with a searchable/filterable variants page showing item, category, status, stock, pricing, supplier, low-stock, dashboard, edit, and stock-operation context (2026-06-15).
- [x] Completed Inventory Pending 11 item dashboard with `/inventory/[id]`, a bounded item overview API, variants/stock/movements/inbound/allocations/sales/quotes sections, and the inventory table eye action linked to the dashboard (2026-06-15).
- [x] Completed Inventory Pending 10 repeat receive / auto-release guardrails, making inbound receive delta-based and surfacing duplicate/skipped counts for receive and backorder allocation retries (2026-06-15).
- [x] Completed Inventory Pending 09 hold-until-complete and partial-shipment workspace slice, including line-level hold metadata, guarded ship-available behavior, dedicated `/inventory/partial-shipments` route, and focused fulfillment tests (2026-06-15).
- [x] Completed Inventory Pending 07 reconciliation job foundation with a dry-run sales inventory drift report, bounded cursor support, skipped reasons, Trigger task, and protected inventory API access (2026-06-15).
- [x] Completed Inventory Pending 06 print parity data/golden slice with production BOM, pick list, packing list, backorder summary, and customer remaining summary packets using the existing v2 template input contract (2026-06-15).
- [x] Completed Inventory Pending 05 shipment-record decision: `OrderDelivery` / `OrderItemDelivery` are canonical shipment records for the current inventory cutover phase; ADR-008 documents the policy (2026-06-15).
- [x] Completed Inventory Pending 04 inventory dispatch mode command/API slice for assign, pack, fulfill, and release allocation transitions while preserving legacy dispatch compatibility rows (2026-06-15).
- [x] Completed Inventory Pending 08 production readiness gates, blocking production assignment/start unless inventory-backed required components are ready or fulfilled (2026-06-15).
- [x] Completed Inventory Pending 03 production lifecycle bridge, updating inventory-backed line projections from sales-control assignment/submission events while keeping stock fulfillment state separate (2026-06-15).
- [x] Completed Inventory Pending 02 variant/supplier price sync to Dyke, including generic cost-price projection, preserved supplier pricing-key creation guardrails, supplier ambiguity skips, drift-report alignment, and focused sync tests (2026-06-15).
- [x] Completed Inventory Pending 17 cutover gap audit matrix, mapping inventory-to-Dyke, price sync, production, dispatch, print, dashboard, audit, reconciliation, and browser-validation capabilities to current code/Brain evidence (2026-06-15).
- [x] Initialized the original Brain system for the repository on 2026-03-08.
- [x] Published ADRs for payment/resolution boundaries, shared document platform, and the sales overview system architecture.
- [x] Started the shared document-platform foundation and the sales overview system redesign foundation.
- [x] Landed recent payment-system reliability fixes and client-safe schema extraction work captured in `brain/progress.md`.
- [x] Implemented sales PDF print enhancements to surface door thumbnails and preserve moulding detail visibility in invoice output (2026-03-18).
- [x] Rebuilt the sales production admin/worker workspace around shared dashboard UI, due-today/tomorrow alerts, and compact due-date filtering (2026-03-26).
- [x] Refined the sales production worker dashboard v2 with row-injected item detail, simplified worker progress status, compact handle-aware submission controls, worker-only item visibility, and scope-aware completion filtering for past-due/pending queues (2026-04-02).
- [x] Restored missing worker notification delivery for production assignments in the v2 `update-sales-control` path (2026-04-03).
- [x] Added the restricted `CommunityUnit` permission slice for community projects/units/templates, narrowed the units grid to `Project` / `Builder` / `Model` / `Lot` / `Block`, and blocked install-cost UI/API access for that permission path (2026-04-17).
- [x] Fixed the sales dashboard chart-date regression by normalizing dashboard date params as explicit `yyyy-MM-dd` calendar days on the API and client, preserving same-day revenue buckets and date picker labels; validation: `bun test apps/api/src/db/queries/sales-dashboard.test.ts` passed (2026-06-09).
- [x] Added Super Admin Sales Settings with persisted V1/V2 template selection, page-break policy, image/headline controls, recent-order live preview, and configuration-aware print/snapshot/download behavior (2026-07-18).
- [x] Standardized legacy/new sales on decimal-safe 2dp arithmetic, authoritative grouped totals, Decimal shelf prices, subtractive percentage discounts, final HPT custom pricing, and a C.C.C-exclusive `grandTotal` contract (2026-07-20).
- [x] Completed production-only Sentry for web and mobile: created separate `gnd-prodesk-web` and `gnd-prodesk-mobile` projects, updated Vercel/Expo production environments, added production source maps/releases, and wired the Expo SDK/Metro/root layout while keeping local and preview telemetry disabled (2026-07-20).
- [x] Completed responsive full-width Tables-2 layout: registered one semantic fill column for all 84 virtualized configurations, preserved nine fixed legacy form grids, centralized header/row/skeleton sizing and fallback behavior, added registry regression coverage, and browser-validated the canonical orders table at 760/1280/1440/1920 widths (2026-07-22).
- [x] 2026-07-20 Storefront e-commerce implementation: dedicated public API,
  canonical Dyke configuration projection for Doors/Mouldings/Shelf Items,
  admin publication/configuration workspace, cart/wishlist, customer auth and
  account, idempotent Square checkout into standard Sales Orders, inquiry/CMS/
  SEO/jobs/email/permissions, additive migration, focused tests, and isolated
  responsive browser QA.
- [x] 2026-07-21 Storefront historical product-page and operations completion:
  restored the October 2025 variant/configurator experience, split and bounded
  the admin catalog workspace, fixed guest/auth/cart/payment boundaries,
  guaranteed assigned-rep review activity, and completed local Square sandbox
  order `08897CST` through paid customer/admin views.

- [x] 2026-07-22: Implemented the custom millwork customer brief and office
  handoff: private files, deterministic references, sales-rep assignment,
  lifecycle/activity tracking, office inbox, customer linking, guarded
  canonical quote creation, best-effort notifications, stale-draft cleanup, and
  responsive browser verification. Migration generation remains separately
  blocked by the existing master-password shadow migration failure.
- [x] 2026-07-23: completed the Sales Overview manager production preflight.
  Admin order views now derive six read-only checks for door configuration,
  customer/tax, supplier pricing, stock/inbound, fulfillment, and current PDF
  readiness, with review navigation into existing Details or Inventory tabs.
  Focused projection, DTO, and inventory tests pass; sales/API typechecks and
  focused Biome pass; authenticated browser proof loaded order `08893LM` and
  found the card without application console errors.
- [x] 2026-07-23: completed dealer request, payment, and fulfillment next-step
  guidance. Quote/order tables, dashboard request activity, and order detail now
  share one tested policy that keeps the customer receivable separate from the
  GND payable and advances pickup/delivery wording only from affirmative
  fulfillment evidence. Authenticated desktop and mobile dealership QA passed.
