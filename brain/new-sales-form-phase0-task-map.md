# New Sales Form Phase 0 Task Map

Date: 2026-05-20
Status: Phase 0 code gate complete; runtime proof pended
Owner: Sales Form Rebuild Team

## Purpose

Map Phase 0 repro/acceptance rows to implementation task IDs. This is the
handoff point from evidence gathering into Phase 1+ execution.

## Pend Decision

The remaining Phase 0 browser/runtime proof is pended, not discarded. Local
runtime access is blocked by auth/session redirects for both `www` and
dealership, plus a `www` tRPC runtime parse issue in the unauthenticated shell.
Automated package/API evidence is green enough to move into the next
implementation phase while keeping `NSF-QA-002` and `NSF-QA-003` open as
parallel validation gates.

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
| `NSF-P1-002` | Acceptance: Flat line totals; Repro row 26 | Fix dealer quote line-total edit semantics. Prefer read-only derived totals unless explicit override contract is chosen. | Dealer cannot enter misleading line total, or override is honored consistently everywhere. | Implemented; browser proof pending |
| `NSF-P1-003` | Repro rows 2, 11; Acceptance: Customer profile repricing, tax recalculation | Harden `www` customer/profile/tax recalc chain. | Profile/tax changes update visible summary, save response, persisted fields, and reopen summary. | Implemented; API/package proof passing; browser proof pending |
| `NSF-P1-004` | Repro rows 3, 5, 6, 21, 22, 24 | Prove/fix door and HPT pricing flows. | Supplier/size/component/surcharge totals match package calculations and persist through reopen. | Implemented; package proof passing; browser proof pending |
| `NSF-P1-005` | Repro row 9 | Prove/fix shelf pricing and section rollups. | Shelf row, section, parent line, and summary totals match before save/save response/reopen. | Implemented; package proof passing; browser proof pending |
| `NSF-P1-006` | Repro rows 1, 7, 10, 23 | Prove/fix moulding/service pricing and taxability. | Moulding default qty, calculator totals, service tax/production flags, and grouped totals persist correctly. | Implemented; package proof passing; browser proof pending |

## Phase 2 Task Map

| Task ID | Source Rows | Scope | Exit Criteria | Status |
| --- | --- | --- | --- | --- |
| `NSF-P2-001` | Acceptance: Save draft/final/reopen; API query suite | Unblock and rerun API new-sales-form save/reopen suites. | API tests run without local dependency ENOENT and report product-level pass/fail. | Done |
| `NSF-P2-002` | Repro row 8; Acceptance: Local recovery | Harden autosave/local recovery and capture browser evidence later. | Dirty edits recover or dismiss safely after refresh/network interruption. | Implemented; package/app proof passing; browser proof pended |

## Phase 3 Task Map

| Task ID | Source Rows | Scope | Exit Criteria | Status |
| --- | --- | --- | --- | --- |
| `NSF-P3-001` | Phase 3 roadmap | Add shared composer contract for record normalization, save payload shaping, and pricing adapter boundaries. | `www` coefficient mode and dealership percentage mode are both covered by package tests without sharing side effects. | Implemented; package proof passing |
| `NSF-P3-002` | Phase 3 roadmap | Rewire `www` save payload creation through shared composer. | Existing API save/reopen suite remains green. | Implemented; API proof passing |
| `NSF-P3-003` | Phase 3 roadmap; Dealer profile percentage pricing | Rewire dealership quote display pricing through shared composer percentage adapter. | Dealership typecheck passes and dealer `salesPercentage` remains explicit. | Implemented; typecheck passing |
| `NSF-P3-004` | Phase 3 roadmap | Evaluate server-side dealer quote persistence extraction. | No package cycle is introduced; keep server query local unless shared contract moves to a lower-level package. | Deferred |

## Phase 4/5 Task Map

| Task ID | Source Rows | Scope | Exit Criteria | Status |
| --- | --- | --- | --- | --- |
| `NSF-P4-001` | Repro rows 12, 13, 14, 16, 17, 18, 20 | Component action/menu/badge/edit/redirect display parity. | Component actions and indicators match acceptance criteria in browser runtime. | Runtime proof pending |
| `NSF-P5-001` | Repro rows 4, 19, 21, 22, 23, 24 | Door modal, HPT add-size/add-door, moulding dialog UX parity. | Modal interactions match old-form acceptance criteria. | Runtime proof pending |

## Phase 6/7 Task Map

| Task ID | Source Rows | Scope | Exit Criteria | Status |
| --- | --- | --- | --- | --- |
| `NSF-P6-001` | Repro row 27 | Fix `www` load error retry visibility. | Failed bootstrap/get renders retry UI instead of skeleton. | Implemented; browser proof pending |
| `NSF-P6-002` | Repro row 28 | Implement strict surface-specific header/action gating. | `www` and dealership only expose wired meaningful actions. | Implemented; browser proof pending |
| `NSF-P7-001` | Acceptance: Dealership create/edit/save/convert | Complete dealership quote runtime proof. | Dealer quote create/edit/save/convert passes fixture checks with `salesPercentage`. | Unit/query proof partial; browser proof pending |

## QA/Environment Task Map

| Task ID | Source Rows | Scope | Exit Criteria | Status |
| --- | --- | --- | --- | --- |
| `NSF-QA-001` | Validation log API blocker | Repair local dependency resolution for `packages/ui/node_modules/tailwind-merge`. | `bun test apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts` runs to completion. | Done |
| `NSF-QA-002` | Acceptance workflow matrix | Capture browser evidence for `www` order/quote workflows. | Evidence folders contain screenshots/notes for create/edit/save/print/packing/payment flows. | Blocked by local auth/session + tRPC runtime env |
| `NSF-QA-003` | Acceptance workflow matrix | Capture browser evidence for dealership quote workflows. | Evidence folders contain screenshots/notes for create/edit/save/convert flows. | Blocked by local dealer auth/session |

## Immediate Next Implementation Order

1. Phase 3 follow-up: decide whether dealer server persistence should stay local or move behind a lower-level shared contract to avoid `@gnd/db` -> `@gnd/sales` package coupling.
2. `NSF-QA-002` and `NSF-QA-003`: resume browser proof as soon as valid local `www` and dealership sessions are available.
3. `NSF-P4-001` and `NSF-P5-001`: continue runtime/UI parity once browser access is available.
