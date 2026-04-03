# In Progress

## Purpose
Tracks the active work queue. Keep this focused and execution-ready.

## Current Focus
- [x] Sales PDF V2: isolated multi-template print system (`brain/features/sales-pdf-system.md`) — COMPLETED: Phase 4 (salesV2 tRPC endpoint), Phase 6 (print-sales-v2.tsx + /p/sales-invoice-v2 route), quick-print helper, sales-menu-print component
- [ ] Employee Management V2 — remaining phases: DB schema migration (`EmployeeRecord`), `employees.route.ts` API layer, `[employeeId]` per-employee overview route, insurance gate on job creation, expo app mirror
- [ ] Sales PDF V2 follow-up slice: wire quick-print entry points into sales form and sales overview, switch sales preview to the new template renderer, reduce print latency, and define stored-PDF cache invalidation/reuse rules including multi-print merge behavior (`brain/features/sales-pdf-system.md`)
- [ ] Sales form system hardening Phase 0: transactional save safety and server-authoritative pricing validation (`brain/sales-form-system-hardening-plan.md`) (Schema + API + Validation)
- [ ] Sales form system hardening Phase 1: pricing integrity fixes (labor writeback guard removal, taxable consistency, subtotal rendering correctness) with focused unit/integration coverage (API + UI + Validation)
- [ ] New sales form parity hotfix/repro batch: close newly reported grouped-workflow and component-management gaps (`component edit`, `image attachment`, redirect route list accuracy, inline door base-cost edit, calculated sales-cost display, HPT add-size, HPT add-door option, Door Size Variant strict filtering/runtime proof, moulding outside-click close) and refresh Phase 0 evidence for all 24 rows (API + UI + Validation)
- [ ] Sales Orders V2: build the clean `sales-book` orders workspace on dedicated v2 query/filter contracts, summary widgets, reusable invoice-style table shell, and unified funnel status system (`brain/features/sales-orders-v2.md`)
