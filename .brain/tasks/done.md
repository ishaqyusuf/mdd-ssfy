# Done

### Sales Document Readiness And Guided Repair

- Priority: High
- Description: Replaced generic Sales preview/print/PDF/email preparation failures
  with a shared attested preflight, staged narrow repair, exact financial
  comparison, guarded transactional apply, audit history, and guided modal.
- Related Feature: Sales Document Readiness And Guided Repair
- Status: Done
- Validation: 53 focused tests / 161 assertions, Sales and Dashboard typechecks,
  scoped Biome and diff integrity, a read-only 20-order audit, and authenticated
  desktop/mobile browser QA for `08574PC`. API, Jobs, and Notifications broad
  checks retain unrelated existing baselines.
- Database Impact: No schema or migration change; existing Sales meta and
  resolution-system records are reused.
- Completed Date: 2026-09-01

### Status-only Fulfillment Completion

- Priority: High
- Description: Added administrative Fulfillment mark/cancel commands and UI,
  implied Production satisfaction without a synthetic record, canonical-proof
  precedence, restoration after cancellation, exact permission enforcement,
  explicit skipped-effect warnings, and method-aware provenance while leaving
  dispatch, proof, inventory, tax, accounting, notification, commission, payout,
  shipment, and integration authorities untouched.
- Related Feature: Status-only Sales Completion
- Status: Done
- Review: `.brain/reviews/2026-09-01-status-only-fulfillment-completion-review-v2.md`
- Validation: 38 focused tests / 115 assertions, Sales typecheck, filtered
  API/Dashboard typechecks, scoped Biome, and diff integrity. The first review's
  cancellation-provenance wording finding was fixed and regression-tested.
- Database Impact: No schema or migration change; Ticket 04 reuses the Ticket 03 ledger.
- Completed Date: 2026-09-01

### Status-only Production Completion

- Priority: High
- Description: Added the dedicated Sales completion ledger, exact view/edit
  permission contract, evidence-safe normalized resolver, transactional and
  idempotent audited Production mark/cancel commands, protected API routes, and
  permission-aware confirmation/history/cancellation UI while preserving every
  operational workflow authority.
- Related Feature: Status-only Sales Completion
- Status: Done
- Review: `.brain/reviews/2026-09-01-status-only-production-completion-review-v2.md`
- Validation: Local migration and invariants, Prisma generation, 33 focused
  tests / 90 assertions, DB and Sales typechecks, scoped Biome, diff integrity,
  and filtered Dashboard diagnostics. The first review's P1 canonical-evidence
  finding was fixed and regression-tested across legacy and split-dispatch
  scenarios.
- Completed Date: 2026-09-01

### New Sales Form Due Dates And Standard Summary Save

- Priority: High
- Description: Consolidated order-entry Due and Delivery Due into one
  Net-driven Fulfillment date, retained independent Production planning,
  limited fulfillment choices to Pickup and Delivery with the shared shadcn
  Select, and corrected the invoice-summary primary Save to use the standard
  final/Active save path and canonical navigation.
- Related Feature: New Sales Form / Sales Fulfillment
- Status: Done
- Validation: Focused sales-form UI, option, payload, and save-continuation
  regression coverage.
- Completed Date: 2026-08-31

### Sales Production Assignment Ledger Accordion

- Priority: Normal
- Description: Replaced the admin Production assignment row with the approved
  Option A shadcn Ledger Accordion. Collapsed rows expose operational metadata;
  expanded panels preserve the existing assignment/submission mutations and
  guards while presenting submission evidence as a responsive ledger.
- Related Feature: Sales Production Workspace / Sales Overview Production V2
- Status: Done
- Validation: 15 focused tests / 26 assertions; scoped Biome and whitespace;
  filtered Dashboard typecheck with no changed-file diagnostics; authenticated
  QA on `09488AD` and `09396PC` at desktop, 768px, and 390px with clean final
  browser logs.
- Follow-up: Replaced the disabled create-action alert with a compact shadcn
  hover tooltip while preserving the disabled action and the separate material
  verification warning. The admin create action now lives as a small rounded
  plus beside the assignment total; assignment calendar/delete actions sit
  independently before the chevron; the expanded area is a flat indented
  `Submissions (X of Y)` region with only its small rounded add button. The
  calendar uses a centered ghost treatment. A follow-up repaired live list
  refresh after assignment/submission mutations by refreshing the provider's
  local server-action snapshot as well as the broader Production queries. The
  final alignment pass establishes one right action gutter for heading pluses
  and row actions with the chevron at the outer edge, and the shared loading
  toast now dismisses completed delete notices correctly. The assignment form
  now reuses the Sales Form plus/minus quantity stepper, top-aligns Assign To
  with Due Date, and relies on a corrected shared calendar grid whose weekday
  headings and dates resolve to equal proportional columns. The form stacks on
  narrow sheets so quantity labels and availability counts remain separate.
- Completed Date: 2026-08-29

### Production/Fulfillment 20-Record Query And Batch Limits

- Priority: High
- Description: Standardized Production and Fulfillment operational reads on
  20-record requests, capped both bulk status tasks at 20 unique orders, and
  preserved actionable server-classified task-start errors in production UI.
- Related Feature: Sales Production Workspace / Sales Dispatch Table
- Status: Done
- Validation: 34 focused tests / 111 assertions; scoped Biome and whitespace
  checks; authenticated Production QA selected 40 loaded rows and received the
  exact 20-order limit before any Trigger run or record mutation.
- Completed Date: 2026-08-29

### Production Mark-All Terminal-Order Skip Repair

- Priority: High
- Description: Corrected stale Production lifecycle projection and made
  dependency resolution plus the durable parent reload completed-delivery
  evidence, so fulfilled/already-completed orders are skipped without aborting
  eligible selections or being submitted again.
- Related Feature: Sales Production Workspace / Sales Order Status Actions
- Status: Done
- Validation: 35 focused tests / 69 assertions; scoped Biome and whitespace
  checks; authenticated 40-row batch completion reduced Past Due exactly from
  1,058 to 1,018.
- Completed Date: 2026-08-29

### Inventory Attention Dialog Backdrop Dismissal

- Priority: Normal
- Description: Allowed the shared Sales status dependency-attention modal to
  close from a backdrop click while keeping dismissal locked during active
  inventory and production resolution.
- Related Feature: Sales Order Status Actions / Sales Production Workspace
- Status: Done
- Validation: 5 focused tests / 13 assertions; scoped formatting and whitespace
  checks; authenticated Production-page outside-click QA with no live batch
  action and no console errors.

### Production Mark-All and Single-Run Completion Batch

- Priority: High
- Description: Added a tri-state Mark All checkbox for loaded admin Production
  rows and moved Production Completed from one task start per order to one
  durable monitored bulk parent with server lifecycle rechecks, bounded
  idempotent children, and truthful per-outcome summaries.
- Related Feature: Sales Production Workspace / Sales Order Status Actions
- Status: Done
- Validation: 18 focused tests / 51 assertions; scoped Biome and whitespace
  checks. Authenticated local QA selected 40 loaded overdue rows and verified
  Past Due decreased exactly from 1,099 to 1,059 after the terminal run.
- Completed Date: 2026-08-29

### Guarded Packing Policy Relaxation And Driver Notification

- Priority: High
- Description: Unified guarded-packing settings into one card with visible
  disabled dependent controls, made the current policy authoritative for
  pending-review delivery gating, retained immutable pending approval evidence,
  reconciled fully verified dispatches, and notified assigned drivers when a
  strict approval hold is relaxed.
- Related Feature: Sales Dispatch Table / Driver Platform Revival
- Status: Done
- Validation: 33 direct policy/reconciliation/notification tests pass; the
  expanded focused run passes 65 tests with five pre-existing inventory-fixture
  failures caused by missing packing-report mocks. Targeted Biome and whitespace
  checks pass. Browser verification is blocked by the existing
  `packages/jobs/src/schema.ts` `actor is not defined` runtime error.
- Completed Date: 2026-08-29

### Shared Sales/Production Batch Status Actions

- Priority: High
- Description: Added admin Production row/card selection and a floating batch
  status bar that reuses the canonical Sales Orders Mark-as workflow. Both
  Sales Orders and Production batches now skip orders already past production
  completion or fulfillment before any preflight or task write.
- Related Feature: Sales Production Workspace / Sales Order Status Actions
- Status: Done
- Validation: 38 focused tests / 79 assertions; targeted Biome and whitespace
  checks; changed-file typecheck filtering; authenticated in-app browser proof
  with no live mutation submitted.
- Completed Date: 2026-08-29

### Full Local-Browser Sales QA

- Priority: High
- Description: Completed authenticated local-database QA for Pablo's persisted
  price problem, full-component quote creation/editing, quote-to-sale conversion,
  historical-sale copy, Door/HPT/Moulding/Shelf/Service add/edit/remove/re-add,
  duplicate/reorder, reviewed adjustments, print parity, stale conflict, retry,
  invalid input, timing, console health, and relational integrity. Nine defects
  were fixed, including final grouped-reduction cleanup, accessible non-blocking
  delete confirmation, and uncertain post-commit response recovery.
- Related Feature: New Sales Form System Hardening
- Status: Done
- Plan File: `.brain/plans/2026-08-26-sales-full-local-browser-qa.md`
- QA Report: `.gstack/qa-reports/sales-full-2026-08-26/qa-report.md`
- Validation: authenticated Chrome/editor/preview proof; exact local fixture
  database audit; 139 tests / 475 assertions across 14 files; targeted Biome;
  `@gnd/ui` typecheck; changed-path typecheck review; `git diff --check`.
- Completed Date: 2026-08-27

### Reversible Inbound Needs Application

- Priority: High
- Description: Kept the existing Received status workflow while making the
  transition apply linked inbound demand to material Needs transactionally.
  Historical Received shipments can be applied explicitly, and applied Needs
  can be unapplied through guarded Event snapshots without reversing stock. A
  global floating attention queue now identifies Received-but-unapplied legacy
  gaps and supports row or bounded batch application. Page-level floating
  controls remain beneath modal and sheet overlays.
- Related Feature: Inbound Needs Application
- Status: Done
- Feature File: `.brain/features/inbound-needs-application.md`
- Decision: `.brain/decisions/ADR-071-reversible-inbound-needs-application.md`
- Validation: focused domain/API/UI/query-event tests pass; authenticated local
  browser validation covered the four historical gaps, modal details, selection
  action, and successful `09437PC` legacy adaptation. Broad typecheck/build
  validation remained deferred by command policy.
- Completed Date: 2026-08-26

### Unassigned Inbound Demand Quantity-Reduction Prompt

- Priority: High
- Description: Corrected Sales Change Review so automatically projected,
  unassigned material demand does not appear as created inbound activity. Only
  reduced quantity linked to an active inbound shipment offers Cancel Open
  Inbound or Keep For Warehouse.
- Related Feature: In-form Sales Order Adjustments
- Status: Done
- Plan Status: Done with 2026-08-24 correction
- Plan File: `.brain/plans/2026-08-19-bug-fix-sales-quantity-decision-gating.md`
- Bug File: `.brain/bugs/2026-08-24-unassigned-inbound-demand-triggered-shipment-disposition.md`
- Validation: 21 focused tests / 51 assertions pass; authenticated local
  browser proof on `09407PC` shows no inbound disposition for an unsaved 38 ->
  37 reduction when no inbound shipment exists, with the value restored and no
  save submitted.
- Completed Date: 2026-08-24

### Mobile Delivery Module Logic Hardening

- Priority: High
- Description: Upgraded Expo driver and warehouse-delivery behavior to the
  current packing, inventory, guarded-review, lifecycle, proof, permission,
  freshness, notification, search, and summary contracts while preserving the
  accepted mobile UI flow.
- Related Feature: Driver Platform Revival and inventory-backed fulfillment
- Status: Done
- Plan Status: Done
- Plan File: `.brain/plans/2026-08-23-mobile-delivery-module-logic-hardening.md`
- Handoff File: `.brain/handoffs/completed/2026-08-23-mobile-delivery-module-logic-hardening-handoff.md`
- Review File: `.brain/reviews/2026-08-23-mobile-delivery-module-logic-hardening-review.md`
- Validation: 83 focused tests / 500 assertions pass; post-review subsets pass
  24 tests / 79 assertions and 20 tests / 38 assertions; scoped Biome and
  owned-path whitespace checks pass. Broad API/Expo typechecks retain unrelated
  baseline diagnostics with no new changed-dispatch runtime diagnostic.
- Follow-up: Android/device and sequential screen UI review remains behind the
  user's explicit permission gate. Each screen will receive five design-html
  samples and wait for approval before the next screen.
- Completed Date: 2026-08-23

### Driver Dispatch Lifecycle and Guarded Approval

- Completed: 2026-08-23.
- Scope: Midday route shell, Design A stop workspace, shared floating packing
  sheet, guarded packing consent/review, desktop trip actions, signed proof
  completion, admin assignment, pending-material production consent,
  sales-rep/worker notifications, authenticated Chrome/in-app-browser
  acceptance, and focused regression suite.
- Evidence: `artifacts/dispatch-lifecycle-20260823/`.
- Decision: `.brain/decisions/ADR-068-guarded-fulfillment-and-production-review-authority.md`.

### Paid Sales Operational Handoff

- Priority: High
- Description: Added the Super-Admin-configurable payment trigger, durable
  Material and Production action epochs, the six-at-a-time Sales Orders alert,
  permanent Needs Action tab with unique-order count, protected operational
  deep links, New York business-day Super Admin escalation, guarded production
  and packing review, and bounded recurring repair.
- Related Feature: Paid Sales Operational Handoff
- Status: Done
- Plan Status: Completed — all seven approved tracer-bullet tickets
- Map File: `.scratch/paid-sales-operational-handoff/map.md`
- Spec File: `.scratch/paid-sales-operational-handoff/spec.md`
- Tickets Directory: `.scratch/paid-sales-operational-handoff-implementation/issues/`
- Feature File: `.brain/features/paid-sales-operational-handoff.md`
- Decisions: `.brain/decisions/ADR-063-guarded-worker-production-reporting-and-separate-packing-review.md`; `.brain/decisions/ADR-064-organization-scoped-sales-handoff-escalation.md`
- Validation: 75 handoff tests, 75 guarded production/packing tests, 49 task
  authorization tests, 44 Dashboard workflow tests, authenticated browser
  evidence for all seven slices, 122 migrations current, zero schema diff,
  scoped Biome, and `git diff --check`. Broad workspace typechecks retain
  documented unrelated baseline failures.
- Completed Date: 2026-08-23

### Implement Make Payment Hidden Printing And Adaptive Methods

- Priority: High
- Description: Replaced popup-based post-payment printing with the awaited
  hidden same-page viewer and replaced separate Check/Terminal fields with one
  adaptive, availability-aware payment method control.
- Related Feature: Sales Payment Processor and Sales Printing
- Status: Done
- Plan Status: Implemented
- Plan File: `.brain/plans/2026-08-21-sales-payment-headless-print-and-method-control.md`
- Validation: 69 focused tests / 169 assertions; focused TypeScript diagnostics
  for eight implementation files; `git diff --check`. Browser/payment
  acceptance was not run because it requires separate authorization.
- Completed Date: 2026-08-21

### Sales Overview General V2 Controlled Rollout

- Priority: High
- Description: Implemented the approved Split Command Center as the versioned
  General renderer inside the canonical Sales Overview sheet, with a typed
  Super Admin-managed office/pilot policy, dedicated V2 composition and
  skeleton, measured same-endpoint projection, preserved non-General tabs, and
  reversible V1 compatibility.
- Related Feature: Sales Overview General tab
- Status: Done
- Plan Status: Done
- Decision: `.brain/decisions/ADR-060-versioned-general-tab-rollout-inside-canonical-sales-overview.md`
- Performance: Representative orders fell from 24–25 to 14–15 database
  queries, 6.4–7.2 KB to 5.4–5.5 KB, and 14.5–15.3 ms to 8.7–10.0 ms warm
  median latency; all 34 V2-consumed fields matched the compatibility loader.
- Validation: 45 focused tests / 376 assertions; targeted Biome; touched-path
  API/Dashboard type scans; authenticated 390×844 and 1280×720 browser proof;
  keyboard/focus acceptance; genuine Super Admin management-screen save; two
  representative V2 orders; current Transactions fallback; reload persistence;
  and no new browser application error.
- Post-cutover polish: Authenticated order `09405PC` proof confirmed the
  approved contextual header, three-command row, packing action inside More,
  0px command/grid join, borderless 280px financial rail, and 390px viewport
  with no horizontal overflow. The incremental focused run passed 30 tests /
  85 assertions; targeted Biome and touched-file type scans remained clean.
- Financial/fulfillment polish: General V2 now uses the typed cents-based
  financial breakdown, distinguishes recorded card settlement from pending
  estimates, keeps Balance structural, presents current-revision Special Order
  evidence on demand, moves delivery and rep controls into popovers, retains
  compact address/P.O. editors, and reduces Operations to Production and
  Fulfillment. Refund reconciliation, delivery permission/date projection, and
  keyboard-native rep selection passed the final review. Focused validation
  passes 51 tests / 241 assertions.
- Special Order disclosure refinement: removed the nested management dialog
  from General V2 and surfaced each applicable action directly in the expanded
  Fulfillment signal. Enrollment now uses a reasonless inline confirmation,
  while V1 and the canonical mutation/permission controller remain intact.
  Focused validation passed 22 tests / 135 assertions; authenticated browser
  QA covered governed and ungoverned orders without submitting a mutation.
- Fulfillment calendar refinement: replaced the browser-native date input in
  the General V2 Delivery popover with the shared Shadcn single-date Calendar
  rendered directly in the popover, retaining date-only save semantics,
  explicit Save/Cancel, permissions, and focused invalidation. Removed the
  helper subtitle and nested date trigger, and moved the distinct slanted
  `Edit3` pencil to the far right of the compact Delivery row. Final validation
  passed 10 tests / 99 assertions, scoped Biome, and authenticated browser QA
  without saving order data.
- Rollout: User-approved local office cutover persisted
  `officeDefault: v2` and `superAdminPreview: v2` on 2026-08-21. V1 remains a
  temporary rollback renderer and is not the office default.
- Completed Date: 2026-08-21

### Implement Grouped Sales Payment Summaries

- Priority: High
- Description: Added one cents-based payment-domain projection that groups
  successful receipts by canonical method, totals exact recorded C.C.C./tips,
  emits a receipt-count row only above one, and drives Sales Overview, mobile,
  and invoice HTML/PDF summaries without collapsing audit ledgers.
- Related Feature: Sales payments, Sales Overview, mobile sales, and Sales PDF
- Status: Done
- Plan Status: Done
- Plan File: `.brain/plans/2026-08-21-feature-grouped-sales-payment-summaries.md`
- Validation: 46 focused tests / 154 assertions; `@gnd/sales` typecheck;
  authenticated browser proof on `09397LM` for grouped invoice details and two
  retained Transactions rows.
- Completed Date: 2026-08-21

### Implement Square Refunds For Sales

- Priority: Critical
- Description: Replaced the unsafe legacy Square refund behavior with a
  provider-first immutable lifecycle, canonical tender identity, exact
  multi-order accounting, webhook/reconciliation handling, dedicated
  permission, shared Sales Overview/Finance experience, and customer/internal
  activity and notification evidence.
- Related Feature: Square Sales Refunds
- Status: Done
- Plan Status: Done
- Wayfinder: `.scratch/square-refunds/map.md`
- Validation: 32 focused tests / 326 assertions; Prisma generation and local
  additive migration; authenticated desktop/mobile Sales Overview and Sales
  Finance browser QA; real `$1.00` Square sandbox payment and completed refund.
- Rollout: Local development is forced to sandbox. Production enablement,
  webhook subscription, and a separately approved controlled production proof
  remain rollout operations rather than implementation work.
- Completed Date: 2026-08-21

### Add A Dedicated Mark Sales Order Fulfilled Permission
- Priority: High
- Description: Track plan in `.brain/plans/2026-08-20-bug-fix-sales-fulfillment-permission-alignment.md`.
- Related Feature: Sales status actions, dedicated fulfillment permission, and inventory-backed fulfillment
- Status: Done
- Plan Status: Done
- Plan File: .brain/plans/2026-08-20-bug-fix-sales-fulfillment-permission-alignment.md
- Intake File: .brain/intake/2026-08-20-pablo-sales-po-fulfillment-and-status-feedback.md
- Created Date: 2026-08-20
- Completed Date: 2026-08-20
- Checks: 48 focused tests / 357 assertions passed; scoped Biome, changed-file compiler filtering, and `git diff --check` passed.
- Notes: Updated on 2026-08-24 to use the canonical view-only
  `viewMarkSalesOrderFulfilled` capability and
  `view mark sales order fulfilled` record. Legacy direct grants remain valid
  and migrate on the next role/employee save. The code does not auto-grant the
  permission; authenticated non-Super-Admin proof remains a rollout step.

- [x] 2026-08-19 — Restore Special Order approval-link copying for synced or
  signing-key-rotated requests. Link preparation now replaces unverifiable
  active capabilities once. Focused tests and authenticated in-app browser
  acceptance passed on order `09369LM`; the development shell's isolated
  clipboard is not treated as product behavior.

- [x] 2026-08-18 — Complete Sales Production admin workspace modernization
  (Sequence 04/P1+P4): promoted `/sales-book/productions`, adopted the Sales
  Finance title/summary/PageTabs/search system, separated Active/Review/
  Completed work state from Table/Calendar display state, added responsive
  queue cards and a bounded daily agenda, preserved Sales Overview production
  opening, and retained `/v2` as a query-preserving compatibility redirect.
  Validation passed 37 focused tests / 160 assertions, Sales package typecheck,
  responsive authenticated browser proof at 375/768/1440, and scoped compiler
  filtering with zero production diagnostics. The dashboard build compiled and
  stopped only when page-data collection encountered unavailable environment
  secrets; the repository-wide dashboard typecheck retains unrelated baseline
  diagnostics.

- [x] 2026-08-18 — Implement Dispatch Admin and driver delivery modernization
  (Sequence 06): added the Sales Finance/Midday-style six-view admin workspace,
  shared lifecycle and risk projection, backlog creation flow, URL-owned action
  and detail sheet, durable dispatch exceptions, inventory-safe bulk handling,
  and one server-owned mobile driver manifest with next-stop, directions, and
  exception workflows. The operator explicitly deferred remaining automated
  tests and broad browser/device QA; those remain release gates in the
  authoritative plan. A later authenticated relation error was fixed by
  applying the additive migration locally and restarting the stale dashboard.

- [x] 2026-08-17 — Align Special Order classification colors with active state:
  inactive choices remain neutral, active No is red, and active Yes is green in
  both the invoice summary and confirmation dialog. The shared success tokens
  are now exposed to Tailwind utilities. Focused tests and authenticated browser
  QA passed without changing or saving order `09338PC`.

- [x] 2026-08-17 — Keep new-sales-form House Package Tool quantity and swing
  inputs focused while editing. HPT row keys now use stable persisted or draft
  identity instead of mutable quantity/swing values. HPT, Moulding, Service,
  and Shelf quantity controls now reserve enough width for three-digit values,
  with fixed table columns expanded where required. Focused tests, Sales
  typecheck, and authenticated browser reproduction on `09326LM` passed without
  saving the order; live HPT and Moulding inspection increased the numeric input
  from 38px to 54px.

- [x] 2026-08-17 — Repair public Special Order approval submissions against the
  current shared production Blob store. Encrypted signature uploads now resolve
  the store's configured public/private access mode while retaining an explicit
  private-store override, unpersisted Blob URLs, and authenticated decryption.
  Focused storage and response validation passed 7 tests / 17 assertions.

- [x] 2026-08-17 — Prevent silent duplicate customer creation by searching for
  likely matches as the create form is completed, blocking an exact existing
  phone number, and offering a direct `Use customer` or `Open customer` path.
  Suggestions now use an animated, horizontally scrollable ticket rail below
  Name with bounded arrow controls and complete hover/focus details. Duplicate
  writes return an actionable conflict message instead of failing silently.
  Focused tests, API typecheck, Biome, and authenticated browser QA passed.

- [x] 2026-08-14 — Gate only new Special Order enrollment behind a
  Super Admin-controlled `SUPER_ADMIN_ONLY` pilot audience, with an
  authoritative save transition check and an `ALL_STAFF` release option.
  Existing marked-order visibility, approval, Sales Overview, email, document,
  notification, reapproval, and operational enforcement behavior remains
  unchanged. Focused validation passed with 121 tests / 523 assertions and
  authenticated browser evidence.

- [x] 2026-08-13 — Complete the whole-order Special Order acknowledgment and
  customer-signature workflow: mandatory declaration, canonical-email repair,
  revision-bound single-use approvals, policy/version history, encrypted
  signatures, state-aware documents and email, Super Admin enforcement modes,
  shared operational gates, warning feedback, removal/re-enrollment, rollout
  telemetry, and durable activity/delivery evidence. All 14 local tickets and
  140 acceptance criteria are closed. Focused validation passed with 77 tests /
  290 assertions, API/Sales/Email/PDF typechecks, local schema generation/push,
  and authenticated/public desktop and mobile browser QA. See ADR-053,
  `.brain/features/special-order-acknowledgment.md`, and
  `.scratch/special-order-acknowledgment/map.md`.

- [x] 2026-08-06 — Standardize the shared custom sheet on the Midday frame and
  motion scale; add independent additive pane widths, a 1px divider,
  deterministic narrow fallback, delayed animated cleanup, pane-owned primary
  footer, focus restoration, and secondary-first outside dismissal without
  click-through. Sales Overview now uses `2xl + 2xl`; all current secondary
  flows passed focused tests and authenticated in-app browser QA. See ADR-051
  and `.brain/features/sales-overview.md`.

- [x] 2026-08-06 — Implement safe, auditable, single-order layer cancellation
  for Sales production and fulfillment: lazy preview/reason dialog, typed
  blockers, serializable stale-revision checks, idempotent ledger, automatic
  production/payment/payroll cleanup, reversible dispatch unpacking, preserved
  physical/manual evidence, lifecycle projection correction, permissions,
  query events, focused tests, and authenticated local browser QA. No build or
  deployment ran. See ADR-049 and
  `.brain/features/sales-order-status-actions.md`.

- [x] 2026-08-05 — Repair systemic sales inventory projection failures and
  false `N/A` states across grouped Service/Shelf lines, stale positive
  projections, and legacy non-produceable service rows; add guarded,
  spinner-backed `N/A` verification for active orders. The same Inventory
  polish pass separates Available and Ordered coverage and restores flat-row
  dividers and hover feedback. Both Create inbound item lists now use the same
  flat divided/hover row treatment and a bounded grouped quantity control with
  an inline `/required` suffix. See
  `.brain/bugs/2026-08-05-systemic-sales-inventory-projection-repair.md` and
  ADR-047.

- [x] 2026-08-04 — Implement customer-approved quantity increases/reductions
  for existing sale items inside the new sales form, including commitment
  warnings, immutable comparison, guarded saves, manual approval link,
  due-first wallet settlement, idempotent application, inventory reconciliation,
  and sales-history follow-up. See
  `.brain/features/in-form-sales-order-adjustments.md` and ADR-045.

- [x] 2026-08-03 — Make autosave opt-in for the shared new sales form: newly
  created and hydrated orders and quotes now begin with autosave off while the
  existing session toggle and manual saves remain available. See
  `.brain/decisions/ADR-043-new-sales-form-manual-save-default.md`.

- [x] 2026-08-03 — Stop the shared protected sidebar from viewport-prefetching
  every rendered route, eliminating speculative page/server-query execution and
  its `/api/auth-session` function amplification. See
  `.brain/decisions/ADR-042-protected-sidebar-prefetch-cost-boundary.md`.

- [x] 2026-07-31 — Prevent duplicate orders from stale new-form autosaves,
  preserve newer dirty edits across older save completions, and keep configured
  door/material totals nonzero when customer-profile repricing encounters zero
  base-price placeholders. See
  `.brain/bugs/2026-07-31-new-sales-form-autosave-duplicates-profile-zero-totals.md`.

- [x] 2026-07-30 — Make the new sales form the default for create/edit
  order/quote routes, preserve the legacy fallback with per-user preference,
  remove experimental links, and add Super Admin adoption reporting.

### Next.js 16.2.12 Workspace Upgrade
- Status: Done
- Description: Upgraded the shared Next.js catalog from `16.2.10` to
  `16.2.12` for dashboard, dealership, storefront, and shared framework
  consumers. Aligned dashboard/storefront `eslint-config-next` and storefront
  `@next/mdx`, then regenerated the Bun lockfile.
- Validation: Frozen-lock install and all three app runtime version checks
  pass. Dealership typecheck passes. Dashboard and storefront typechecks reach
  their documented unrelated repository baselines with no Next.js-family
  diagnostic. The dealership production build reports Next.js `16.2.12` before
  Turbopack is blocked from binding an internal worker port by the sandbox; the
  required unsandboxed retry could not be authorized because the approval
  service was usage-limited.
- Completed Date: 2026-07-30

### Sales Performance Excel Reports
- Status: Done
- Description: Replaced the old page-local report dropdowns with one descriptive
  Reports catalog in the top-right header throughout the Sales environment. The
  unified menu contains six filter-aware sales-performance workbooks plus the
  existing Sales Reports, Sales Finance, receivables, customer statements,
  detailed product, and scheduled payment report workflows. Workbooks retain
  auditable sheets, a 10,000-source-record guard, and a dedicated export
  permission.
- Feature File: `.brain/features/sales-dashboard-reporting.md`
- Decision File:
  `.brain/decisions/ADR-038-sales-reporting-surface-boundaries.md`
- Validation: 42 focused workbook/schema/query/permission/export/navigation/UI
  tests / 450 assertions, Sales package typecheck, targeted Biome, and
  successful route compilation. Authenticated browser QA verified the same
  complete descriptive menu on `/sales-book/reports` and `/sales-rep`.
  A browser-triggered workbook download was not submitted during this pass.
- Completed Date: 2026-07-30

### Production Worker Submission Material Verification And Admin Approval
- Status: Done
- Description: Made production assignment and submission independent of
  inventory readiness; unresolved work is saved under an admin material review
  with mixed canonical inbound/manual resolution, worker/admin notification,
  reported-versus-finalized quantity separation, rejection voiding, and
  approval-time payroll/payment finalization.
- Feature File: `.brain/features/sales-production-workspace.md`
- Decision File:
  `.brain/decisions/ADR-039-nonblocking-production-submission-material-review.md`
- Migration:
  `20260730113000_production_submission_material_review`
- Validation: 65 focused domain, transaction, permission, authority, inventory,
  and production-readiness tests / 234 assertions; Sales, DB, Jobs, and
  Notifications typechecks; touched-dashboard type scan; Prisma generation and
  local schema push; authenticated browser proof on order `09068PC`.
- Completed Date: 2026-07-30

### Sales Dashboard And Reporting Redesign
- Status: Done
- Description: Replaced the legacy dashboard with a fixed, period-aware
  operational overview; added protected, office-scoped reporting projections;
  created a customizable Sales Reports workspace and governed report catalog;
  preserved Sales Finance as the canonical collections/receivables surface;
  and marked the Sales Finance and Sales Reports sidebar links with `New`
  badges.
- Feature File: `.brain/features/sales-dashboard-reporting.md`
- Decision File:
  `.brain/decisions/ADR-038-sales-reporting-surface-boundaries.md`
- Validation: 42 focused domain/query/permission/layout/navigation tests,
  Sales and Site Nav package typechecks, targeted Biome, whitespace checks, and
  authenticated browser proof at desktop and `390x844`, including live
  period changes, report customization, and zero document-level mobile
  overflow.
- Completed Date: 2026-07-30

### Contractor Accounting Ledger and Reporting
- Status: Done
- Description: Replaced mutable-source contractor reporting with an immutable,
  Decimal, idempotent ledger; dual-write and batched backfill; reversal and
  close/reopen controls; reconciliation issues; six filter-aware report kinds;
  durable report runs/schedules; tax readiness; and a Sales Orders/Midday-style
  filtered virtual ledger and control center.
- Feature File: `.brain/features/contractor-accounting.md`
- Decision Files:
  `.brain/decisions/2026-07-29-contractor-accounting-period-reports.md` and
  `.brain/decisions/2026-07-30-contractor-accounting-immutable-ledger-cutover.md`
  and
  `.brain/decisions/2026-07-30-contractor-accounting-workspaces.md`
- Migrations:
  `20260729213535_contractor_accounting_decimal_money` and
  `20260729230000_contractor_accounting_ledger`,
  `20260730090000_contractor_accounting_workspace`, and
  `20260730104500_contractor_accounting_alert_delivery`
- Validation: exact local and production January-August legacy/ledger parity;
  16,940 production rows after an idempotent backfill rerun; report artifact
  exercises for all six kinds; focused domain/API/job/PDF/dashboard coverage;
  package typechecks and Biome; authenticated browser proof; 110 applied local
  migrations; and an empty local schema diff. The immutable-ledger production
  schema remains verified; workspace migrations await an explicit production
  deployment.
- Completed Date: 2026-07-30

### Automatic Sales Inventory Synchronization Fallback
- Status: Done
- Description: Automatically synchronizes repairable not-synced/failed orders
  when Inventory opens, retains a manual retry on failure, permits safe
  resynchronization of active legacy rows, embeds safe retired-row cleanup,
  excludes current demand from repair previews, and refreshes the infinite
  Sales Orders Inbound column cache after completion.
- Feature File: `.brain/features/inventory-backed-sales-fulfillment.md`
- Validation: 48 focused tests / 101 assertions, scoped Biome and diff checks,
  plus authenticated browser proof on order `09049LM`.
- Completed Date: 2026-07-29

### Sales Production And Inventory Readiness Parity
- Status: Done
- Description: Aligned Production material readiness with Inventory's
  canonical tracking policy and explicit manual-fulfillment state. Not Needed
  rows no longer become production blockers, and fulfilled monitored needs are
  resolved without fabricating stock, allocation, inbound, or receipt values.
  Readiness is not loaded or displayed when the tab has no production-capable
  lines.
- Feature File: `.brain/features/production-readiness-override.md`
- Validation: 45 focused tests / 117 assertions, passing `@gnd/sales`
  typecheck, clean scoped diff checks, and authenticated browser proof on order
  `00003DPP` across Production and Inventory.
- Completed Date: 2026-07-29

### Vercel Monorepo Web-App Upload Boundary Fix
- Status: Done
- Description: Restored dashboard, dealership, and storefront workspace
  discovery by removing API-specific app exclusions from the repository-wide
  `.vercelignore`.
- Bug File:
  `.brain/bugs/2026-07-28-vercel-shared-ignore-excluded-web-apps.md`
- Validation: The focused deployment-boundary regression passes 4 tests and
  Turbo discovers `@gnd/dashboard` for the production build instead of
  reporting zero packages.
- Completed Date: 2026-07-28

### Community Model Cost Blank-Date Save Fix
- Status: Done
- Description: Restored New Cost persistence from Community Unit Invoices by
  omitting a blank optional Start Date so the required database column can use
  its default, while preserving transactional cost/tax synchronization.
- Feature File: `.brain/features/unit-invoices-table.md`
- Bug File:
  `.brain/bugs/2026-07-27-community-model-cost-null-start-date.md`
- Validation: Focused regression, Community router, and permission tests passed
  with 20 tests / 242 assertions; API typecheck, focused Biome, authenticated
  read-only browser reproduction, and scoped diff checks passed.
- Completed Date: 2026-07-27

### Sales P.O. Persistence And Address-Only Overview Editing
- Status: Done
- Description: Removed the new-form autosave cleanup loop that caused maximum
  update depth failures, synchronized P.O. metadata across new, legacy, and
  overview saves, added overview saving/saved/failed feedback, and added
  independent address-only billing/shipping editing for orders and quotes.
- Feature Files: `.brain/features/sales-form-system-hardening.md`,
  `.brain/features/sales-overview.md`,
  `.brain/features/sales-customer-editing.md`
- Bug File: `.brain/bugs/sales-po-save-update-depth.md`
- Validation: 28 focused tests / 52 assertions, 22 new-sales-form relational
  parity tests, clean `@gnd/sales` and `@gnd/api` typechecks, authenticated
  browser proof on order `08869PC` and quote `03329LRG`, and scoped diff
  checks. Broad WWW typecheck remains red on the documented unrelated
  repository baseline.
- Completed Date: 2026-07-24

### Canonical Sales Overview Consolidation
- Status: Done
- Description: Discontinued the unused Sales Overview V2 page/sheet and
  consolidated all order/quote opening on the canonical Sales Orders workspace
  and URL-driven production sheet. Added active-tab-only rendering, one typed
  open contract, pure production reads, request-local selects, and protected
  overview permissions.
- Feature File: `.brain/features/sales-overview.md`
- Decision:
  `.brain/decisions/ADR-028-canonical-sales-overview-workspace-and-sheet.md`
- Report:
  `.brain/reports/2026-07-23-sales-overview-legacy-v2-midday-review.md`
- Validation: 18 focused tests, passing `@gnd/sales` and `@gnd/api`
  typechecks, clean V2 runtime scans, scoped diff checks, and filtered web
  diagnostics against the existing WWW baseline.
- Completed Date: 2026-07-23

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
### Storefront Customer Profile Pricing And Promotions
- Priority: High
- Description: Added canonical customer-profile pricing precedence and
  scheduled percentage campaigns targeted by customer/profile and
  category/offer. Pricing now flows through product configuration, cart,
  checkout, shipping validity, and canonical Sales persistence, with admin
  settings/campaign management and shopper announcement, badge, slash-price,
  savings, and discount-summary presentation.
- Related Feature:
  `.brain/features/storefront-profile-pricing-promotions.md`
- Plan File:
  `.brain/plans/2026-07-24-feature-storefront-profile-pricing-promotions.md`
- Decision:
  `.brain/decisions/ADR-029-storefront-profile-pricing-and-promotions.md`
- Validation: 25 focused tests / 71 assertions, passing sales/API/storefront
  typechecks, focused Biome, storefront production build, authenticated admin
  browser proof, and storefront campaign banner/card proof. Local schema push
  passed and its disposable campaign fixture was removed.
- Production Rollout: read-only preflight contained only five additive tables
  and indexes; `push:prod` passed and the post-push diff is empty. The separate
  master-password shadow-history defect remains documented.
- Completed Date: 2026-07-24

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
- Evidence: apps/dashboard/src/lib/query-events; apps/dashboard/src/trpc/query-client.ts; apps/dashboard/src/trpc/client.tsx; apps/dashboard/src/types/react-query.d.ts; apps/dashboard/src/hooks/use-sales-query-client.ts
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
- Evidence: packages/db/src/schema/task-run-diagnostics.prisma; apps/api/src/db/queries/task-run-diagnostics.ts; apps/api/src/trpc/routers/task-run-diagnostics.route.ts; apps/dashboard/src/components/task-notification.tsx; apps/dashboard/src/app/(sidebar)/task-events/diagnostics/page.tsx
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
- Evidence: apps/dashboard/src/components/sales-orders-v2-export.tsx; apps/dashboard/src/components/sales-orders-export.ts; apps/dashboard/src/components/sales-orders-export.test.ts; apps/dashboard/src/components/tables-2/sales-orders/data-table.tsx; apps/dashboard/src/store/sales-orders.ts
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
- Evidence: packages/db/src/schema/sales-email-attempts.prisma; apps/api/src/db/queries/sales-email-attempts.ts; apps/dashboard/src/components/sales-email-ledger-page.tsx; packages/notifications/src/index.ts; packages/jobs/src/tasks/sales/create-send-sales-email-task.ts
- Completed Date: 2026-07-09

### Sales Order And Quote Sales Rep Transfer
- Priority: High
- Description: Added an ownership-controlled way to transfer an existing order or quote from the sales overview. Only the current sales rep whose user id matches `SalesOrders.salesRepId` can transfer the sale; `editOrders` grants no override. The mutation requires password confirmation, changes only `salesRepId`, records structured `SalesHistory` audit evidence, and refreshes sales list/overview/dashboard query families from the UI.
- Related Feature: Sales orders, sales overview, sales rep dashboard, sales ownership correction
- Status: Done
- Plan Status: Implemented
- Plan File: brain/plans/2026-07-08-feature-sales-order-sales-rep-transfer.md
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/36
- Evidence: apps/api/src/db/queries/sales-rep-transfer.ts; apps/api/src/db/queries/sales-rep-transfer.test.ts; apps/dashboard/src/components/sales-overview-system/tabs/overview-tab.tsx
- Completed Date: 2026-07-08

### Sales Inventory Non-Stock Status And Tracking Change Repair
- Priority: High
- Description: Added derived `Not Applicable` / `N/A` inbound requirement display for non-stock, not-inventory, untracked, and zero-required sales inventory rows; added a lifecycle boundary for future stock-tracking repair preview; and added a bounded read-only tracking-change repair modal/check after category stock mode becomes tracked.
- Related Feature: Inventory-backed sales fulfillment
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-07-01-feature-sales-inventory-non-stock-status-tracking-repair.md
- Intake File: brain/intake/2026-07-01-sales-inventory-inbounds-tables-polish.md
- Evidence: packages/sales/src/sales-inventory-overview.test.ts; apps/api/src/trpc/routers/inventories.route.ts; apps/dashboard/src/components/sales-overview-system/tabs/inventory-tab.tsx
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
- [x] 2026-07-27: added the audited Production-tab inventory readiness override.
  Configured blocked orders now show blocker/inbound evidence, Inventory
  navigation, explicit physical-availability confirmation, stale-revision
  protection, assignment-only gate use, and revocation. A 2-unit local
  assignment smoke passed and its assignment/override state was cleaned up.
- [x] 2026-08-03: restored new sales-form edit compatibility for visible order
  and quote numbers by adding a slug-first, order-number fallback lookup with a
  focused regression test and production-backed proof on order `09158PC`.
- [x] 2026-08-04: added a confirmed Super Admin CTA on Sales Form Adoption that
  moves all current legacy preferences to the new sales form, records
  actor-attributed evidence, and invalidates stale legacy-cookie behavior on
  the affected user's next normal form request.
- [x] 2026-08-04: moved inbound creation/detail into Sales Overview secondary
  sheets, locked PO/reference to the order number, added exact inbound activity
  and notification deep-links, corrected actor-attributed status transition
  copy, improved Inventory readability, and added author/Super Admin audited
  manual-note edit and soft delete. Focused tests and authenticated in-app
  browser proof passed on local inbound `#118` for order `09086PC`.
- [x] 2026-08-04: closed the backorder and partial-delivery implementation gaps:
  terminal and cross-sale mutation guards, server actor/permission enforcement,
  canonical pickup/delivery/ship modes, serializable retries, cancelled-component
  safety, line-grain BOM math, unbounded cursor queues/global summaries, Midday UI
  filters/infinite tables/selection/confirmation controls, repair CLI, and query
  indexes. Focused tests and Sales/DB typechecks pass; live browser and local-data
  proof retain explicit environment blockers documented in the feature record.
- [x] 2026-08-05: implemented mobile parity for the backorder and partial-delivery
  workspaces with protected Sales routes, permission-aware dashboard counts,
  URL-owned filters, typed infinite queues, recycled lists, global summaries,
  stable bulk selection, hold/release, and canonical-mode shipment confirmation.
  Focused tests pass with 10 tests / 30 assertions; device/runtime proof remains
  blocked by the existing shared `@gnd/errors` module-resolution failure.

### New Sales Form Shelf Product Deep Search
- Priority: Medium
- Description: Implemented one measurement-aware, unordered-token shelf
  product search authority across cached web/dealer pickers, Shelf V1, and the
  typed API fallback.
- Related Feature: New sales form Shelf Items product picker
- Status: Done
- Plan Status: Done
- Plan File: .brain/plans/2026-08-06-feature-new-sales-form-shelf-product-deep-search.md
- Created Date: 2026-08-06
- Completed Date: 2026-08-06

### New Sales Form Custom Component Parity
- Priority: Medium
- Description: Implemented entry-only legacy-style Custom selection on eligible
  workflow steps, with hidden catalog cards, existing-value autocomplete,
  standard/custom exclusivity, canonical deselection, applicable pricing, and
  guarded step-scoped updates.
- Related Feature: New sales form workflow component picker
- Status: Done
- Plan Status: Done
- Plan File: .brain/plans/2026-08-06-feature-new-sales-form-custom-component-parity.md
- Created Date: 2026-08-06
- Completed Date: 2026-08-06

### Adjusted Order Legacy/New Sales Form Parity
- Priority: High
- Description: Made the approved adjustment snapshot authoritative in the
  legacy editor, preserved relational audit enrichment, added a database-backed
  legacy save guard, and presented adjusted legacy orders as read-only with a
  handoff to the new form.
- Related Feature: In-Form Sales Order Adjustments
- Status: Done
- Plan Status: Done
- Plan File: .brain/plans/2026-08-07-bug-fix-adjusted-order-legacy-form-parity.md
- Validation: Exact browser parity on `09187PC`, ordinary-order compatibility
  on `09166LRG`, 25 focused tests / 126 assertions, and the new edit-loader
  retained-row regression (1 test / 10 assertions).
- Completed Date: 2026-08-07

### Default Inbound Expected Date
- Priority: High
- Description: Defaulted Expected date to the operator's current local date in
  both the post-save Configure Inventory editor and the Sales Overview inbound
  form, including fresh inline-action resets.
- Related Feature: Inventory-Backed Sales Fulfillment
- Status: Done
- Validation: 12 focused tests / 57 assertions, scoped Biome, diff validation,
  and authenticated browser QA without submitting an inbound shipment.
- Completed Date: 2026-08-17

### Sales Form Relational Persistence and Pricing Repair

- Priority: Critical
- Description: Made the legacy relational Sales graph the sole commercial
  authority, added revision-checked identity-preserving saves and physical door
  identity uniqueness, repaired `03523PC`, and removed the pricing-load render
  loop caused by non-idempotent effect synchronization.
- Related Feature: Sales Form System Hardening
- Status: Done
- Validation: 98 focused tests passed across the Sales, API, and Dashboard
  suites; Sales/UI typechecks and targeted API/Dashboard bundles passed; the
  bounded `03523PC` audit returned no findings; authenticated browser proof
  shows one quantity-one `$355.67` row with no error after profile pricing loads.
- Completed Date: 2026-08-19

### Optional Address Line 1 In Sales Customer Forms

- Priority: Medium
- Description: Made Address Line 1 optional in the sales-linked customer and
  direct billing/shipping address schemas without changing storefront checkout.
- Status: Done
- Plan Status: Done
- Plan File: `.brain/plans/2026-08-19-bug-fix-sales-address-line-one-optional.md`
- Handoff File: `.brain/handoffs/completed/2026-08-19-sales-address-line-one-optional-handoff.md`
- Validation: focused API schema tests pass; browser proof skipped by request.
- Completed Date: 2026-08-19

### Fix Sales Quantity Decision Gating

- Priority: High
- Description: Correlated inbound disposition to the same reduced line's
  mutable open demand so no-decision quantity edits save directly.
- Status: Done
- Plan Status: Done
- Plan File: `.brain/plans/2026-08-19-bug-fix-sales-quantity-decision-gating.md`
- Handoff File: `.brain/handoffs/completed/2026-08-19-sales-quantity-decision-gating-handoff.md`
- Validation: focused decision-matrix/API tests and Sales typecheck pass;
  browser proof skipped by request.
- Completed Date: 2026-08-19

### Fix Quote To Invoice Runtime Timeout

- Priority: Critical
- Description: Narrowed the copy projection, serialized quote conversion,
  reused the source-linked target on retry/concurrency, and isolated durable
  follow-up failures from the successful copy result.
- Status: Done
- Plan Status: Done
- Plan File: `.brain/plans/2026-08-19-bug-fix-quote-to-invoice-runtime-timeout.md`
- Handoff File: `.brain/handoffs/completed/2026-08-19-quote-to-invoice-runtime-timeout-handoff.md`
- Validation: focused copy/idempotency/concurrency tests and Sales typecheck
  pass; production timing and browser proof skipped by request.
- Completed Date: 2026-08-19

### Preserve And Restore Sales P.O. Data In The New Form

- Priority: High
- Description: Restored Global Invoice Details P.O. editing and hardened
  root/nested compatibility persistence so no-op saves preserve values and an
  explicit blank clears both shapes.
- Status: Done
- Plan Status: Done
- Plan File: `.brain/plans/2026-08-20-bug-fix-sales-po-persistence-and-invoice-details.md`
- Validation: 59 focused metadata, UI, autosave, and relational tests / 252
  assertions pass; Sales typecheck and whitespace checks pass. Browser proof
  was blocked by unavailable local Docker services.
- Completed Date: 2026-08-20

### Standardize Generic Edit Icons

- Priority: Medium
- Description: Remapped the shared uppercase and legacy lowercase generic Edit
  aliases to the slanted `PencilEdit01Icon` while preserving specialized
  document-edit glyphs.
- Status: Done
- Validation: shared-icons rendering coverage passed 3 tests / 5 assertions;
  authenticated Sales Overview QA confirmed the action-bar, Customer, P.O., and
  Delivery edit controls without mutating order data.
- Completed Date: 2026-08-21

### Migrate Sales Overview Transactions To Compact Receipt Flow

- Priority: High
- Description: Replaced order-level analytics cards and duplicated transaction
  layouts with one settlement strip, receipt rows, and an actionable empty
  state; routed General and Transactions payment creation into the canonical
  URL-driven Sales Overview secondary pane.
- Status: Done
- Validation: 32 focused tests / 149 assertions and scoped Biome passed;
  authenticated browser QA covered paid and empty orders, payment details,
  both payment-entry points, URL cleanup, focus return, a fixed standard footer,
  and zero horizontal overflow without submitting a payment. The
  repository-wide Dashboard typecheck remains on its existing baseline, with
  no touched migration-file diagnostic.
- Completed Date: 2026-08-21

### Standardize Tables V2 Selection Checkbox Alignment

- Priority: High
- Description: Centered header and row checkboxes through the shared Tables V2
  cell contract, audited all 24 selection-enabled table modules, and restored
  select-all rendering/sticky ordering in Inventory Backorders and Partial
  Shipments.
- Status: Done
- Validation: 19 focused tests / 164 assertions and scoped Biome pass;
  authenticated Production and Backorders browser QA confirms alignment. The
  broader suite retains 12 unrelated stale parity failures, and Dashboard
  typecheck remains on its existing repository baseline.
- Completed Date: 2026-08-29

### Add Production Invoice Visibility And Expanded Filters

- Priority: High
- Description: Added admin-only read-only invoice totals/status to Production,
  carried applicable Sales Orders customer/order/payment filters through list
  and summary reads, and replaced generic Production filter icons with semantic
  glyphs.
- Status: Done
- Validation: 39 focused tests / 119 assertions, scoped Biome, whitespace
  validation, and authenticated browser proof for the column, row states,
  expanded filter menu, and distinct icons. A later reload was blocked by an
  unrelated dispatch-manifest module-resolution error.
- Completed Date: 2026-08-29

### Align Production Tabs Above Filters

- Priority: Medium
- Description: Extended the shared adaptive search/filter header for custom tab
  content and enabled it on Production so tabs remain in one row above search,
  active filters, and column controls.
- Status: Done
- Validation: 24 focused tests / 51 assertions, scoped Biome and whitespace
  checks, plus authenticated desktop and 900-pixel browser geometry/screenshots.
- Completed Date: 2026-08-29

### Make Production Submission Review Silent And Approve Authorized On-Behalf Work

- Priority: High
- Description: Removed material-review warning/status copy from submission UI,
  retained silent pending review for worker self-submissions, and made
  admin/production-editor/order-sales-rep submissions for another assignee
  immediately approved with a complete review audit record.
- Status: Done
- Validation: 33 focused tests / 61 assertions pass. Sales typecheck is blocked
  only by two existing unrelated inbound-demand and assignment-shape errors.
- Decision: `.brain/decisions/ADR-075-authorized-on-behalf-production-submission-approval.md`
- Completed Date: 2026-08-29

### Standardize Priority Production Emails 1–20

- Priority: High
- Description: Migrated the approved ranked priority set to a reusable GND
  email design system, including the job-owned daily sales payment report,
  while preserving production data and delivery contracts.
- Status: Done
- Validation: 19 email tests / 62 assertions, 14 notification tests / 30
  assertions, email typecheck, scoped Biome across 29 files, and 40 live
  desktop/mobile gallery states with no horizontal overflow.
- Review: `.brain/reports/email-design-review-2026-08-30.md`
- Completed Date: 2026-08-30
