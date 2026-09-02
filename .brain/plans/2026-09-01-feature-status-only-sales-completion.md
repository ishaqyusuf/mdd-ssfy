# Status-only sales completion

## Status

Done. Tickets 03-06 are approved and landed in order, and Ticket 07 passed final
Brain review with direct evidence for all 23 scenarios, affected-scope health,
authenticated runtime behavior, local migration safety, and broad baseline
isolation. Product intent, Q1–Q15 acceptance decisions, and the closed GND
compatibility boundary remain the implementation authority.

## Canonical artifacts

- Wayfinder map: `.scratch/status-only-sales-completion/map.md`
- Candidate specification: `.scratch/status-only-sales-completion/spec.md`
- Product contract decision: `.scratch/status-only-sales-completion/issues/01-define-status-only-sales-completion-contract.md`
- Closed GND compatibility decision: `.scratch/status-only-sales-completion/issues/02-reconcile-gnd-lifecycle-and-sales-stat-authority.md`
- Architecture decision: `.brain/decisions/ADR-081-administrative-sales-completion-authority.md`

## Approved GND compatibility contract

- Canonical **Fulfilled** remains proof-bound. Status-only Fulfillment is a
  separately labelled Administrative Completion and cannot make
  `canonicalFulfilled` true by itself.
- A planned dedicated `SalesCompletionRecord` owns milestone, method, active or
  cancelled state, dates, and actor provenance. `SalesStat` remains a unique
  `(salesId, type)` aggregate recomputed from `QtyControl` and is never an
  override store.
- The canonical resource identifier is `status_only_sales_completion`; its
  `StatusOnlySalesCompletion` permission resource persists the rows `view status
  only sales completion` and `edit status only sales completion`, which resolve
  to `viewStatusOnlySalesCompletion` and `editStatusOnlySalesCompletion`.
- The shared backend resolver must keep operational truth separate from
  completion satisfaction. Status-only Fulfillment may close order-level
  pending-completion views and action locks while operational inventory,
  dispatch, tax, accounting, and volume projections remain evidence-driven.

## Next step

The 2026-09-02 bounded-bulk follow-up is complete: multi-order Production and
Fulfillment actions may use the same administrative authority through one
protected request, while Full workflow remains the default and unchanged. No
implementation ticket remains. Preserve the approved authority boundary in
future Sales completion work and consult the release report for regression
coverage.

## Release evidence

- Matrix/report: `.brain/reports/2026-09-01-status-only-sales-completion-release-verification.md`
- Focused suite: 134 tests / 702 assertions, 0 failures
- Authenticated runtime: Production `09535DB`; Fulfillment `09541AD`; exact
  temporary records cancelled with durable audit history and no operational
  reversal
- Local database: generate/migrate/push passed; no Preview or Production write
- Broad checks: executed with unrelated repository baselines explicitly
  isolated; all feature-related and affected-scope failures repaired
