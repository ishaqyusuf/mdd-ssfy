# Contractor Accounting

## Status

Implemented. Contractor accounting now runs from an immutable Decimal ledger,
while legacy jobs and payouts remain compatibility sources for dual-write and
reconciliation. The ledger schema, Decimal payout columns, local history,
production schema, and Jan-Aug backfill are verified. The expanded accounting
workspace schema is applied locally and remains an explicit production
deployment step.

## User workflow

- Authorized staff open `/contractors/accounting` from the Contractors sidebar.
- The page follows the Sales Orders/Midday workspace contract: URL-backed
  search and filters, lazy filter options, active filter chips, a virtualized
  and persistent table, row detail sheets, and compact toolbar actions.
- The clean default view does not show a Report action. Any explicit search,
  date range, contractor, entry type, source type, amount band, or exception
  filter reveals the Report dropdown.
- Report generation inherits the complete active filter snapshot. The
  standalone Report period card was removed.
- Every filter row uses a semantic shared icon: calendar for effective date,
  user for contractor, receipt for entry type, document for source, currency
  for amount, and warning for reconciliation exceptions.
- The four summary cards show opening liability, earned work, payouts, and
  closing liability for the current filtered period.
- Ledger identity cells are deliberately single-line: effective date only and
  contractor name only. Internal entry IDs remain in row/detail actions and
  contractor email remains available to search/API consumers, but neither
  crowds the list. Rows use the same `40px` compact height as Sales Orders.
- Managers can add bonuses, expenses, or deductions; inspect entries; reverse
  eligible entries with a reason; run reconciliation; close a period; and open
  the accounting control center.
- Ledger, Payables, Review queue, and Resolution Center are URL-owned product
  tabs in a dedicated block above the standard search/filter/action row,
  matching Sales Orders. `All` remains the unfiltered workspace entry.
- Payables projects each contractor's ledger-backed balance, FIFO aging, oldest
  unpaid activity, current eligible jobs, unresolved exceptions, and W-9
  readiness. Accounting can prepare immutable payout-run snapshots, but actual
  payment creation remains in the existing Payment Portal.
- Contractor 360 combines balance, aging, issue count, W-9 readiness, recent
  payout runs, and a Payment Portal handoff without creating a second payout
  authority.
- Review queue and Resolution Center expose stored reconciliation evidence.
  Resolution activity is append-only and fingerprinted; a later source change
  makes old evidence stale and returns the issue to active review.
- Period close now has an explicit readiness gate. Unresolved or stale
  reconciliation evidence blocks close; warnings remain visible without
  weakening the hard blockers.
- Deferred accounting insights provide bounded continuous daily, weekly, or
  monthly earned/payout/net/closing-liability trends and liability aging.
- Hourly accounting alerts cover balance thresholds, aging liability,
  reconciliation attention, missing W-9 readiness, and overdue close. Alert
  events deduplicate by evidence fingerprint, support acknowledge/resolve, and
  track per-recipient email delivery so failed recipients can be retried
  without resending successful deliveries.
- The control center exposes closed-period history and Super Admin reopen,
  reconciliation issues and review notes, report history, report schedules, and
  W-9/tax readiness profiles.

## Midday migration contract

- The closest Midday analogues are Transactions and the local Sales Orders
  workspace: URL state is authoritative, routes remain compositional, API
  boundaries are explicit, filters are lazy, large lists use cursor pagination
  and virtualization, and mutation detail lives in sheets rather than a
  monolithic page.
- Search/filter composition reuses the local `SearchFilterProvider` and
  `SearchFilterTRPC` contract used by Sales Orders. The accounting table reuses
  the existing Tables-2 core without changing it.
- The Report action is contextual rather than permanently prominent. This keeps
  the clean ledger view focused and ensures every generated artifact describes
  an explicit, reproducible view.
- Summary, ledger rows, generated reports, reconciliation, and period snapshots
  all consume package-owned accounting rules rather than UI-owned formulas.

## Immutable ledger rules

- `ContractorLedgerEntry` is append-only. Corrections create signed `REVERSAL`
  rows linked through `reversalOfId`; existing financial rows are not edited or
  deleted.
- `amount` preserves the source magnitude while `liabilityDelta` stores the
  signed accounting effect. Persisting both prevents reversal or report code
  from reconstructing signs incorrectly.
- Every source posting has a unique `sourceKey`. Job review, payout creation,
  cancellation, restoration, and legacy backfill can therefore retry without
  duplicating liability.
- User-entered dates are inclusive business dates in `America/New_York` by
  default and become timezone-aware `[from, toExclusive)` UTC boundaries.
- Monetary arithmetic normalizes to integer cents at the domain boundary.
  Ledger and snapshot storage use `Decimal(18,2)`; payout and payout-adjustment
  source columns use `Decimal(12,2)`.
- Opening balance is all signed ledger activity before `from`; closing balance
  is opening plus filtered in-period liability deltas.
- Closed periods persist their canonical snapshot, SHA-256 hash, actor, and
  event history. Reopening is Super Admin-only and requires a reason.

## Posting and compatibility behavior

- Approving an eligible job posts `JOB_EARNED`; moving it out of an eligible
  state posts one reversal.
- Creating a contractor payout transactionally posts any missing earned rows,
  payout adjustments, and the payout. Cancellation/restoration use the same
  reversal chain.
- The bounded legacy backfill uses exact legacy status semantics and 500-row
  batches so it is safe on PlanetScale/Vitess transaction limits.
- Legacy job/payout calculation remains only as a reconciliation comparator.
  `jobs.contractorPeriodReport` and print/report routes now read the ledger.

## Reports

- `CONSOLIDATED`: summary, contractor balances, and filtered ledger detail.
- `CONTRACTOR_STATEMENT`: one contractor's opening, activity, and closing
  statement.
- `AGING`: current, 30, 60, 90, and over-90-day liability.
- `RECONCILIATION`: reconciliation runs and issue evidence.
- `ADJUSTMENT_REGISTER`: bonuses, expenses, deductions, and reversals.
- `TAX_READINESS`: contractor identity, W-9 state, and period payout totals.
- XLSX and CSV are supported for every report. PDF is supported for
  consolidated reports and contractor statements.
- Report jobs persist their filter snapshot, status, totals, public artifact
  URL, SHA-256 content hash, requester, and timestamps. Scheduled reports use a
  validated five-part cron, timezone, recipient list, and the same generator.

## Reconciliation and tax controls

- A reconciliation run compares legacy and ledger totals for the same exact
  period and stores summary, contractor, missing-source, duplicate-source,
  legacy-date-fallback, or missing-effective-date issues.
- Issues move through `OPEN`, `REVIEWED`, and `RESOLVED` with reviewer, note,
  timestamps, and evidence.
- Contractor tax profiles track legal name, classification, W-9 lifecycle,
  verification actor/date, TIN last four, optional document reference, and
  notes. Full tax identifiers are not stored.
- Payout runs store immutable proposal snapshots and a constrained
  `DRAFT → READY → HANDED_OFF → COMPLETED` lifecycle; `CANCELLED` is terminal.
  They never create payments themselves.
- Alert rules store criteria, scope, timezone, and recipient snapshots. Alert
  events store deduplicated evidence, acknowledgement/resolution, and durable
  per-recipient email delivery state.

## Permissions and security

- Ledger, summary, filters, periods, issues, report history, schedules, tax
  profiles, and generated report reads require `viewJobPayment` or
  `editJobPayment`.
- Adjustments, reversals, close, reconcile, issue review, report generation,
  schedules, and tax profile updates require `editJobPayment`.
- Period reopen and legacy backfill require Super Admin. Backfill defaults to a
  dry run.
- Contractor self-service statements derive contractor scope from the
  authenticated user and never accept caller-controlled contractor IDs.
- UI visibility is never the authorization boundary; every route repeats the
  permission check.

## Production cutover evidence

- `bun run --filter @gnd/db push:prod` synchronized the reviewed schema and
  regenerated Prisma Client. The final production datasource-to-datamodel diff
  is empty.
- Production backfill inserted 16,940 immutable rows in bounded batches:
  15,489 job earnings and 1,451 payout-related rows. A rerun left the count at
  16,940.
- Production January 1-August 31 parity is exact:
  - opening liability: `-122,711,329` cents
  - earned: `122,072,418` cents
  - payouts: `121,615,100` cents
  - net activity: `457,318` cents
  - closing liability: `-122,254,011` cents
  - jobs: `3,478`; payouts: `216`; contractors: `26`
  - summary differences: `0`; contractor differences: `0`
- Local January-August parity is also exact after a 16,917-row backfill and an
  idempotent rerun.

## Validation

- Domain tests cover signed ledger effects, reversals, immutable posting,
  period-close snapshots, reconciliation, aging, and statements.
- API schema tests cover calendar dates, period order, timezones, amount bounds,
  report/format combinations, schedules, and the self-service schema runtime.
- API/job tests cover dual-write behavior, cancellation/restoration,
  reconciliation, filtered report generation, and scheduler next-run
  calculation.
- All six report kinds were exercised against the local Jan-Aug ledger; XLSX,
  CSV, and the supported PDF renderer produced nonempty artifacts.
- In-app browser QA proved the real Jan-Aug summary and ledger, contextual
  Report visibility, six-item report menu, URL search filtering to one matching
  row, the absence of the old Report period card, and accounting-operation
  controls.
- Expanded browser QA proved the separate top tab block, lower
  search/filter/report/action row, URL navigation for all four product tabs,
  real Payables data, empty Review and Resolution states, payout-run and alert
  management sheets, and Contractor 360 for a real contractor.
