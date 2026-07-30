# Plan: Sales Finance And Accounting Retirement Review

## Type
Feature Review And Controlled Cutover

## Status
Deferred - Activate Only After Sequence 06 Acceptance

## Sequence
07

## Created Date
2026-07-30

## Last Updated
2026-07-30

## Goal
Preserve Sales Finance as the canonical money workspace, improve only proven
usability/performance gaps, and evaluate legacy Accounting retirement through
measured parity and explicit operator approval.

## Activation Gate
- Sequence 06 is accepted.
- The operator explicitly activates Sequence 07.
- Finance and Accounting usage telemetry, permissions, reports, and unresolved
  parity items are available.

## Current Context
- Canonical workspace: `/sales-book/finance`
- Legacy workspace: `/sales-book/accounting`
- Resolution route: `/sales-book/accounting/resolution-center`
- Sales Finance already provides summary metrics, transaction/review views,
  receivables, a resolution center, reports, sheets, protected APIs, and
  retirement telemetry.
- Existing Brain policy forbids automatic Accounting retirement.

## Required Invariants
- Stored and canonical monetary projections remain reconcilable.
- Payment, application, refund, cancellation, synchronization, and resolution
  actions remain permission-gated and audited.
- Reports reuse canonical projections and bounded exports.
- Accounting remains available until parity, operator acceptance, telemetry,
  and explicit retirement approval all pass.

## Intended Experience
- Keep the existing summary-first Finance direction.
- Make transaction, review, receivables, and resolution views predictable on
  desktop and mobile.
- Keep one search/filter/action row per active view.
- Details open on demand with clear payment/order/customer lineage.
- Reports inherit current filters and explain their scope.
- Retirement review is a separate decision, not a side effect of UI polish.

## Incremental Phases

### F0 - Parity And Usage Baseline
- Map every Accounting route, report, action, permission, deep link, and active
  user segment to Finance.
- Record telemetry period and unresolved gaps.

### F1 - Finance Usability Review
- Fix only observed header, density, responsive, terminology, loading, or sheet
  issues.
- Preserve queries and monetary contracts.

### F2 - Review, Receivables, And Resolution
- Verify exception explanations, next actions, aging, customer/order drill-down,
  and protected mutations.
- Keep resolution evidence append-only where required.

### F3 - Reports, Export, And Performance
- Validate filters, bounds, totals, audit sheets, empty states, and large-data
  behavior.
- Move expensive export work asynchronous only if measured need justifies it.

### F4 - Accounting Parity Matrix
- Execute every legacy workflow against its Finance equivalent.
- Categorize missing, intentionally retired, and unsupported behavior.
- No redirect or removal in this phase.

### F5 - Operator Acceptance
- Pilot with authorized accounting/sales operators.
- Record issues, adoption, and explicit acceptance or rejection.

### F6 - Retirement Decision
- Retire only with explicit approval.
- Add redirects, communication, rollback window, and completion evidence.
- Otherwise keep Accounting and record the blocking gaps.

## Data And Permission Direction
- Preserve decimal-safe calculations, canonical balance reconciliation, and
  append-only audit evidence.
- Keep list, summary, detail, report, and resolution queries bounded.
- Financial data remains permission- and office-scoped.
- No client-derived authoritative balances.

## Likely File Areas
- `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/finance/*`
- `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/accounting/*`
- Sales Finance and accounting components/tables/sheets/hooks
- Sales finance/report API routers, DB projections, schemas, and permissions
- Reporting generators and telemetry contracts

## Validation
- Monetary reconciliation and decimal-total tests
- Payment/refund/application/resolution permission and audit tests
- Report fixture and export-bound tests
- Authenticated finance/accounting parity journeys
- Desktop/mobile browser validation
- Usage telemetry and rollback verification before retirement

## Non-Goals
- Rewriting a working Finance system for visual novelty
- Removing Accounting based only on route existence
- Changing accounting policy without a separate decision
- Mixing contractor accounting into sales accounting

## TODO
- Define the minimum telemetry window for retirement.
- Name the operators required to approve parity.
- Record any legally or operationally required legacy report retention.

## Completion Gate
Sequence 07 completes with either an approved cutover or a documented decision
to retain Accounting. Sequence 08 still requires explicit activation.
