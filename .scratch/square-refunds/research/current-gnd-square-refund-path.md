# Current GND Square Refund Path Audit

Date: 2026-08-19

Scope: primary local sources only. This audit traced the Square adapter, API
routers/queries/schemas, shared Sales payment and resolution packages, Prisma
models and migrations, permission generation, Finance and Resolution Center
UI, Sales Overview transaction access, jobs, notifications, documents, and
tests. It describes current behavior; it does not approve an implementation.

## Executive answer

GND does not currently have a trustworthy Square-refund lifecycle. It has one
low-level Square SDK call inside an older generic payment-resolution workflow.
That workflow records a successful local refund, changes one Sales Order's
balance, mirrors posted ledger rows, sends a “refunded” notification, and
regenerates documents without proving that Square completed the refund.

The most serious current properties are:

1. Square errors are converted to `{ success: false }` and ignored, so local
   completion can commit after provider rejection
   (`packages/square/src/index.ts:88-142`,
   `apps/api/src/db/queries/wallet.ts:83-121`).
2. The identifier submitted to Square is usually not a Square Payment id.
   Payment-link records store a generated placeholder in
   `SquarePayments.paymentId`, while Terminal records store a Terminal checkout
   id; the real tender payment id is read transiently and discarded
   (`packages/sales/src/payment-system/application/create-pending-legacy-sales-checkout.ts:23-55`,
   `apps/api/src/db/queries/sales-payment-processor.ts:683-714`,
   `apps/api/src/db/queries/checkout.ts:1034-1053`).
3. A multi-order payment is refundable only through an implicit
   `salesPayments[0]`; the complete requested amount is applied to that one
   inferred order. There is no allocation input or sum invariant
   (`apps/api/src/db/queries/wallet.ts:43-74`).
4. There is no pending provider state, reservation, webhook ingestion, retry
   state, timeout state, failure state, or external-refund reconciliation path.
   The persisted `SquareRefunds` row has no amount, currency, status,
   allocation, actor id, or lifecycle timestamps
   (`packages/db/src/schema/sales.wallet.prisma:127-141`).
5. The requested `can.editRefundSquare` capability does not exist. Finance uses
   `editOrderPayment`; a second compatibility mutation is merely
   authentication-by-handler and has no refund permission check
   (`packages/utils/src/constants.ts:142-160`,
   `apps/api/src/trpc/routers/sales-finance.route.ts:155-165`,
   `apps/api/src/trpc/routers/sales.route.ts:1300-1304`).
6. The newer Finance ledger does not recognize refunds made by the current
   resolver. It derives `refundedAmount` only from `RefundTransactions ->
   Refunds`, but the resolver never writes those models; live Finance can show
   zero refunded/net unchanged while order balance and daily-payment reporting
   treat the negative Sales Payment as a refund
   (`packages/sales/src/payment-system/finance/projection.ts:299-323`,
   `packages/sales/src/payment-system/reports/sales-daily-payment-report.ts:229-250`).

The safe classification is therefore: the shared package boundaries and
projection contracts are the intended canonical architecture, but today's
refund execution remains compatibility-only and is not suitable to extend as a
Square-refund state machine without a new canonical command/lifecycle.

## What exists today

### 1. Square provider adapter

`@gnd/square` owns environment selection and the Square SDK client
(`packages/square/src/index.ts:11-31`). Its only refund function is
`squareCreateRefund`:

- It accepts a caller-provided provider payment id, untyped amount/reason, a
  Prisma transaction client, author name, and note
  (`packages/square/src/index.ts:80-95`).
- It fetches the Square payment amount only when `amount` is falsy. Normal
  resolver requests always provide an amount, so this path does not verify the
  payment's status, tender, original amount, already-refunded amount, or
  remaining refundable amount (`packages/square/src/index.ts:96-106`).
- It generates a fresh random idempotency key on every invocation
  (`packages/square/src/index.ts:116-124`). The key is not persisted and cannot
  make a user retry or job retry idempotent.
- After the API call it creates a minimal `SquareRefunds` row, but does not save
  the provider refund id even though the model has a `refundId` field; the
  assignment is commented out (`packages/square/src/index.ts:125-134`).
- It returns no success value on success. On any exception it returns
  `{ success: false, error }` instead of throwing (`packages/square/src/index.ts:135-142`).

The Square package test file covers environment selection, device-id
normalization, paired Terminal discovery, and Terminal readiness timing only
(`packages/square/test/index.test.ts:1-104`). It has no refund tests.

### 2. Persisted Square payment identity

The legacy `SquarePayments` record has an internal cuid `id`, an overloaded
nullable unique `paymentId`, a Square order id, payment method, amount, tip,
status, and links to Sales Payments/orders/checkouts
(`packages/db/src/schema/sales.wallet.prisma:100-125`). Current writers give
`paymentId` different non-tender meanings:

- Payment link: `paymentId` is a locally generated random string; the internal
  cuid is put in the checkout token, and only Square's order id is linked later
  (`packages/sales/src/payment-system/application/create-pending-legacy-sales-checkout.ts:23-55`,
  `packages/sales/src/payment-system/application/link-legacy-sales-checkout-square-order.ts:8-19`).
- Terminal: `paymentId` is the Terminal checkout id returned by
  `terminal.checkouts.create`, not the payment tender id
  (`packages/square/src/index.ts:338-373`,
  `apps/api/src/db/queries/sales-payment-processor.ts:674-714`).
- Payment-link verification queries the Square order's tenders, gets each real
  `tender.paymentId`, and calls `payments.get`, but persists none of those
  tender ids (`apps/api/src/db/queries/checkout.ts:1020-1053`).

The Sales transaction projection then exposes the first linked
`SquarePayments.paymentId` as `squarePaymentId`
(`apps/api/src/db/queries/sales-transactions.ts:112-125`,
`apps/api/src/db/queries/sales-transactions.ts:215-216`). Consequently the
Resolution Center sends a local placeholder or Terminal checkout id to the
Payments Refund API.

### 3. Generic payment-resolution write path

`resolvePayment` in `apps/api/src/db/queries/wallet.ts` is the active shared
resolver behind both current UI paths. For `action === "refund"` it performs,
inside one database transaction, the following sequence:

1. Load the transaction's Sales Payments and take the first order id, without
   ordering or validating an allocation (`apps/api/src/db/queries/wallet.ts:43-64`).
2. Append one negative, immediately successful `SalesPayments` row for the
   entire refund amount (`apps/api/src/db/queries/wallet.ts:65-81`,
   `packages/sales/src/payment-system/application/append-legacy-refund-sales-payment.ts:20-45`).
3. Emit the standard “sales payment refunded” notification before calling
   Square (`apps/api/src/db/queries/wallet.ts:75-77`).
4. If the selected refund method is exactly `terminal` or `credit-card`, call
   `squareCreateRefund`; `link` is not included. The returned failure is not
   inspected (`apps/api/src/db/queries/wallet.ts:82-94`).
5. For every refund method, create a second successful customer transaction.
   It is wallet type only for method `wallet`, otherwise generic `transaction`,
   and it is mirrored as another posted `refund_recorded` ledger entry
   (`apps/api/src/db/queries/wallet.ts:95-110`,
   `packages/sales/src/payment-system/application/create-legacy-wallet-refund-transaction.ts:12-31`,
   `packages/sales/src/payment-system/infrastructure/canonical-mirror.ts:344-387`).
6. Recalculate one order balance and create a resolved Sales Resolution
   (`apps/api/src/db/queries/wallet.ts:112-122`).
7. After the database transaction has committed, expire and warm only that one
   order's invoice/order-packing documents
   (`apps/api/src/db/queries/wallet.ts:123-153`).

This is explicitly a legacy compatibility bundle: the shared application
services are named `appendLegacyRefundSalesPayment`,
`createLegacyWalletRefundTransaction`, and
`repairLegacySalesPaymentBalance`. Project history says those services were
extracted to centralize legacy writes and dual-write canonical mirrors, not to
finish the cutover (`.brain/progress.md:7229-7260`). ADR-001 likewise says
`payment-system` owns future write orchestration while legacy and canonical
structures coexist (`.brain/decisions/ADR-001-payment-and-resolution-boundaries.md:11-16`,
`.brain/decisions/ADR-001-payment-and-resolution-boundaries.md:26-43`).

### 4. Legacy and canonical persistence

The operational compatibility graph is:

- `CustomerTransaction`: receipt/account row, optional wallet and Square link
  (`packages/db/src/schema/sales.wallet.prisma:1-28`).
- `SalesPayments`: mutable order application rows; current refunds are negative
  rows with `status = "success"` (`packages/db/src/schema/sales.wallet.prisma:60-98`,
  `packages/sales/src/payment-system/application/append-legacy-refund-sales-payment.ts:34-43`).
- `SquarePayments`: provider-adjacent payment/check-out record, with overloaded
  identity as described above (`packages/db/src/schema/sales.wallet.prisma:100-125`).
- `SquareRefunds`: minimal attempted-provider record
  (`packages/db/src/schema/sales.wallet.prisma:127-141`).
- `Refunds` and `RefundTransactions`: a separate historical refund graph used by
  Finance reads, but no current writer was found anywhere under `apps/` or
  `packages/` (`packages/db/src/schema/sales.refund.prisma:1-36`,
  `apps/api/src/db/queries/sales-finance.ts:97-111`).
- `SalesResolution`: action/reason/resolver-name evidence with no actor id or
  provider evidence (`packages/db/src/schema/sales.accounting.prisma:1-9`).

The intended canonical foundation consists of `PaymentLedgerEntry`,
`PaymentAllocation`, and `PaymentProjection`. The ledger has useful but unused
`idempotencyKey`, `squarePaymentId`, and `refundId` fields
(`packages/db/src/schema/sales.payment-system.prisma:1-31`); allocation and
projection tables support order-scoped refund amounts and derived totals
(`packages/db/src/schema/sales.payment-system.prisma:33-65`). However, runtime
code only writes these tables through the guarded compatibility mirror and the
reconciliation script reads only `PaymentProjection`; current API/Finance
queries do not use them as write or read authority
(`packages/sales/src/payment-system/infrastructure/canonical-mirror.ts:43-49`,
`packages/sales/src/payment-system/infrastructure/canonical-mirror.ts:266-342`).

The refund mirror inserts a posted negative `refund_recorded` ledger entry and
a negative `refund` allocation with fresh random row ids, then recomputes the
projection from legacy Sales Payments (`packages/sales/src/payment-system/infrastructure/canonical-mirror.ts:266-342`).
It does not set a business idempotency key or provider refund id. Its projection
read selects only non-deleted `status = "success"` legacy rows, splits positive
and negative amounts, and caps due at zero
(`packages/sales/src/payment-system/infrastructure/canonical-mirror.ts:71-107`).

### 5. Sales Order balance paths

The legacy stored balance recalculator sums every `SalesPayments` row whose
status is exactly `success`; its deleted-row filter is commented out. A negative
refund row therefore increases `SalesOrders.amountDue` immediately, before
provider truth (`packages/sales/src/sales-transaction.ts:5-60`). The wrapper then
refreshes the mirrored `PaymentProjection`
(`packages/sales/src/payment-system/application/repair-legacy-sales-payment-balance.ts:9-27`).

Other projections do not have identical semantics:

- Shared legacy order projection accepts `success`, `completed`, and `paid`,
  maps all signed amounts as payment allocations, and derives due from their
  signed sum (`packages/sales/src/payment-system/domain/order-payment-projection.ts:56-81`).
- The canonical domain projection supports a separate positive
  `refundedAmount`, but the legacy adapter never populates it
  (`packages/sales/src/payment-system/domain/order-payment-projection.ts:17-48`,
  `packages/sales/src/payment-system/domain/order-payment-projection.test.ts:34-49`).
- Finance ignores negative applications when calculating `appliedAmount` and
  reads refunds only through `RefundTransactions`
  (`packages/sales/src/payment-system/finance/projection.ts:299-331`).
- The daily payment report does the opposite: it treats negative Sales Payment
  rows as refunds (`packages/sales/src/payment-system/reports/sales-daily-payment-report.ts:229-250`).

Thus one refund can reopen stored order due and appear in the daily report and
mirrored projection while remaining absent from Finance `refundedAmount` and
`netAmount`.

### 6. Finance, Resolution Center, and Sales Overview UI

There are two distinct operator experiences:

**Finance payment detail.** The newer panel is correctly protected in UI and
API by `editOrderPayment` (`apps/dashboard/src/components/sales-finance/payment-resolution-panel.tsx:108-126`,
`apps/api/src/trpc/routers/sales-finance.route.ts:155-165`). But its refund
method list contains only wallet/check/cash/Zelle/wire, excludes Square
link/Terminal/card, and always submits `squarePaymentId: null`
(`apps/dashboard/src/components/sales-finance/payment-resolution-panel.tsx:54-60`,
`apps/dashboard/src/components/sales-finance/payment-resolution-panel.tsx:349-366`).
It therefore cannot issue a Square refund. Its “full refund” is the projected
receipt amount and there is no remaining-refund or allocation model
(`apps/dashboard/src/components/sales-finance/payment-resolution-panel.tsx:98-119`,
`apps/dashboard/src/components/sales-finance/payment-resolution-panel.tsx:259-319`).

**Legacy Resolution Center.** Its generic selector offers every Sales payment
method, including link, Terminal, and credit-card through
`SALES_REFUND_METHODS_OPTIONS` (`packages/sales/src/constants.ts:39-60`,
`packages/sales/src/constants.ts:82-90`). It takes the displayed amount and the
first exposed `squarePaymentId`, then invokes the protected Finance mutation
(`apps/dashboard/src/components/resolution-center/resolution-dialog.tsx:77-89`,
`apps/dashboard/src/components/resolution-center/resolution-dialog.tsx:139-150`).
The local mutation advertises success whenever its database/document path
returns, even though Square failure is ignored (`apps/dashboard/src/components/resolution-center/resolution-dialog.tsx:96-137`).

**Sales Overview.** The Transactions tab is read-only and opens a transaction
viewer (`apps/dashboard/src/components/sheets/customer-overview-sheet/transactions-tab.tsx:23-80`,
`apps/dashboard/src/components/tables-2/customer-transactions/columns.tsx:176-213`).
The action menu merely links users with `viewSalesResolution` to the separate
legacy Resolution Center (`apps/dashboard/src/components/sheets/sales-overview-sheet/general-action-bar.tsx:145-161`).
There is no dedicated Square Refund command/review surface in Sales Overview.

The Finance table exposes a “Refunded” amount, but the payment detail sheet does
not render that amount or individual refund attempts/statuses despite labeling
itself the canonical refund/audit detail surface
(`apps/dashboard/src/components/tables-2/sales-finance/columns.tsx:306-320`,
`apps/dashboard/src/components/sales-finance/transaction-sheet.tsx:61-74`,
`apps/dashboard/src/components/sales-finance/transaction-sheet.tsx:95-149`).

### 7. Permissions

The generated permission catalog contains `viewOrderPayment`,
`editOrderPayment`, and sales-resolution/report capabilities, but no
`editRefundSquare` resource or extra permission
(`packages/utils/src/constants.ts:132-169`,
`packages/utils/src/constants.ts:263-274`). Session hydration only generates
known resource/extra permissions, so merely adding a database permission named
`edit refund square` would not make `auth.can.editRefundSquare` available
(`packages/utils/src/constants.ts:294-339`).

Finance's resolver is a `protectedProcedure` plus `editOrderPayment`
(`apps/api/src/trpc/routers/sales-finance.route.ts:155-165`). The compatibility
`sales.resolvePayment` route is declared `publicProcedure`; its handler calls
`getAuthUser`, so an anonymous request fails, but any authenticated user can
reach it without a capability check (`apps/api/src/trpc/routers/sales.route.ts:1300-1304`,
`apps/api/src/db/queries/user.ts:39-59`). This second route accepts the weaker
base schema and directly reaches the same money/provider mutation.

### 8. Notifications and activity evidence

The shared payment event contract has one `sales_payment_refunded` event with
order number, customer name, amount, and reason only—no refund id, provider
state, initiator, allocations, failure, or pending evidence
(`packages/sales/src/payment-system/contracts/payment-events.ts:1-39`).
`appendLegacyRefundSalesPayment` emits it as soon as the local negative row is
created, before Square is called
(`packages/sales/src/payment-system/application/append-legacy-refund-sales-payment.ts:83-116`).

Dispatch sends it only to the order's sales representative as an employee
recipient (`packages/notifications/src/payment-system.ts:44-66`,
`packages/notifications/src/payment-system.ts:69-98`). The activity template
states “Payment refunded” / “refunded” unconditionally
(`packages/notifications/src/types/sales-payment-refunded.ts:8-34`). It is not a
customer-completion email and there are no failure or unusually-pending
channels. The event also sets the customer as the activity author, even though
an employee performed the resolution
(`packages/sales/src/payment-system/contracts/payment-events.ts:95-114`).

`CustomerTransactionStatus` does retain employee name/id, refund mode, reason,
and note (`packages/sales/src/payment-system/application/append-legacy-refund-sales-payment.ts:20-33`),
but the separate `SalesResolution` stores resolver name only, and the canonical
resolution mirror does not populate `ResolutionAction.actorId`
(`packages/sales/src/resolution-system/application/create-legacy-sales-resolution.ts:11-29`,
`packages/sales/src/payment-system/infrastructure/canonical-mirror.ts:497-519`).
No refund-specific `SalesHistory` transition is written.

Customer account activity is also unreliable for partial refunds: it sums all
positive and negative Sales Payments attached to the original transaction and
calls the event a refund only when the net is negative. A normal partial refund
usually remains “Payment received” (`apps/api/src/db/queries/customer.ts:249-292`).

### 9. Documents

After the local transaction commits, the resolver immediately marks invoice
and order-packing snapshots stale with reason `payment_refunded` and queues
replacement documents for one inferred order
(`apps/api/src/db/queries/wallet.ts:123-153`). Because this happens before any
provider completion lifecycle exists, documents can reflect a refund Square
rejected. If document expiry/warmup fails after the database commit, the
mutation returns an error after money state has already changed, inviting an
unsafe retry.

The print query loads legacy Sales Payments and linked transaction/Square
metadata (`packages/sales/src/print/query.ts:21-44`). The footer explicitly
filters out non-positive payment rows, so a refund is not presented as its own
payment-history line; it only sees the reopened stored amount due while still
summing the original positive principal as paid
(`packages/sales/src/print/compose/payment-footer-state.ts:186-206`). The
document contract recognizes `payment_refunded` only as a snapshot invalidation
reason, not as refund evidence (`packages/sales/src/pdf-system/contracts.ts:15-21`).

### 10. Jobs and reconciliation

No Square refund webhook route, `refund.created`/`refund.updated` consumer,
refund-status polling task, stuck-pending monitor, or provider reconciliation
job exists under `apps/` or `packages/`.

The only refund-like Sales job is the Sales Order adjustment application, and
it deliberately creates Wallet Credit: it writes a negative Sales Payment plus
a wallet credit and stores both compatibility ids on the adjustment
(`packages/jobs/src/tasks/sales/apply-sales-order-adjustment.ts:459-523`). This
is a useful, explicit separation from Square Refund and should not be reused as
provider-refund execution. Its schema has durable adjustment lifecycle,
idempotency, snapshots, actors, result references, and failure fields that the
current Square refund model lacks
(`packages/db/src/schema/sales.adjustment.prisma:29-71`).

The daily payment report reports negative Sales Payments as refunds, but it is
reporting only; it does not reconcile provider truth
(`packages/sales/src/payment-system/reports/sales-daily-payment-report.ts:229-250`).

## Concrete correctness gaps

### Provider truth and transactional safety

- **False local completion:** Square rejection is swallowed and ignored; the
  negative Sales Payment, wallet/generic transaction, due change, resolved case,
  notification, and documents can all say complete.
- **Provider success/local rollback split:** the Square network call runs inside
  a Prisma database transaction. If Square succeeds and a later local write
  fails, the database rolls back but the remote refund does not
  (`apps/api/src/db/queries/wallet.ts:24-123`).
- **Pre-commit side effect:** the notification task is triggered before the
  Square call and before database commit, so a rolled-back transaction can
  still produce a “Payment refunded” activity.
- **Post-commit error ambiguity:** document work runs after commit and may make
  the endpoint fail after local completion, encouraging duplicate retries.
- **No completion evidence:** provider refund id/status/amount/currency/reason,
  request id, raw safe response, status timestamps, and failure diagnostics are
  not persisted.

### Idempotency and concurrency

- Every provider attempt uses a new UUID and no business idempotency key is
  accepted or stored (`packages/square/src/index.ts:116-124`).
- Every compatibility mirror entry/allocation also gets a new random id
  (`packages/sales/src/payment-system/infrastructure/canonical-mirror.ts:67-69`,
  `packages/sales/src/payment-system/infrastructure/canonical-mirror.ts:278-339`).
- `SquareRefunds.paymentId` is unique, while one Square payment must support
  several partial refunds. Worse, the helper stores the original provider
  payment id in this unique field and does not store the returned refund id
  (`packages/db/src/schema/sales.wallet.prisma:127-141`,
  `packages/square/src/index.ts:125-134`).
- On a retry, Square is called with a new idempotency key before the duplicate
  `SquareRefunds.paymentId` insert. A second provider refund can therefore occur
  before the local uniqueness error is caught and ignored.
- There is no pending-value reservation, atomic remaining-refundable claim, or
  lock to prevent overlapping requests.
- General legacy payment deletion has no refund guard and hard-deletes any
  Sales Payment by id, so the negative row that represents a completed refund
  is not immutable (`packages/sales/src/payment-system/application/delete-legacy-sales-payment.ts:9-37`).

### Eligibility and untrusted input

- The base schema accepts caller-chosen transaction id, refund method, payment
  method, refund mode, reason, optional arbitrary Square id, and any numeric
  refund amount. It has no positivity, cents precision, upper-bound,
  completed-payment, remaining-refundable, currency, or relationship rule
  (`packages/sales/src/schema.ts:573-583`).
- The Finance wrapper adds only positive amount and note-length checks
  (`apps/api/src/schemas/sales-finance.ts:130-146`). It still does not validate
  amount against server-derived remaining refundable value or bind the Square
  id to the selected transaction.
- The weaker authenticated `sales.resolvePayment` route uses the base schema
  directly. A caller can submit an arbitrary provider payment id unrelated to
  the local transaction.
- There is no server check for Square payment `COMPLETED`, method eligibility,
  cancellation/adjustment authorization, return/exchange exclusion, or a
  reference to the commercial action authorizing the refund.

### Allocation and accounting

- One receipt can fund multiple orders: both checkout and staff payment paths
  intentionally reuse one `CustomerTransaction` while looping over orders
  (`packages/sales/src/payment-system/application/apply-legacy-sales-checkout-settlement.ts:41-69`,
  `apps/api/src/db/queries/sales-payment-processor.ts:376-405`).
- Refund resolution nevertheless chooses an unordered first Sales Payment and
  assigns 100% of the refund to its order
  (`apps/api/src/db/queries/wallet.ts:43-74`). It does not accept allocations or
  prove allocation sum equals refund amount.
- Sales Overview's transaction read scopes nested applications to the viewed
  order, but the subsequent resolver reloads all applications and may select a
  different first order, so the order shown to the employee is not a safe
  allocation instruction (`apps/api/src/db/queries/sales-transactions.ts:112-152`,
  `apps/api/src/db/queries/wallet.ts:43-61`).
- Only the inferred order balance, resolution, notification, and documents are
  updated; all other funded orders are untouched.
- Finance's refund totals use the unwritten historical `Refunds` graph while
  balances/daily reports use negative Sales Payments. The compatibility mirror
  further writes both a negative order refund ledger entry and a second positive
  wallet/generic refund ledger entry, leaving multiple incompatible
  representations of one action.

### C.C.C and tip

ADR-011 makes actual C.C.C a payment/checkout/ledger fact, not order principal
(`.brain/decisions/ADR-011-derived-ccc-payment-channel-charge.md:14-25`). Current
Resolution Center amount is calculated from Sales Payment applications (order
principal), not the customer charge; it then uses that as the full refund
(`apps/api/src/db/queries/sales-transactions.ts:156-163`,
`apps/dashboard/src/components/resolution-center/resolution-dialog.tsx:77-89`).
There is no field or validation for refunded principal, C.C.C, tip, or retained
Square fee, and no explicit authorization evidence for including C.C.C/tip.
`SquarePayments` stores amount and tip separately, but the resolver does not
read either (`packages/db/src/schema/sales.wallet.prisma:100-121`).

### Surfaces, audit, and communication

- There is no dedicated `can.editRefundSquare` authorization boundary.
- Finance cannot invoke Square at all; the legacy Resolution Center can invoke
  the adapter but supplies incompatible ids and premature completion semantics.
- Sales Overview has no in-context review/confirmation experience and only
  links to the separate Resolution Center.
- No customer completion email exists. Only the sales representative receives
  the premature internal notification; Finance/initiator failure and aged
  pending notifications do not exist.
- No provider transitions are written to Sales Activity. Existing evidence is
  fragmented across Customer Transaction history, Sales Resolution by name,
  generic notification activity, negative Sales Payments, and optional mirror
  rows.
- Completed refunds are neither a dedicated immutable record nor protected from
  general payment deletion.

## Test coverage assessment

Existing tests validate pieces adjacent to refunds, not the workflow:

- Square tests cover environment and Terminal helpers, not refund creation,
  provider response handling, or idempotency
  (`packages/square/test/index.test.ts:1-104`).
- Payment projection tests cover a pure `refundedAmount` input, not the current
  negative-Sales-Payment writer or provider lifecycle
  (`packages/sales/src/payment-system/domain/order-payment-projection.test.ts:34-49`).
- Finance projection tests synthesize a `RefundTransactions -> Refunds` row,
  which the active resolver never creates
  (`packages/sales/src/payment-system/finance/projection.test.ts:140-160`).
- Finance schema tests prove only a positive wallet refund amount and a
  ten-character note (`apps/api/src/schemas/sales-finance-resolution.test.ts:34-61`).
- Permission boundary tests assert `editOrderPayment` on Finance corrections;
  they do not cover `sales.resolvePayment` or a Square-specific capability
  (`apps/api/src/trpc/routers/permission-boundaries.test.ts:236-246`).

No tests were found for `squareCreateRefund`, `resolvePayment` refund behavior,
provider failure, pending/completed transitions, duplicate retry, partial
refund accumulation, concurrent reservation, multi-order allocation, external
Square refund ingestion, C.C.C/tip refund composition, customer completion
email, document timing, or completed-refund immutability.

## Canonical versus compatibility conclusion

| Concern | Intended/current authority | Classification for Square Refund work |
| --- | --- | --- |
| Square API client | `packages/square` | Reusable provider client; current refund helper is incomplete low-level compatibility code. |
| Payment write orchestration | `packages/sales/src/payment-system/application` | Intended canonical package boundary, but all active refund services are explicitly legacy compatibility services. |
| Operational payment rows | `CustomerTransaction`, `SalesPayments`, `SquarePayments` | Current legacy source used by live flows; must remain compatibility projections during cutover. |
| Refund attempt/provider lifecycle | `SquareRefunds` today | Not authoritative; insufficient schema and incorrectly populated identity. |
| Canonical ledger/allocation/projection | `PaymentLedgerEntry`, `PaymentAllocation`, `PaymentProjection` | Future foundation and dual-write mirror only; not current read/write authority. |
| Finance read projection | `@gnd/sales/payment-system/finance` over legacy graph | Canonical presentation logic, but current refund input relation is disconnected from the active writer. |
| Stored Sales Order due | `SalesOrders.amountDue` recalculated from legacy Sales Payments | Live compatibility projection; changes prematurely today. |
| Resolution | shared resolution package plus `SalesResolution`/mirror | Diagnostic compatibility evidence, not a provider-refund state machine. |
| Wallet Credit for approved adjustments | adjustment job + wallet transaction + negative Sales Payment | Separate, intentional Wallet Credit path; not a Square Refund. |
| Documents | shared Sales PDF snapshot lifecycle | Canonical document mechanism, currently invoked at the wrong refund transition and only for one inferred order. |
| Notifications | shared payment notification event/adapter | Reusable delivery mechanism, but event shape/timing/recipients do not satisfy a Square-refund lifecycle. |

The new feature should therefore establish one canonical refund aggregate and
command boundary that owns provider identity, idempotency, state transitions,
reserved/confirmed amounts, explicit order allocations, actor/commercial
evidence, and external-event reconciliation. Legacy Sales Payments,
`SalesOrders.amountDue`, Finance projections, notifications, activity, and
documents should become completion-time projections of that authority rather
than evidence that initiates or defines provider success.
