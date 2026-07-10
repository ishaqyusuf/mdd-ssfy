# Task Roadmap

## Purpose
Tracks durable workstreams that span multiple sessions and often multiple implementation phases.

## Current Workstreams
- Sales form hardening
- New sales form parity closure
- Sales overview system redesign
- Shared document platform migration
- Payment-system and resolution-system cutover
- Jobs and notification reliability improvements
- Expo sales, delivery, and dispatch workflow expansion
- Inventory-backed sales fulfillment cutover (`brain/features/inventory-backed-sales-fulfillment.md`)

## Planned Tasks

### Sales Orders Filtered Excel Export
- Priority: High
- Description: Implemented the historical Sales Orders Excel export on the current Sales Orders V2 page. The export button appears when filters are applied, or when rows are selected, and downloads the current filtered or selected order set as `.xlsx`.
- Related Feature: Sales orders, Sales Orders V2, spreadsheet reporting
- Status: Done
- Plan Status: Implemented
- Plan File: brain/plans/2026-07-10-spec-sales-orders-filtered-excel-export.md
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/41
- Created Date: 2026-07-10
- Completed Date: 2026-07-10
- Latest Implementation Note: Restored the report action in `SalesOrdersV2Header`, added tested export mapping/query helpers, and bridged table selection from UUID row ids to numeric sales order ids for selected exports. The client-side workbook uses `sales.getOrders`, `xlsx-js-style`, historical order overview links, money formatting, frozen header, widths, and autofilter.

### Unit Invoice Search Parity With Project Units
- Priority: High
- Description: Implemented the spec in GitHub issue https://github.com/ishaqyusuf/mdd-ssfy/issues/38 and plan in `brain/plans/2026-07-09-bug-fix-unit-invoice-search-parity.md`; fixed the Community Unit Invoices search mismatch where Breezewood Villas plus `/01` returned `8` invoice rows while Project Units returned `19`.
- Related Feature: Community unit invoices, project units, Community operations search
- Status: Done
- Plan Status: Implemented
- Plan File: brain/plans/2026-07-09-bug-fix-unit-invoice-search-parity.md
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/38
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Latest Implementation Note: Updated `whereUnitInvoices` so base `q` search includes `search`, `modelName`, `lotBlock`, `project.title`, and `project.builder.name`, matching Project Units visible text search while preserving existing invoice, production, installation, date, sort, pagination, totals, and modal behavior. Focused Community router query coverage now pins the shared visible search fields and project-scoped composition.

### Sales Email Status Alerts And Transaction Ledger
- Priority: High
- Description: Implemented the spec in GitHub issue https://github.com/ishaqyusuf/mdd-ssfy/issues/37 and plan in `brain/plans/2026-07-09-feature-sales-email-status-alerts-and-ledger.md`; added visible provider-result feedback for sales document emails plus a durable Email page where reps see attached email attempts and Super Admin can audit/resend failed emails.
- Related Feature: Sales quote/order document email, notifications, sales rep dashboard, sales audit
- Status: Done
- Plan Status: Implemented
- Plan File: brain/plans/2026-07-09-feature-sales-email-status-alerts-and-ledger.md
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/37
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Latest Implementation Note: Added `SalesEmailAttempt`, sales email ledger list/resend APIs, `/sales-book/emails`, provider-result task monitor failure handling, notification email delivery result persistence, skipped-attempt recording for missing send context, and Super Admin linked resend attempts. Database migration/application remains a deployment step.

### Production Database Performance Optimization
- Priority: High
- Description: Track plan in `brain/plans/2026-07-09-production-database-performance-optimization-plan.md`; optimize the production database hot paths identified in query insights, starting with notes tag lookups, SalesOrders/SalesStat summaries, Dyke/product report aggregates, auth/permission hydration volume, and search/list count pressure.
- Related Feature: Database performance, sales orders, notes/activity tree, inventory/product reports, auth/session handling, community project lists
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-07-09-production-database-performance-optimization-plan.md
- Created Date: 2026-07-09
- Latest Analysis Note: Production query-insights analysis found notes tag lookup as the largest total-time family (`1007s` across `2069` executions), followed by auth/session permission hydration volume (`326s` across `251615` executions), SalesOrders/SalesStat summary predicates (`275s`), Dyke/product aggregate reads (`160s`), and sales search/list count pressure (`160s`).

### Sales Order Sales Rep Transfer
- Priority: High
- Description: Implemented the PRD in `brain/plans/2026-07-08-feature-sales-order-sales-rep-transfer.md`; published GitHub issue https://github.com/ishaqyusuf/mdd-ssfy/issues/36 with `ready-for-agent`.
- Related Feature: Sales orders, sales rep dashboard, sales overview, sales ownership correction
- Status: Done
- Plan Status: Implemented
- Plan File: brain/plans/2026-07-08-feature-sales-order-sales-rep-transfer.md
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/36
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Latest Implementation Note: Added protected `sales.salesRepOptions` and `sales.transferSalesRep`, manager/current-owner transfer access, password confirmation, a sales overview `Change Rep` control, structured `SalesHistory` transfer audit metadata, overview DTO `salesRepId`, and focused mutation tests.

### Web Bug Reporting Workflow
- Priority: High
- Description: Track plan in `brain/plans/2026-07-07-feature-web-bug-reporting-workflow.md`; synthesized spec published to GitHub issue https://github.com/ishaqyusuf/mdd-ssfy/issues/40 with `ready-for-agent`.
- Related Feature: Web app, internal support feedback, bug reporting, Vercel Blob Storage
- Status: In Progress
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-07-feature-web-bug-reporting-workflow.md
- Spec File: brain/plans/2026-07-10-spec-web-bug-reporting-workflow.md
- Intake File: brain/intake/2026-07-07-web-bug-reporting-workflow.md
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/40
- Created Date: 2026-07-07
- Latest Implementation Note: 2026-07-10 spec publication captured the current web-first workflow, user stories, implementation decisions, and testing seams in GitHub issue #40. 2026-07-08 web-only implementation added the recorder button, Vercel Blob upload metadata path, bug report/follow-up schema, issue board, Super Admin status management, and Super Admin employee access toggle. Database migration/application remains blocked until the intended MySQL target is reachable.

### Desktop Feedback Issue Board
- Priority: High
- Description: Track plan in `brain/plans/2026-07-05-feature-desktop-feedback-issue-board.md`.
- Related Feature: Desktop app, support feedback, issue tracking
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-07-05-feature-desktop-feedback-issue-board.md
- Created Date: 2026-07-05

### Production-Only Sentry For Web And Mobile App
- Priority: Medium
- Description: Track plan in `brain/plans/2026-07-02-bug-fix-production-only-sentry-for-web-and-mobile-app.md`.
- Related Feature: Observability and mobile app reliability
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-07-02-bug-fix-production-only-sentry-for-web-and-mobile-app.md
- Created Date: 2026-07-02

### Sales Document WhatsApp And SMS Delivery
- Priority: High
- Description: Track plan in `brain/plans/2026-07-02-feature-sales-document-whatsapp-sms-delivery.md`.
- Related Feature: Sales quote/order document delivery
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-07-02-feature-sales-document-whatsapp-sms-delivery.md
- Intake File: brain/intake/2026-07-02-sales-document-whatsapp-sms-delivery.md
- Created Date: 2026-07-02

### Sales Order Inventory Repair On Order Updates
- Priority: High
- Description: Track plan in `brain/plans/2026-07-01-feature-sales-order-inventory-repair-on-updates.md`.
- Related Feature: Inventory-backed sales fulfillment
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-07-01-feature-sales-order-inventory-repair-on-updates.md
- Intake File: brain/intake/2026-07-01-sales-inventory-inbounds-tables-polish.md
- Created Date: 2026-07-01

### Sales Overview Inventory Inbounds UX And Action Gating
- Priority: High
- Description: Track plan in `brain/plans/2026-07-01-bug-fix-sales-overview-inventory-inbounds-ux-action-gating.md`.
- Related Feature: Sales overview inventory workflows
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-07-01-bug-fix-sales-overview-inventory-inbounds-ux-action-gating.md
- Intake File: brain/intake/2026-07-01-sales-inventory-inbounds-tables-polish.md
- Created Date: 2026-07-01

### Sales Book Inbounds Workspace Table Core Upgrade
- Priority: Medium
- Description: Track plan in `brain/plans/2026-07-01-ux-ui-sales-book-inbounds-table-core-upgrade.md`.
- Related Feature: Sales inbound management and inventory inbound workspace
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-07-01-ux-ui-sales-book-inbounds-table-core-upgrade.md
- Intake File: brain/intake/2026-07-01-sales-inventory-inbounds-tables-polish.md
- Created Date: 2026-07-01

### Community Table Density And Viewport Polish
- Priority: Medium
- Description: Track plan in `brain/plans/2026-07-01-ux-ui-community-table-density-viewport-polish.md`.
- Related Feature: Community operations tables
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-07-01-ux-ui-community-table-density-viewport-polish.md
- Intake File: brain/intake/2026-07-01-sales-inventory-inbounds-tables-polish.md
- Created Date: 2026-07-01

### Community Projects Table Migration And Action Menu Standardization
- Priority: Medium
- Description: Track plan in `brain/plans/2026-07-01-ux-ui-community-projects-table-action-standardization.md`.
- Related Feature: Community operations tables
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-07-01-ux-ui-community-projects-table-action-standardization.md
- Intake File: brain/intake/2026-07-01-sales-inventory-inbounds-tables-polish.md
- Created Date: 2026-07-01

### Inventory System Correctness Cutover
- Priority: High
- Description: Execute the hardening and cutover readiness plan for inventory-backed sales fulfillment, covering terminal-order read-only policy, demand/inbound mutation guards, receiving retry safety, allocation/backorder correctness, production/dispatch gates, reconciliation, browser proof, and final release gates.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: In Progress
- Plan Status: In Progress
- Plan File: brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md
- Source Intake: brain/intake/2026-06-15-inventory-cutover-pending-scope.md
- Related Intake: brain/intake/2026-06-22-sales-overview-inventory-workflows.md
- Pending Gate Intake: brain/intake/2026-07-01-inventory-correctness-pending-gates.md
- Intake Status: Confirmed. The June 15 source intake and June 22 related workflow intake remain the source intakes; the July 1 pending-gates intake is a user-requested consolidation of the active remaining gates and does not expand scope.
- Created Date: 2026-07-01
- Latest Completed Slices: Phase 0 invariant matrix, fulfilled/cancelled inventory read-only enforcement, Sales Overview Inventory active-tab/read-only UI, inbound create/assign parent-sale guards, route input validation and confirmed-write proof slices, Phase 8 repair-path audit/evidence runner/repair runner, reviewed stale/componentless repair apply evidence, sync stale-cleanup timestamp precision hardening, shipment/allocation classification evidence, missing-sales scope classification evidence, scoped active/order missing-sales batch evidence, materializable/mapping-blocked backfill classification, materializable active/order backfill apply evidence, zero-component componentless review evidence, zero-component source-shape classification evidence, HPT door component fallback, reviewed zero-component repair apply evidence, and eleven additional reviewed materializable backfill applies.
- Phase 0 Evidence: brain/reports/2026-07-01-inventory-correctness-invariant-matrix.md
- Latest Phase 8 Evidence: brain/reports/2026-07-01-inventory-reconciliation-evidence.md; current result is not clean (`needs_backfill`, `20449` missing sales, `0` componentless lines, `0` componentless sales, `9` shipment/allocation drift, `1` skipped comparison, `hasMore=true`, next cursor `208`). The previous `86` HPT zero-component lines were resolved, and eleven additional reviewed materializable active/order batches created `1323` more inventory sale lines while keeping componentless/stale evidence clear. Repairs are stopped by user request; if explicitly resumed, the latest repair plan starts with the next 50-id materializable active/order missing-sales batch (`244` materializable active/order candidates remain, `1380` active/order candidates are mapping-blocked), followed by non-active/mapping-blocked scope decisions and shipment/allocation review.
- Latest Ledger Correction: 2026-07-01 documentation-only alignment of the cutover plan, roadmap, in-progress ledger, done ledger, progress log, and reconciliation evidence after eleven additional reviewed materializable active/order backfill applies; this does not close the cutover.
- Latest Documentation Alignment: 2026-07-01 intake and pending-phase audit confirmed the roadmap state without new data repair or new evidence collection. Completed slices remain done evidence only; the roadmap workstream remains In Progress until Phase 11 release acceptance is recorded.
- Ledger Rule: Completed slices are recorded in `brain/tasks/done.md`, but the roadmap workstream stays In Progress until Phase 11 release acceptance is recorded in the cutover plan.
- Open Gates: clean Phase 8 reconciliation evidence after the stopped repair loop is explicitly resumed or product-scoped, non-active and mapping-blocked missing-sales scope is decided, and classified shipment/allocation blockers are resolved; Phase 1/2/3/4/5/6/7 operator proof gaps; Phase 9 UI polish; Phase 10 browser proof matrix; and Phase 11 release acceptance.
- Pending Phase Order: Phase 8 clean reconciliation -> Phase 1-7 operator proof gaps -> Phase 9 UI polish -> Phase 10 browser proof matrix -> Phase 11 release gates.
- Next Gate: repairs are stopped by user request. Do not run more repair dry-runs or applies unless repairs are explicitly resumed; if resumed, the next 50-id materializable active/order backfill batch is `2792` through `2884`. Meanwhile, decide the non-active/mapping-blocked missing-sales buckets and review the remaining shipment/allocation mismatch classes. Clean Phase 8 reconciliation evidence must be recorded before moving to the broad browser/operator proof matrix.

### Sales Payment C.C.C Record Visibility
- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-24-feature-sales-payment-ccc-record-visibility.md`.
- Related Feature: Sales payment v2 checkout
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-06-24-feature-sales-payment-ccc-record-visibility.md
- Created Date: 2026-06-24

### Mobile Invoice Save Web Control Diff
- Priority: High
- Description: Track plan in `brain/plans/2026-06-24-bug-fix-mobile-invoice-save-web-control-diff.md`.
- Related Feature: Mobile invoice form save reliability
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-06-24-bug-fix-mobile-invoice-save-web-control-diff.md
- Intake File: brain/intake/2026-06-24-mobile-invoice-save-web-control-diff.md
- Created Date: 2026-06-24

### Mobile Invoice Web Parity And Save Reliability Gap Closure
- Priority: High
- Description: Track plan in `brain/plans/2026-06-23-bug-fix-mobile-invoice-web-parity-and-save-reliability-gap-closure.md`.
- Related Feature: Mobile invoice form save reliability and web parity
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-06-23-bug-fix-mobile-invoice-web-parity-and-save-reliability-gap-closure.md
- Created Date: 2026-06-23

### Mobile Invoice Form Architecture Refactor
- Priority: High
- Description: Track plan in `brain/plans/2026-06-19-feature-mobile-invoice-form-architecture-refactor.md`.
- Related Feature: Mobile invoice form architecture
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-06-19-feature-mobile-invoice-form-architecture-refactor.md
- Created Date: 2026-06-19

### Inventory Pending 02 - Inventory Variant Supplier Price Sync To Dyke
- Priority: High
- Description: Track plan in `brain/plans/2026-06-12-feature-pending-02-inventory-variant-supplier-price-sync-to-dyke.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-12-feature-pending-02-inventory-variant-supplier-price-sync-to-dyke.md
- Created Date: 2026-06-12
- Completed Date: 2026-06-15

### Inventory Pending 03 - Production Assignment Completion Inventory Lifecycle Bridge
- Priority: High
- Description: Track plan in `brain/plans/2026-06-12-feature-pending-03-production-assignment-completion-inventory-lifecycle-bridge.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-12-feature-pending-03-production-assignment-completion-inventory-lifecycle-bridge.md
- Created Date: 2026-06-12
- Completed Date: 2026-06-15

### Inventory Pending 04 - Inventory Mode Dispatch Assign Pack Fulfill
- Priority: High
- Description: Track plan in `brain/plans/2026-06-12-feature-pending-04-inventory-mode-dispatch-assign-pack-fulfill.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-12-feature-pending-04-inventory-mode-dispatch-assign-pack-fulfill.md
- Created Date: 2026-06-12
- Completed Date: 2026-06-15

### Inventory Pending 05 - Shipment Record Decision
- Priority: High
- Description: Track plan in `brain/plans/2026-06-12-feature-pending-05-shipment-record-decision.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-12-feature-pending-05-shipment-record-decision.md
- Created Date: 2026-06-12
- Completed Date: 2026-06-15

### Inventory Pending 06 - Inventory Print Parity Dyke Golden Packets
- Priority: High
- Description: Track plan in `brain/plans/2026-06-12-feature-pending-06-inventory-print-parity-dyke-golden-packets.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-12-feature-pending-06-inventory-print-parity-dyke-golden-packets.md
- Created Date: 2026-06-12
- Completed Date: 2026-06-15

### Inventory Pending 07 - Inventory Reconciliation Jobs
- Priority: High
- Description: Track plan in `brain/plans/2026-06-12-feature-pending-07-inventory-reconciliation-jobs.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-12-feature-pending-07-inventory-reconciliation-jobs.md
- Created Date: 2026-06-12
- Completed Date: 2026-06-15

### Inventory Pending 08 - Production Readiness Gates
- Priority: High
- Description: Track plan in `brain/plans/2026-06-12-feature-pending-08-production-readiness-gates.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-12-feature-pending-08-production-readiness-gates.md
- Created Date: 2026-06-12
- Completed Date: 2026-06-15

### Inventory Pending 09 - Hold Until Complete Partial Shipment Screen
- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-12-feature-pending-09-hold-until-complete-partial-shipment-screen.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-12-feature-pending-09-hold-until-complete-partial-shipment-screen.md
- Created Date: 2026-06-12
- Completed Date: 2026-06-15

### Inventory Pending 10 - Repeat Receive Allocation Auto Release Guardrails
- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-12-feature-pending-10-repeat-receive-allocation-auto-release-guardrails.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-12-feature-pending-10-repeat-receive-allocation-auto-release-guardrails.md
- Created Date: 2026-06-12
- Completed Date: 2026-06-15

### Inventory Pending 11 - Inventory Item Dashboard
- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-12-feature-pending-11-inventory-item-dashboard.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-12-feature-pending-11-inventory-item-dashboard.md
- Created Date: 2026-06-12
- Completed Date: 2026-06-15

### Inventory Pending 12 - Inventory Variants Workspace
- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-12-feature-pending-12-inventory-variants-workspace.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-12-feature-pending-12-inventory-variants-workspace.md
- Created Date: 2026-06-12
- Completed Date: 2026-06-15

### Inventory Pending 13 - Top Sales Analytics By Inventory Item Variant
- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-12-feature-pending-13-top-sales-analytics-inventory-item-variant.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-12-feature-pending-13-top-sales-analytics-inventory-item-variant.md
- Created Date: 2026-06-12
- Completed Date: 2026-06-15

### Inventory Pending 14 - Stock Audit Verification
- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-12-feature-pending-14-stock-audit-verification.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-12-feature-pending-14-stock-audit-verification.md
- Created Date: 2026-06-12
- Completed Date: 2026-06-15

### Inventory Pending 15 - Inventory Browser Validation
- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-12-feature-pending-15-inventory-browser-validation.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: In Progress
- Plan Status: In Progress
- Plan File: brain/plans/2026-06-12-feature-pending-15-inventory-browser-validation.md
- Created Date: 2026-06-12

### Inventory Pending 16 - Inventory Operations Dashboard Stock Controls
- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-15-feature-inventory-operations-dashboard-stock-controls.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-15-feature-inventory-operations-dashboard-stock-controls.md
- Intake File: brain/intake/2026-06-15-inventory-cutover-pending-scope.md
- Created Date: 2026-06-15
- Completed Date: 2026-06-15

### Inventory Pending 17 - Inventory Cutover Gap Audit Execution Matrix
- Priority: High
- Description: Track plan in `brain/plans/2026-06-15-investigation-inventory-cutover-gap-audit.md`.
- Related Feature: Inventory-backed sales fulfillment cutover
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-15-investigation-inventory-cutover-gap-audit.md
- Intake File: brain/intake/2026-06-15-inventory-cutover-pending-scope.md
- Created Date: 2026-06-15
- Completed Date: 2026-06-15

### Mobile Template Interaction Architecture
- Priority: High
- Description: Track plan in `brain/plans/2026-06-23-ux-ui-mobile-template-interaction-architecture.md`.
- Related Feature: Mobile design-system preview templates
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-06-23-ux-ui-mobile-template-interaction-architecture.md
- Intake File: brain/intake/2026-06-23-mobile-template-completion.md
- Created Date: 2026-06-23

### Mobile Field Flow Complete Tabs And Route Overview
- Priority: High
- Description: Track plan in `brain/plans/2026-06-23-ux-ui-mobile-field-flow-tabs-route-overview.md`.
- Related Feature: Mobile design-system preview templates
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-06-23-ux-ui-mobile-field-flow-tabs-route-overview.md
- Intake File: brain/intake/2026-06-23-mobile-template-completion.md
- Created Date: 2026-06-23

### Mobile Ops Console Complete Tabs Search And Work Overview
- Priority: High
- Description: Track plan in `brain/plans/2026-06-23-ux-ui-mobile-ops-console-tabs-search-work-overview.md`.
- Related Feature: Mobile design-system preview templates
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-06-23-ux-ui-mobile-ops-console-tabs-search-work-overview.md
- Intake File: brain/intake/2026-06-23-mobile-template-completion.md
- Created Date: 2026-06-23

### Mobile Sales Ledger Complete Tabs Search And Order Overview
- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-23-ux-ui-mobile-sales-ledger-tabs-search-order-overview.md`.
- Related Feature: Mobile design-system preview templates
- Status: Roadmap
- Plan Status: Proposed
- Plan File: brain/plans/2026-06-23-ux-ui-mobile-sales-ledger-tabs-search-order-overview.md
- Intake File: brain/intake/2026-06-23-mobile-template-completion.md
- Created Date: 2026-06-23
