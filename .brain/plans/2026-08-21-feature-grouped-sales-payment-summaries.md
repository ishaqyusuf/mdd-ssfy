# Grouped Sales Payment Summaries

## Status

Implemented locally on 2026-08-21. The payment-domain projection, Sales
Overview DTO and General tab, mobile financial ledger, invoice HTML/PDF footer,
and payment-method report normalization now share the approved contract.
Transactions and Finance detail ledgers remain itemized.

Validation completed with 46 focused tests / 154 assertions,
`@gnd/sales` typecheck, changed-file compiler filtering, and authenticated
in-app browser proof on `09397LM`. The broad API and Dashboard typechecks retain
unrelated baseline errors documented in Progress.

## Objective

Replace repeated per-payment lines in invoice/payment summary surfaces with one
accurate group per canonical payment method. Each group totals invoice
principal, actual recorded C.C.C., optional tip, and total customer charge; it
shows a payment-count line only when the method was used more than once.
Transaction histories, refund timelines, and Finance audit ledgers remain
itemized so operational evidence is never hidden.

## Assumptions

- This is a presentation/read-model change. No payment, refund, order-balance,
  or accounting mutation behavior changes.
- A “payment” means one unique successful, positive receipt. Pending, failed,
  cancelled, deleted, zero-value, and negative refund compatibility rows do not
  contribute to payment totals or counts.
- Payment count means unique receipt/tender count, not Sales Payment allocation
  row count. Identity should prefer customer transaction/provider tender
  identity and fall back to the Sales Payment id.
- Card aliases (`card`, `credit-card`, `credit card`, `terminal`, `link`,
  `payment-link`) share the `card` display group. Cash, check/cheque, Zelle,
  wire, wallet, and unclassified remain separate groups.
- C.C.C. is shown only from exact recorded charge evidence matched to the
  payment principal. Historical or multi-order payments without allocatable
  charge evidence show principal but do not invent C.C.C.
- Merchant processing fees are not C.C.C. and are never added to customer
  charge totals. C.C.C. remains a payment-channel charge under ADR-011.
- If a payment group has one receipt, its count line is omitted. If it has two
  or more, the group shows a line such as `Card Payments Made — 2`.
- No database migration is expected; the required identifiers and monetary
  metadata already exist. The overview/print selects may need small additive
  identity fields for safe receipt deduplication.

## Detailed Execution Plan

### 1. Lock the display and accounting contract

1. Add a fixture for the observed order `09397LM`:
   - Card principal: `$2,277.13` and `$182.22`.
   - Recorded C.C.C.: `$68.31` and `$5.47`.
   - Expected grouped principal: `$2,459.35`.
   - Expected grouped C.C.C.: `$73.78`.
   - Expected customer charged: `$2,533.13`.
   - Expected count: `2`.
2. Approve this Invoice Details presentation:
   - `Payment Method — Credit Card`
   - `Card Payment — $2,459.35`
   - `C.C.C. on Card Payment — $73.78`
   - `Charged to Card — $2,533.13`
   - `Card Payments Made — 2`
   - Existing order total, paid-toward-order, and balance-due lines remain once.
3. Define conditional-row rules:
   - Omit count at `1`.
   - Omit C.C.C. when zero or not recorded.
   - Omit tip when zero; show one grouped tip line when non-zero.
   - Omit `Charged to …` when it would merely repeat a non-card principal with
     no C.C.C. or tip.
4. Define the top-level Payment Method value:
   - No completed receipt: show the selected/expected method.
   - One completed method family: show that method label.
   - Multiple method families: show `Mixed — Card, Cash, …`.
5. Keep detail/audit surfaces outside the collapse rule. The Sales Overview
   Transactions tab, payment secondary pane, Sales Finance ledger/detail,
   refund timeline, and customer transaction history must retain each receipt,
   timestamp, status, provider identity, and refund association.

Dependency: none. This phase is the acceptance contract for all later work.

Validation: fixture review against the live `09397LM` Invoice Details and ADRs
001/011.

### 2. Create one payment-summary domain projection

1. Add a focused domain module such as
   `packages/sales/src/payment-system/domain/payment-summary.ts`.
2. Define an input adapter that accepts the existing payment fields without a
   Prisma dependency: receipt identities, status, amount, tip, method candidates,
   metadata sources, timestamps, and deletion state.
3. Define a cents-based output contract:
   - Overall successful receipt count.
   - Principal paid, C.C.C., tip, and customer-charged totals.
   - Ordered `groups[]` containing canonical method key, display label, unique
     receipt count, principal cents, C.C.C. cents, tip cents, customer-charged
     cents, and evidence quality (`recorded`, `partial`, or `unavailable`).
4. Centralize payment-method aliases in the payment domain. Reuse the same
   normalization from Sales Finance and the daily-payment report where their
   narrower contracts allow it, avoiding three drifting card alias lists.
5. Extract C.C.C. only from explicit `paymentCharges[]`, matching
   `salesAmount`/`baseAmount`, `feeAmount`, and `customerChargeAmount` evidence.
   Do not confuse Square-retained merchant processing fees with customer C.C.C.
6. Deduplicate receipts before grouping:
   - Prefer `transactionId` or verified provider/tender identity.
   - Fall back to Square payment identity.
   - Finally fall back to the Sales Payment id.
   - Keep separate applications to different invoices scoped to their own
     principal allocation while preventing duplicate receipt counts.
7. Produce a small presentation-line adapter from the summary contract so web,
   mobile, and print do not independently rebuild labels and omission rules.

Dependency: Phase 1.

Validation: unit tests for cents rounding, alias normalization, stable group
order, deduplication, conditional count, missing metadata, mixed methods, wallet,
tips, refunds, and multi-order allocations.

### 3. Make the Sales Overview API projection authoritative

1. Extend `SalesOverviewInclude.payments` and the print financial include only
   with the stable identity fields required by the domain projection. Avoid
   loading full transaction or provider records.
2. In `apps/api/src/dto/sales-dto.ts`, replace the loop that emits three lines
   for every recorded card charge with the shared grouped projection.
3. Add an additive `paymentSummary` field to the Sales Overview DTO. Keep
   `costLines` during compatibility rollout, but generate its payment-related
   lines from the same projection so old consumers receive grouped rows too.
4. Preserve order-cost lines independently from payment lines:
   subtotal, extra costs, taxes, order total, paid toward order, and balance due
   remain order/accounting facts; method groups remain payment facts.
5. Preserve existing unpaid-card estimate behavior. Estimated C.C.C. is not a
   completed payment group and never increments payment count.
6. Confirm completed refunds and negative compatibility Sales Payments do not
   reduce gross receipt groups or increase receipt counts. Refund/net truth
   stays in the refund/transaction projection.

Dependency: Phase 2.

Validation: extend `apps/api/src/dto/sales-dto.test.ts` with the exact `09397LM`
case, single card, repeated cash, card plus cash, alias mixing, unknown method,
missing C.C.C. metadata, refund compatibility rows, and multi-order payment
evidence.

### 4. Roll the grouped presentation through summary surfaces

| Surface | Planned behavior |
| --- | --- |
| Sales Overview → General → Invoice Details | Render one method group and conditional count using `paymentSummary`; stop rendering raw repeated payment lines. |
| Mobile Sales Order Detail → Financial | Consume the same API summary and render the same groups/omission rules; retain a legacy `costLines` fallback during rollout. |
| Invoice HTML preview and PDF | Refactor `payment-footer-state` to consume the shared domain projection. Keep the compact overall footer, but show each method once and show a count only when greater than one. |
| Customer statements with embedded invoices | Inherit the shared invoice print contract; add no statement-local payment math. |
| Sales Finance method-mix and daily payment reports | Reuse shared method normalization and keep aggregate count/totals. Do not replace their transaction-level source rows. |
| New Sales Form payment estimate/review | Keep estimate-only behavior; no payment count exists before settlement. |
| Payment receipts and single-payment emails | Keep one-receipt detail; do not add an unnecessary count of one. |

1. Update the Dashboard Invoice Details component to render semantic group rows
   with stable keys instead of mapping index-based repeated cost lines.
2. Update the mobile overview model and tests to prefer `paymentSummary` and
   create mobile-native ledger rows from the shared contract.
3. Refactor the print payment footer state to call the shared projector. Keep
   PDF/HTML templates presentation-only and preserve their shared `PrintPage`
   payload authority.
4. Align existing Sales Finance and daily-report method normalization with the
   new alias contract without changing their accounting totals or audit rows.
5. Audit remaining uses of `SalesPayments`, `costLines`, `recordedCardCharges`,
   and labels such as `Card Payment`/`Charged to Card`. Classify each as summary,
   detail ledger, payment-entry preview, or unrelated domain before changing it.

Dependency: Phase 3. Web can land first behind the additive DTO contract;
mobile and print follow before the compatibility lines are considered stable.

Validation: component/model tests plus HTML/PDF payload assertions for each
surface. Verify accessibility labels and mobile wrapping for multi-method names.

### 5. Protect detailed histories and accounting correctness

1. Add explicit regression tests proving two card receipts remain two rows in:
   - Sales Overview Transactions.
   - Payment secondary detail/history.
   - Sales Finance payment ledger/detail.
   - Customer payment history where it is an audit ledger.
2. Verify grouping never changes:
   - `SalesOrders.grandTotal` or `amountDue`.
   - Sales Payment, Customer Transaction, Square, canonical ledger, allocation,
     refund, or wallet records.
   - Refund capacity, net received, receivable aging, commissions, or reports.
3. Verify payment counts use receipt identity, not allocation count, for a
   payment applied across multiple invoices.
4. Verify a completed refund remains separately visible and does not silently
   turn “two payments” into “one net payment.”
5. Verify historical payments without exact C.C.C. evidence show no fabricated
   fee and optionally expose `C.C.C. not recorded` only in detail views.

Dependency: Phases 2–4.

Validation: focused package/API/UI suites and source-contract tests around
ledger preservation.

### 6. Browser acceptance and rollout

1. Run authenticated desktop browser QA on `09397LM`:
   - One Card group only.
   - `$2,459.35` principal.
   - `$73.78` C.C.C.
   - `$2,533.13` charged.
   - Count line `2`.
   - No duplicate card blocks.
2. Open Transactions and confirm both original card receipts remain separately
   inspectable with their timestamps and payment identities.
3. Repeat on narrow/mobile width and in the Expo Sales Order Detail.
4. Validate one-payment, mixed-method, unpaid-card-estimate, partial-payment,
   refunded, and historical-metadata fixtures.
5. Compare HTML preview and downloaded PDF for identical summary semantics.
6. Run scoped Biome, `@gnd/sales` typecheck, focused API/Dashboard/mobile tests,
   and filtered broad compiler output for changed-file diagnostics.
7. Update Sales Overview, Sales Finance, mobile sales, print/PDF, API contract,
   and payment feature Brain docs. Add an ADR only if implementation changes the
   established payment authority or C.C.C. policy; the recommended approach
   remains within ADR-001 and ADR-011 and should not require a new ADR.

Dependency: all implementation phases.

Validation gate: do not remove compatibility fields or broaden aggregation into
audit ledgers until every acceptance case passes.

## Skills List Used

- `plan` — structured this as an execution-ready, phased plan with assumptions,
  dependencies, validation, and risks.
- `from-in-app-browser` — tied the plan to the currently open Sales Overview
  and identified the actual repeated Invoice Details presentation.
- `browser:control-in-app-browser` — inspected authenticated order `09397LM`
  without mutating browser or application data.
- `Project Brain integration` — aligned the plan with the payment-domain,
  C.C.C., Sales Overview, Sales Finance, Midday, and documentation contracts.

## Risks and Mitigations

- **Grouping hides audit evidence.** Aggregate only summary/breakdown surfaces;
  keep ledgers and transaction detail itemized and regression-tested.
- **Payment count overstates multi-order receipts.** Deduplicate by stable
  receipt/tender identity before grouping; never count allocation rows.
- **C.C.C. is guessed for historical records.** Require exact, principal-matched
  recorded metadata; omit unknown C.C.C. from summaries.
- **Merchant fees are mislabeled as customer C.C.C.** Read only explicit
  customer charge metadata and retain Square processing fees as merchant cost.
- **Float addition produces visible cent drift.** Convert inputs to cents,
  aggregate integers, and format only at presentation boundaries.
- **Refund rows contaminate payment totals.** Exclude non-positive and refund
  compatibility rows; keep refunds as separate provider/accounting facts.
- **Method aliases drift across Finance, reports, print, and invoices.** Own the
  alias map in the payment domain and adapt narrower consumers from it.
- **Additive API rollout breaks older mobile clients.** Keep `costLines`, make
  `paymentSummary` additive, and retain mobile fallback until adoption is
  verified.
- **Print becomes cluttered.** Apply the same omission rules: no count of one,
  no zero C.C.C./tip rows, and no redundant non-card charged-total row.
