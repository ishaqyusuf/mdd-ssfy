# Backlog

## Purpose
Tracks queued work that is important but not currently in the top execution slice.

### PlanetScale to Supabase Migration
- Priority: High
- Description: Migrate the primary application database from PlanetScale MySQL to Supabase Postgres with Prisma retained for phase 1, following the execution checklist in `brain/planetscale-to-supabase-migration-checklist.md`.
- Related Feature: Platform / Database Migration
- Status: Backlog
- Created Date: 2026-03-31

## Next Up
- [ ] Install cost sorting rollout: sort relational install-cost rows by `builderTask.taskIndex` with `builderTask.createdAt` fallback in API responses, then align web admin, web jobs form, and Expo/mobile jobs form rendering to the same canonical order (`brain/features/install-cost-sorting.md`) (API + UI + Validation)
- [ ] Table sorting and arrangement pass: standardize sortable header behavior, query-param sync, and column arrangement UX across shared table surfaces before rolling fixes into feature-specific tables (UI + Validation)
- [ ] Sales overview v2 Phase 6 verification + lock-in: validate role-based tab visibility (production-only, dispatch-only users), validate deep-link tab behavior, validate sheet/page parity, then deprecate legacy sheet entry as a compatibility adapter (Validation + Architecture)
- [ ] Build the shared document platform migration path: back `Gallery`, `dispatch` uploads, `signature` capture, and `sales PDFs` with the new `StoredDocument`/`SalesDocumentSnapshot` foundation and cut callers over incrementally (Schema + API + UI + Validation + Architecture)
- [ ] Sales payment v2 checkout expansion: add preferred-payment selection, increase token expiry, support quick customer password creation/login, show wallet in logged-in checkout, and route customers into a dashboard experience (API + UI + Auth + Validation)
- [ ] Sales form system hardening Phase 2: state/interaction reliability (immutable store update patterns, selection count fix, auto-scroll removal, debug-log cleanup) (UI + Validation)
- [ ] Sales form system hardening Phase 3/4: type cleanup, dead-code removal, and rollout matrix execution for pricing/save stability (Schema + UI + Validation + Polish)
- [ ] New sales form parity Phase 0: build explicit old-vs-new acceptance matrix for all user-reported missing features, reproduce each failure in new form, and codify phase gate checks (Validation)
- [ ] New sales form parity Phase 1: close pricing integrity gaps (customer/profile repricing trigger chain, tax recalculation correctness, door/HPT component-cost integration) using shared package domain first (Schema + API + UI + Validation)
- [ ] New sales form parity Phase 2 kickoff: grouped workflow closure for moulding/service/shelf/door modal parity (moulding qty default=1, service tax+production switches, supplier-sensitive size pricing, inline door base-cost edit parity, HPT add-size reliability, HPT add-door option flow, Door Size Variant runtime parity, moulding outside-click close parity) (Schema + API + UI + Validation)
- [ ] New sales form parity Phase 3: implement step floating action bar parity (`Tabs`, `Select All`, `Pricing`, `Component`, `Refresh`, `Enable Custom`) and complete component-management parity (`Edit`, `Select`, `Redirect`, `Delete`, image attachment, accurate redirect lists, calculated sales-cost display, top-left indicator badges) (UI + Validation)
- [ ] New sales form parity Phase 4: add robust state resilience (autosave defaults/recovery snapshots/conflict-safe restore) and sales save history sidebar parity (Google-doc-like timeline + entry creation hooks) (API + UI + Validation + Polish)
- [ ] New sales form parity Phase 5: run full regression matrix, staging smoke drills, rollout and rollback checklists before production cutover (Validation + Polish)
- [ ] Fix Square payment system reliability issues across payment creation/confirmation flow and error recovery paths (API + Validation)
- [ ] Implement/verify online sales payment gateway notification flow for success, failure, and pending states (API + UI + Validation)
- [ ] Test sales customer reminder email schedule end-to-end (trigger timing, recipient targeting, delivery success/failure handling, and duplicate-send guard) (Validation)
- [ ] New sales form parity closure: port legacy costing engine behavior (`CostingClass`) into canonical new-sales-form pricing/recalc path, including labor-derived totals, taxable scoping, and payment-method surcharge parity (Schema + API + Validation)
- [ ] New sales form parity closure: complete route/step engine parity against legacy `SettingsClass` and `StepHelperClass` fallback/override semantics, including hidden/auto-step recursion edge cases (API + UI + Validation)
- [ ] New sales form parity closure: validate grouped workflows (HPT, moulding, services, shelf, mixed-line orders) with deterministic parity scenarios and e2e checks before broad rollout (Validation + Polish)
- [ ] Apply the canonical payment/resolution Prisma migration on a live DB, validate `PAYMENT_SYSTEM_CANONICAL_MIRROR` dual-write behavior, and confirm the new tables populate during checkout/manual/wallet/refund flows (Schema + API + Validation)
- [ ] Run the payment reconciliation report against open orders, classify all canonical-vs-legacy mismatches, and convert required fixes into tracked resolution actions before broader payment-system cutover (Validation + Ops)
- [ ] Backfill canonical `PaymentLedgerEntry` / `PaymentAllocation` / `PaymentProjection` history from legacy payment tables for active orders and customers with non-zero balances (Schema + API + Validation)
- [ ] Add admin/API visibility for payment reconciliation and resolution cases so finance/ops can review findings without relying on CLI-only reporting (API + UI + Validation)
- [ ] Cut accounting and checkout read paths over to canonical payment-system projections, then reduce direct legacy payment-table reads to compatibility-only surfaces (API + UI + Validation)
- [ ] Expand centralized notification dispatch beyond payment flows by migrating remaining direct `NotificationService` callers in jobs/dispatch/community routes to package-level notification adapters (API + Validation + Architecture)
- [ ] Define/confirm jobs-flow schema and status model for `requested`, `configured`, `submitted`, `approved`, `rejected`, and assignment transitions (Schema)
- [ ] Implement API/event contract for config-request notifications and installer notifications when configuration is completed (API)
- [ ] Add Expo notification deep-link behavior: job config notification `onClick` opens community model install config (UI)
- [ ] Fix Expo job form interaction bug: swipe-left should not close the job form unintentionally (UI)
- [ ] Implement job settings UI: show quantity and allow custom quantity input/edit (UI)
- [ ] Validate end-to-end job submission notifications across requester, installer, and status transitions (Validation)
- [ ] Build job overview/actions matrix: edit, delete, re-assign, approve, reject based on logged-in user role and job status (UI + Validation)
- [ ] Run polish pass for copy, UX states, and error/retry handling in jobs flow (Polish)
- [ ] Define sales/delivery/dispatch data contract and statuses needed for form submit, packing updates, and quotes lifecycle (Schema)
- [ ] Connect Expo sales delivery form to create-delivery API and trigger delivery notification on successful create (API + UI)
- [ ] Implement Expo sales list with infinite scroll/pagination behavior and loading/error/end states (UI)
- [ ] Build quotes feature foundation in Expo sales module (create/view/list flow with API wiring) (API + UI)
- [ ] Implement dispatch packing update flow with explicit submit action and success/failure feedback (UI + Validation)
- [ ] Add Google autocomplete address feature to web sales form, including place selection mapping to form fields and submit-safe validation/fallback behavior (UI + Validation)
- [ ] Define sales inventory contract and ownership for Dyke sync, including source-of-truth fields and conflict-resolution rules (Schema)
- [ ] Implement inventory Dyke sync pipeline for create/update/delete events with idempotency and retry safety (API + Validation)
- [ ] Implement inventory CRUD management flows in sales module (create, update, delete) with audit-safe mutation paths (API + UI)
- [ ] Implement inventory pricing management (base price, adjustments, effective pricing updates) with validation and role guards (API + UI + Validation)

## Later
- [ ] Expand integration/e2e coverage for jobs lifecycle and notification-driven navigation
- [ ] Improve monitoring and alerting quality for jobs + notifications
- [ ] Add customer self-service depth around payment/dashboard surfaces, including saved preferences, wallet-led payment options, and post-checkout account history (API + UI + Validation)
- [ ] Add integration/e2e coverage for sales delivery creation, quotes flow, dispatch packing updates, and notifications
- [ ] Deprecate compatibility-only legacy payment mutations and cached balance ownership once canonical payment projections and resolution workflows are proven stable in production (Schema + API + Ops)
