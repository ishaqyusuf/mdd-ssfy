# New Sales Form Phase 0 Task Map

Date: 2026-05-20
Status: Active
Owner: Sales Form Rebuild Team

## Purpose

Map Phase 0 repro/acceptance rows to implementation task IDs. This is the
handoff point from evidence gathering into Phase 1+ execution.

References:

- `brain/new-sales-form-phase0-acceptance-matrix.md`
- `brain/new-sales-form-phase0-fixtures.md`
- `brain/new-sales-form-phase0-repro-matrix.md`
- `brain/new-sales-form-phase0-validation-log.md`

## Task ID Convention

- `NSF-P1-*`: Phase 1 pricing/tax/repricing correctness.
- `NSF-P2-*`: Phase 2 persistence and recovery hardening.
- `NSF-P3-*`: Phase 3 shared composer extraction.
- `NSF-P4-*`: Phase 4 component controls parity.
- `NSF-P5-*`: Phase 5 specialized UX parity.
- `NSF-P6-*`: Phase 6 header/action/capability cleanup.
- `NSF-P7-*`: Phase 7 dealership completion.
- `NSF-QA-*`: validation, fixtures, browser proof, or environment unblock.

## Phase 1 Task Map

| Task ID | Source Rows | Scope | Exit Criteria | Status |
| --- | --- | --- | --- | --- |
| `NSF-P1-001` | Acceptance: Dealer profile percentage pricing; Repro row 25 | Lock dealer percentage pricing contract across shared dual pricing, dealer query layer, and quote composer. | Internal coefficient + dealer `salesPercentage` totals match before save, save response, persisted snapshot, reopen, and conversion. | Unit/query proof passing; browser proof pending |
| `NSF-P1-002` | Acceptance: Flat line totals; Repro row 26 | Fix dealer quote line-total edit semantics. Prefer read-only derived totals unless explicit override contract is chosen. | Dealer cannot enter misleading line total, or override is honored consistently everywhere. | Fail/contract gap |
| `NSF-P1-003` | Repro rows 2, 11; Acceptance: Customer profile repricing, tax recalculation | Harden `www` customer/profile/tax recalc chain. | Profile/tax changes update visible summary, save response, persisted fields, and reopen summary. | Package proof passing; runtime/API proof pending |
| `NSF-P1-004` | Repro rows 3, 5, 6, 21, 22, 24 | Prove/fix door and HPT pricing flows. | Supplier/size/component/surcharge totals match package calculations and persist through reopen. | Package proof passing; runtime proof pending |
| `NSF-P1-005` | Repro row 9 | Prove/fix shelf pricing and section rollups. | Shelf row, section, parent line, and summary totals match before save/save response/reopen. | Package proof passing; API/runtime proof pending |
| `NSF-P1-006` | Repro rows 1, 7, 10, 23 | Prove/fix moulding/service pricing and taxability. | Moulding default qty, calculator totals, service tax/production flags, and grouped totals persist correctly. | Package proof passing; runtime proof pending |

## Phase 2 Task Map

| Task ID | Source Rows | Scope | Exit Criteria | Status |
| --- | --- | --- | --- | --- |
| `NSF-P2-001` | Acceptance: Save draft/final/reopen; API query suite | Unblock and rerun API new-sales-form save/reopen suites. | API tests run without local dependency ENOENT and report product-level pass/fail. | Blocked by `tailwind-merge` dependency |
| `NSF-P2-002` | Repro row 8; Acceptance: Local recovery | Capture browser evidence for autosave/local recovery. | Dirty edits recover or dismiss safely after refresh/network interruption. | Pending browser proof |

## Phase 4/5 Task Map

| Task ID | Source Rows | Scope | Exit Criteria | Status |
| --- | --- | --- | --- | --- |
| `NSF-P4-001` | Repro rows 12, 13, 14, 16, 17, 18, 20 | Component action/menu/badge/edit/redirect display parity. | Component actions and indicators match acceptance criteria in browser runtime. | Runtime proof pending |
| `NSF-P5-001` | Repro rows 4, 19, 21, 22, 23, 24 | Door modal, HPT add-size/add-door, moulding dialog UX parity. | Modal interactions match old-form acceptance criteria. | Runtime proof pending |

## Phase 6/7 Task Map

| Task ID | Source Rows | Scope | Exit Criteria | Status |
| --- | --- | --- | --- | --- |
| `NSF-P6-001` | Repro row 27 | Fix `www` load error retry visibility. | Failed bootstrap/get renders retry UI instead of skeleton. | Fail/UI state gap |
| `NSF-P6-002` | Repro row 28 | Implement strict surface-specific header/action gating. | `www` and dealership only expose wired meaningful actions. | Fail/capability contract gap |
| `NSF-P7-001` | Acceptance: Dealership create/edit/save/convert | Complete dealership quote runtime proof. | Dealer quote create/edit/save/convert passes fixture checks with `salesPercentage`. | Unit/query proof partial; browser proof pending |

## QA/Environment Task Map

| Task ID | Source Rows | Scope | Exit Criteria | Status |
| --- | --- | --- | --- | --- |
| `NSF-QA-001` | Validation log API blocker | Repair local dependency resolution for `packages/ui/node_modules/tailwind-merge`. | `bun test apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts` runs to completion. | Blocked |
| `NSF-QA-002` | Acceptance workflow matrix | Capture browser evidence for `www` order/quote workflows. | Evidence folders contain screenshots/notes for create/edit/save/print/packing/payment flows. | Pending |
| `NSF-QA-003` | Acceptance workflow matrix | Capture browser evidence for dealership quote workflows. | Evidence folders contain screenshots/notes for create/edit/save/convert flows. | Pending |

## Immediate Next Implementation Order

1. `NSF-QA-001`: repair dependency blocker and rerun API save/reopen suites.
2. `NSF-P1-002`: fix dealer line-total semantics.
3. `NSF-P6-001`: move load-error rendering before skeleton fallback.
4. `NSF-P6-002`: tighten header/action gating for dealership.
5. `NSF-QA-002` and `NSF-QA-003`: collect browser runtime evidence after the low-risk UI contract fixes.
