# Sales Finance

## Status

- Initial parallel-adoption slice implemented on 2026-07-29.
- Filter-aware Excel reporting slice implemented on 2026-07-29.
- Filter-aware reporting snapshot implemented on 2026-07-29.
- Receivables aging and filter-aware Excel reporting implemented on 2026-07-30.
- Audited reconciliation and adoption-readiness safeguards implemented on
  2026-07-30.
- Guarded Account Resolution and payment-sheet resolution implemented on
  2026-07-30.
- Progressive Accounting-to-Finance navigation migration implemented on
  2026-08-05.
- Progressive Accounting Resolution-to-Finance navigation migration implemented
  on 2026-08-05.
- Canonical route: `/sales-book/finance`.
- Legacy `/sales-book/accounting` remains available during adoption.
- No legacy redirect or deletion is authorized yet.

## Product Boundary

Sales Finance is the operational finance workspace for sales collections and
open sales receivables. It covers receipts, payment-method reporting, invoice
applications, processing fees, refunds, unapplied money, review exceptions,
customer balances, and invoice aging. It is not a general ledger and does not
replace external bookkeeping.

## Receivables Contract

Receivables are projected from non-deleted Sales Orders of type `order` with a
positive invoice total. The package projection in
`packages/sales/src/payment-system/finance/receivables.ts` calculates the open
balance from successful sales-payment applications via the canonical legacy
order-payment projection. Legacy `success`, `completed`, and `paid` statuses all
count as successful applications. Stored `amountDue` remains reconciliation
evidence except for one bounded compatibility case: a positive-total legacy
order with no payment rows and an explicit stored zero balance remains paid
instead of having Finance manufacture a new receivable. Partial or positive
stored balances without payment evidence continue through canonical
reconciliation rather than silently replacing calculated truth.

- Customer resolution is `businessName`, personal `name`, then billing name.
- `paymentDueDate` is the aging date. New Sales Form orders also present it as
  the Fulfillment commitment and mirror it to the order-level dispatch default;
  an invoice without one remains explicit Current / due date not set.
- Aging buckets are Current, 1-30, 31-60, 61-90, and 90+ calendar days.
- A balance difference of less than one cent is reconciled.
- The workspace is read-only; it does not change invoices or payments.

The workspace name is deliberately `Sales Finance`: `Finance` alone would imply
a company-wide general-ledger surface, while `Accounting` overstates the scope
of the current sales-payment data.

## Canonical Money Contract

All list, detail, review, and summary surfaces consume the package projection in
`packages/sales/src/payment-system/finance/projection.ts`.

- `receivedAmount` is the customer charge or recorded receipt.
- `feeAmount` is the explicit processing fee when recorded in transaction meta.
- `principalAmount` is the explicit sales/principal amount, with received less
  fees as the safe fallback.
- `refundedAmount` is the sum of linked non-deleted refund totals.
- `subTotal` is the total base subtotal from linked sales orders.
- `netAmount = receivedAmount - refundedAmount`.
- `appliedAmount` is the sum of positive, non-deleted sales-payment
  applications.
- `unappliedAmount = max(principalAmount - appliedAmount, 0)`.
- `overappliedAmount = max(appliedAmount - principalAmount, 0)`.
- Cent values are material; the comparison tolerance is below one cent.

Customer resolution uses the transaction wallet customer first, preferring
`businessName` over personal `name`. Associated order customers and billing
names are the fallback, with duplicate multi-invoice names removed.

Canonical payment methods are `card`, `check`, `zelle`, `cash`, `wire`, and
`unclassified`. Finance adapts the shared Sales payment-domain normalizer, so
credit-card, terminal, link/payment-link, cheque, and wire aliases cannot drift
from invoice summaries. Wallet remains `unclassified` in the narrower Finance
contract. Finance ledger rows stay transaction-level; grouping is limited to
summary/report totals.

Manual staff payments may carry a date-only effective payment date. Omission
means the current `America/New_York` business date, future dates are rejected,
and the selected business date is persisted consistently across the legacy
transaction/application rows and canonical ledger mirror. Audit metadata keeps
the effective date, whether it was staff-selected or recorded-now, and the
actual recording instant. Square terminal and completed payment-link receipts
use provider occurrence time when available.

The Payments ledger presents `subTotal` with the label `Sub Total` positioned immediately before the `netAmount` column (labeled `Invoice Total`). Invoices, Received, Fee, Refunded, Sub Total, Invoice Total, Applied, Unapplied, and Review use canonical small-column dimensions (120px default, 100px min, 180px max). Selection, Payment, and Actions remain non-hideable while all other ledger columns can be toggled via the accessible column control and persist across reloads and tab navigation. Both the top workspace header and table-level search input (`SalesFinanceTableSearch`) expose the right toolbar actions (`SalesFinanceAdoptionStatus`, `SalesFinanceColumnVisibility`, `SalesFinanceReports`).

## Review Contract

A transaction enters the Review queue when its package projection emits one or
more exception codes:

- `missing_customer`
- `unclassified_method`
- `missing_reference` for check or wire receipts
- `application_mismatch` for unapplied or overapplied principal
- `failed_payment` for failed, cancelled/canceled, declined, or voided status

Review is evidence-only. No financial mutation, deletion, manual payment
creation, categorization, or bank-sync behavior was copied from Midday.

Square refund review is a bounded exception to the otherwise evidence-only
queue: externally initiated Square refunds are provider truth that must be
allocated before GND can apply them. The review surface lists external refunds
in `awaiting_allocation`, their verified tender, provider amount, and eligible
orders. Only `editRefundSquare` may submit an exact principal/C.C.C./tip
allocation; the read queue follows normal Sales Finance access.

## Square Refund Contract (2026-08-21)

- Square-backed payment detail reuses the Sales Overview refund detail/action
  sheet so provider status, remaining capacity, allocations, and timeline do not
  diverge across surfaces.
- Canonical completed refunds feed Finance `refundedAmount` and net collections;
  their per-order negative compatibility rows are excluded from gross payment
  aggregation.
- A completed refund that reopens balance on a fulfilled or delivered order
  creates a canonical Resolution case/finding without reverting its operational
  lifecycle.
- Retained Square processing fees remain explicit merchant-cost metadata, not a
  deduction from customer refund or order principal.

## Reconciliation Contract

Reviewable transactions expose an append-only reconciliation session in the
transaction detail sheet:

- Opening a session records the actor, optional opening note, current exception
  evidence, and a deterministic fingerprint in the existing `Event` table.
- Resolving requires an open session and a note of at least 10 characters.
  Supported resolutions are Verified, Source corrected, Accepted legacy
  evidence, and Duplicate record.
- A resolution suppresses the transaction from the Review queue only while its
  fingerprint still matches the reviewed source evidence.
- Any change to transaction status, method, reference, customer identity, money,
  invoice applications, or exception codes makes the prior resolution Stale and
  returns the transaction to Review.
- Raw exceptions remain available as `rawNeedsReview`; reconciliation never
  edits receipt, refund, application, invoice, or customer records.

Events use the per-transaction type
`sales.finance.reconciliation.<transactionId>`. This reuses the existing
append-only evidence model and requires no database schema change.

## Account Resolution Contract

The stable `Resolution Center` tab projects the existing Sales Resolution
candidate model into Finance. It remains visible even when there are no
candidate rows and covers duplicate payments, overpayments, and stored invoice
balances that no longer match their payment applications.

- `Sync due amount` recalculates the linked invoice balance with the existing
  canonical repair operation. The Finance wrapper records authenticated
  before/after balance evidence in both `SalesResolution` and an append-only
  `Event` named `sales.finance.account-resolution.<salesId>`.
- `Cancel payment` and `Refund payment` use the existing canonical wallet
  resolution operation, which preserves payment-source history and
  recalculates linked invoice balances.
- Every correction requires an audit-evidence note of at least 10 characters.
- Resolution actions require `editOrderPayment` in both the dashboard and the
  protected API. Read-only Finance users may inspect resolution cases without
  seeing correction controls.
- Every Finance payment overview sheet includes the same permission-aware
  payment resolution panel for eligible, invoice-applied, non-cancelled
  payments. Unsupported or incomplete source records show an explanation
  instead of an unsafe action.
- Customer reassignment and invoice re-application are not silently inferred.
  Missing-customer and unapplied-payment cases stay in Review until a separate
  source workflow supplies authoritative customer or application evidence.

The legacy Accounting Resolution Center remains available throughout parallel
adoption. The Finance surface reuses its candidate classification and table
presentation, but all Finance mutations use protected `salesFinance` routes.

## Adoption and Retirement Contract

Finance and legacy Accounting record authenticated, surface-level `PageView`
evidence for a rolling 30-day readiness view. Finance distinguishes Payments,
Review, Receivables, and Resolution; Accounting records the legacy surface.
The telemetry stores route, surface group, user id, and timestamp only—never
search text, active filters, payment identifiers, or customer data.

Users with `editOrderPayment` can inspect the readiness popover. It reports
Finance and legacy views/unique users plus explicit gates for Excel reports,
Receivables, reconciliation, responsive operator acceptance, and retirement
approval.

Legacy Accounting cannot retire automatically. `retirementEligible` remains
false until responsive operator acceptance and explicit approval are recorded;
the route, sidebar link, and data contract remain intact in the meantime.

For users who can access legacy Accounting or Accounting Resolution, the
primary Sales navigation now uses Sales Finance as the entry point and omits
both legacy links. This is a navigation-only migration:
`/sales-book/accounting` and
`/sales-book/accounting/resolution-center` remain authorized and are available
from permission-aware actions in the Finance header. The first recorded Finance
visit shows a one-time transition dialog, and the legacy Accounting page shows
a persistent path back to Sales Finance. No redirect, data mutation, or
automatic retirement is introduced.

## API

The `salesFinance` tRPC router is protected and exposes:

- `salesFinance.transactions`
  - last 30 calendar days by default
  - URL-compatible search/date/method/status/application/exception/customer/
    sales-rep filters
  - `all` and `review` tabs
  - deterministic sorting and 50-row offset-cursor pages
- `salesFinance.summary`
  - canonical received, refund, net, fee, unapplied, transaction-count, and
    review-count totals
  - per-method received/refund/net totals
- `salesFinance.analytics`
  - accepts the same active view and filters as the ledger
  - returns continuous collections trend buckets, gross-receipt payment-method
    mix, and review age/reason distributions from the canonical projection
  - uses daily buckets through 45 days, weekly buckets through one year, and
    monthly buckets after one year
  - rejects periods over ten years with `BAD_REQUEST` to keep the response
    bounded
- `salesFinance.report`
  - accepts the same URL-backed period, tab, search, payment-method, status,
    application-status, and review-reason filters as the ledger
  - produces typed workbook data for Payments Ledger, Collections by Payment
    Method, Payment Applications, Finance Review Exceptions, and Collections
    by Customer
  - includes Report Context and Summary sheets; aggregate reports also include
    auditable Source Payments
  - rejects more than 10,000 matching payments with a `BAD_REQUEST` that asks
    the operator to narrow the filters instead of silently truncating
- `salesFinance.transactionDetail`
  - canonical receipt fields plus invoice applications
  - restricted to sales-linked, Square-linked, or refund-linked transactions
  - includes effective/raw review state, reconciliation status, and append-only
    reconciliation history
- `salesFinance.reconciliationStart`
  - opens or reopens a session against the current exception fingerprint
  - records actor, note, and immutable evidence without changing finance data
- `salesFinance.reconciliationResolve`
  - requires an open current-fingerprint session and a typed resolution plus
    required evidence note
  - hides the exception from Review only while the source fingerprint matches
- `salesFinance.receivables`
  - all open invoices by default; no implicit 30-day truncation
  - search, inclusive due-date range, aging buckets, deterministic sorting, and
    bounded offset-cursor pages
- `salesFinance.receivablesSummary`
  - filtered total outstanding, customer/invoice counts, reconciliation count,
    and amount/count for all five aging buckets
- `salesFinance.receivableDetail`
  - invoice/customer/due-date evidence, canonical and stored balances, and
    payment applications
- `salesFinance.receivablesReport`
  - filter-aware Receivables Aging and Receivables by Customer workbook
    contracts with context, summary, and auditable source-invoice sheets
  - rejects more than 10,000 matching invoices instead of truncating
- `salesFinance.resolutions`
  - protected, paginated Finance projection of the canonical Sales Resolution
    candidates and existing URL-backed filters
- `salesFinance.resolutionsSummary`
  - protected filtered resolution count for the Finance table controls
- `salesFinance.resolutionSyncBalance`
  - requires `editOrderPayment`, a case id, and audit evidence
  - repairs the stored invoice balance and records authenticated before/after
    evidence
- `salesFinance.resolutionPayment`
  - requires `editOrderPayment`
  - validates cancel/refund input and a minimum 10-character audit note before
    invoking the canonical payment resolution operation
- `salesFinance.adoptionPing`
  - records one authenticated surface-level PageView per mounted client surface
  - returns `isFirstFinanceVisit` when the current user has no earlier,
    non-deleted Finance PageView; legacy Accounting pings never set it
- `salesFinance.adoptionReadiness`
  - returns rolling 30-day Finance/legacy activity and explicit non-automatic
    retirement gates

Every endpoint requires an authenticated user plus one of
`viewOrderPayment`, `editOrderPayment`, `viewSales`, or `editSales`. Report
generation also requires `generateSalesPaymentReport`; reconciliation mutations
additionally require `editOrderPayment`. Account-resolution mutations also
require `editOrderPayment`.

## UI Contract

- For users with legacy Accounting or Accounting Resolution access, the Sales
  sidebar makes `Sales Finance` the primary entry and omits both legacy links.
  Direct legacy route authorization remains unchanged.
- The Finance title exposes permission-aware `Sales Reports` and
  `Open legacy Accounting` actions, plus `Open legacy Resolution Center` for
  users with `editSalesResolution`.
- A user’s first recorded Finance visit opens a transition dialog that explains
  the new workspace and preserves an explicit legacy Accounting path.
- Legacy Accounting displays a transition banner with a direct return to Sales
  Finance.
- The page uses a compact title block with a Beta badge and reduced top padding.
- Five responsive summary cards show received, net, refunds, unapplied, and
  review count.
- All Payments, Review Queue, Receivables, and Resolution Center are stable URL-backed
  Midday-style product tabs. They remain visible with zero matching rows and
  show empty states; database contents control counts and rows, not navigation.
- The standard Sales Orders Midday filter bar owns URL-backed search, inclusive
  date range, payment method, payment status, application, and review-reason
  filters, with active chips and clear-all behavior.
- Shared filter-icon agreements map payment method, status, application, and
  review reason to semantic icons instead of the generic Search fallback.
- The ledger is virtualized and owns both vertical and horizontal scrolling.
- Columns are resizable, reorderable, persist through the shared table-settings
  cookie, and support visibility/divider controls.
- Payment and selection columns remain sticky; table headers stay aligned while
  scrolling.
- Row and View actions open a URL-addressable `transactionId` detail sheet.
- Reviewable detail sheets expose an audited reconciliation panel. Users with
  `editOrderPayment` can open/reopen and resolve a session; read-only users can
  inspect the status and history.
- Every payment detail sheet includes a Payment resolution section. Eligible
  payments expose audited Cancel/Refund controls only to
  `editOrderPayment` users; API authorization remains authoritative.
- Resolution Center uses the standard Midday search/filter toolbar, the shared
  compact Sales Resolution table, persistent column controls, and table-owned
  horizontal/vertical scrolling.
- Selection shows a clearable bottom action bar. Financial bulk mutations are
  intentionally absent.
- A deferred Reporting snapshot loads after the primary summary/filter shell
  and shows:
  - an accessible collections chart with received, net, and refunds
  - gross-receipt share and payment count by method
  - review exposure in 0–7, 8–14, 15–30, and 31+ day buckets
  - the active review-reason distribution
- The reporting snapshot has responsive cards, loading/empty/error/retry states,
  and always follows the active Finance view and filters.
- The Reports toolbar menu is visible to users with
  `generateSalesPaymentReport` and generates one of five `.xlsx` workbooks from
  the active view and filters. Workbooks preserve numeric money cells and real
  date cells, apply currency/date formats, freeze and filter headers, and use
  report-specific filenames.
- Mobile has no document-level horizontal overflow; wide ledger content remains
  horizontally scrollable inside the table.
- Receivables has six responsive aging cards, the standard search/due-date/
  aging filter bar, a virtualized persistent table, semantic calendar icons,
  and URL-addressable invoice detail.
- The receivable detail sheet shows `Open sales overview` only to users with
  `editOrders`; the link uses the receivable's canonical order number.
- The receivables Reports menu generates Receivables Aging or Receivables by
  Customer `.xlsx` workbooks from the active search, due-date, and aging
  filters.
- Finance and legacy Accounting emit privacy-bounded adoption evidence. Finance
  headers expose a permission-aware readiness popover, while retirement remains
  an explicit human decision.

## Midday Migration Conformance

Reference inspected:
`apps/dashboard/src/app/[locale]/(app)/(sidebar)/transactions` and its table,
filter, store, sheet, schema, router, and database-query dependencies in the
Midday repository. The Receivables slice also inspected Midday Invoices route,
header/filter, URL hooks, virtualized table/header/columns, empty/skeleton, and
detail-sheet patterns.

Adopted patterns:

- thin route shell and Suspense/error boundaries
- URL-owned tab/filter/detail state
- the shared Sales Orders search/filter, page-tab, active-chip, and toolbar
  composition
- summary-first information hierarchy
- deferred, independently queried analytics instead of adding chart data to the
  first-paint list or summary response
- virtualized ledger with sticky columns, DnD, resizing, settings, and selection
- detail-on-demand sheet and bottom selection bar
- responsive table-owned scrolling

Intentional GND deviations:

- sales payment records remain authoritative; no bank-provider transaction model
- no manual create/edit/delete, categorization, bank sync, or accounting-provider
  export
- protected query components mount after the authenticated browser session is
  available; this avoids unauthenticated server-render requests in the current
  dashboard auth bridge

## Validation Evidence

- Focused projection, analytics-builder, report-builder, API query,
  Excel-rendering, and dashboard migration-parity coverage:
  - 23 tests, 132 assertions passed
  - covers business-name precedence, personal fallback, multi-invoice
    deduplication, missing customer/unapplied review, shared summary math, and
    one-cent applications
  - covers all five report types, report-specific and auditable source sheets,
    numeric Excel money/date values, deterministic filenames, filter context,
    customer grouping, permission visibility, and the filter-aware API report
    contract
  - covers continuous daily trend buckets, bounded weekly/monthly
    granularities, method-mix percentages, review aging/reasons, filtered API
    parity, deferred dashboard loading, and all three reporting widgets
  - covers the parallel route, visible-by-default Customer column, table
    scrolling/resizing/reordering, standard Midday filter composition, semantic
    icon mappings, and flat multi-select URL/API values
- Receivables projection/API/report/parity coverage adds:
  - business/personal/billing/missing customer precedence
  - canonical balance and stored-balance reconciliation evidence
  - all aging boundaries and filtered aging summaries
  - protected paginated list/summary/detail/report contracts
  - numeric Receivables Aging and customer-balance Excel sheets with source
    invoices
  - URL state, semantic due-date/aging icons, persistent table controls,
    internal scroll, detail sheet, and both report menu types
- Reconciliation package/API/dashboard coverage adds:
  - unreviewed, in-progress, resolved, and stale fingerprint states
  - current-resolution Review suppression and source-change re-entry
  - open-session precondition, typed resolutions, permission enforcement, and
    append-only history
- Account Resolution coverage adds:
  - stable Finance routing and adoption-surface state
  - protected resolution list/summary plus `editOrderPayment` correction
    boundaries
  - required audit evidence for sync, cancel, and refund actions
  - shared resolution-table parity and permission-aware payment-sheet controls
- Adoption coverage adds:
  - Finance/legacy PageView recording, rolling 30-day aggregation, per-surface
    counts, stable product tabs, permission-aware status UI, and a hard
    `retirementEligible: false` gate
  - first-Finance-visit detection, migration dialog copy, permission-aware
    Finance header links, hidden legacy navigation, preserved direct-route
    authorization, and the legacy return banner
- Current combined Finance suite: 46 tests and 265 assertions passed across
  package projections/builders, API queries, Excel rendering, and dashboard
  parity.
- `bun --filter @gnd/sales typecheck` passed.
- `@gnd/api` and `@gnd/dashboard` typechecks passed for the Receivables slice.
- Focused Sales Finance tests and Biome pass.
- Focused Biome passed after formatting.
- Authenticated browser proof on real data confirmed:
  - 351 payments in the default period
  - three review transactions with missing-customer/application-mismatch,
    failed-payment, and missing-reference evidence
  - the orphaned receipt reports `$63.74` unapplied
  - detail sheet for payment `11665` reconciles `$163.42` received with
    `$158.66` applied
  - column visibility and selection bottom bar work
  - the Sales Orders-style filter menu renders semantic date/payment/status/
    application/review icons, a selected Cash filter emits `["cash"]`, its
    active chip appears, and the filtered API returns successfully
  - the Reports menu exposes all five report types; generating Finance Review
    Exceptions from the Review queue returned HTTP 200 and confirmed a
    three-payment Excel download
  - large-screen header/table alignment and internal horizontal scroll work
  - `390x844` has document `scrollWidth === clientWidth` while the table retains
    its own wide scroll surface
- Authenticated 2026-07-30 browser proof for the newest slices confirmed:
  - stable All, Review queue, Receivables, and Resolution Center tabs with three
    live Review rows
  - unreviewed transaction detail with raw exception evidence and the
    permission-aware Open reconciliation control
  - Receivables totals for 2,373 invoices, all six summary cards, canonical
    balance drill-down, and default/optional column visibility
  - semantic calendar icons for Due Date and Aging, a working `90_plus` URL
    filter, and only 90+ rows in the filtered viewport
  - table-owned horizontal and vertical scrolling at desktop and mobile
  - a successful 492,651-byte Receivables Aging `.xlsx` download
  - adoption readiness with legacy retained and both human approval gates
  - `1440x900` and `390x844` layouts with no document-level horizontal overflow
    and no console errors; only the pre-existing logo aspect-ratio warning
  - live Resolution Center cases for duplicate payments, overpayments, and
    stale due amounts; correction controls appeared for an authorized user
  - payment `11665` exposed Payment resolution on desktop and mobile; its
    resolution dialog required audit evidence and kept Apply disabled without
    it, and no financial mutation was submitted
  - at `390x844`, product tabs scroll inside their own strip, the resolution
    table measured `1248px` of content inside a `325px` viewport, and the
    document itself remained overflow-free
- Responsive automated proof is complete, but the readiness gate deliberately
  remains pending until an operator accepts the workflow.
- Authenticated 2026-08-05 browser proof confirmed the progressive migration on
  desktop and mobile: Accounting is absent from primary navigation, the Finance
  header opens legacy Accounting, the legacy banner returns to Finance, and no
  new console errors were emitted.

## Next Slices

- Complete responsive browser/operator acceptance for Receivables,
  reconciliation, adoption status, and workbook downloads.
- Gather role feedback and adoption evidence, then request an explicit decision
  before redirecting or deleting legacy Accounting.
- Design PDF reports only after the Excel report contracts have adoption
  evidence.
