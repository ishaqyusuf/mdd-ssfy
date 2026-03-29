# In Progress

## Purpose
Tracks the active work queue. Keep this focused and execution-ready.

## Current Focus
- [x] Sales PDF V2: isolated multi-template print system (`brain/features/sales-pdf-system.md`) — COMPLETED: Phase 4 (salesV2 tRPC endpoint), Phase 6 (print-sales-v2.tsx + /p/sales-invoice-v2 route), quick-print helper, sales-menu-print component
- [ ] Employee Management V2 — remaining phases: DB schema migration (`EmployeeRecord`), `employees.route.ts` API layer, `[employeeId]` per-employee overview route, insurance gate on job creation, expo app mirror
- [x] New sales form parity — autosave enabled by default (Gap #8, was field-reported data loss)
- [x] New sales form parity — code audit verified 15/24 feature gaps are now fully implemented (see `brain/new-sales-form-missing-features-execution-plan.md` for updated status per item)
- [ ] New sales form parity — runtime field verification for remaining 9 items: customer profile repricing (#2), supplier propagation (#3), component cost→door estimate (#6), shelf parity (#9), tax scenarios (#11), component edit workflow (#16), redirect route list (#18), HPT add-size (#21), door size variant (#24)
- [ ] Sales form system hardening Phase 0: transactional save safety and server-authoritative pricing validation (`brain/sales-form-system-hardening-plan.md`) — NOTE: new-form save path already uses `$transaction` and server-side recomputation; hardening targets legacy form save path
- [ ] Sales form system hardening Phase 1: pricing integrity fixes (labor writeback guard removal, taxable consistency, subtotal rendering correctness) with focused unit/integration coverage (API + UI + Validation)
