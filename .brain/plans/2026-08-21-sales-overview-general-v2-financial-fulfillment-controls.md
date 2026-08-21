# Sales Overview General V2 — Financial, Fulfillment, and Inline Controls Plan

## Implementation Status

Completed locally on 2026-08-21. Focused validation passes 51 tests / 241
assertions across the financial domain/DTO/presentation, Special Order signal,
customer/address actions, view model, and General rollout boundary. No database
migration or Git operation was required.

Post-completion refinement on 2026-08-21 moved the applicable Special Order
commands directly into the expanded V2 Fulfillment signal. The enrollment path
uses a reasonless inline Cancel/Continue confirmation and the V1 card remains
unchanged. Its focused validation passed 22 tests / 135 assertions plus
authenticated browser checks on governed `09337LRG` and ungoverned `09405PC`;
no browser mutation, database change, or Git operation was performed.

A second post-completion refinement replaced the native Fulfillment date input
with the shared Shadcn Calendar/Popover pattern while preserving the existing
date-only mutation payload and explicit outer Save/Cancel flow. Focused
validation passed 10 tests / 93 assertions, scoped Biome passed, and
authenticated browser QA on `09337LRG` produced no date-control runtime error
or saved change. The dev log retained an unrelated existing missing
`@/components/login-v2` diagnostic from the public login route.

A third post-completion refinement renders the Calendar directly in the
Delivery popover rather than behind a second date-selector popover, removes the
helper subtitle, and moves the existing-library `Edit3`/
`PencilEdit01Icon` affordance to the far right of the compact Delivery row.
Save remains right-aligned and authoritative. Focused validation passes 10
tests / 99 assertions plus authenticated browser month-navigation, draft
selection, and cancellation checks without saving order data.

## Objective

Bring the office-default Sales Overview General V2 closer to the approved Split
Command Center design while preserving the canonical Sales Overview sheet,
actions, permissions, and V1 rollback path. The delivery should:

- render the invoice and card-settlement rail from typed, authoritative facts
  instead of display-label matching;
- present a minimal Fulfillment signal with an expandable Special Order signing
  state;
- make P.O., delivery, sales-representative, and address editing discoverable
  without turning the General tab into a form;
- reduce Operations to Production and Fulfillment; and
- keep initial General-tab loading bounded and avoid duplicating payment,
  Special Order, or fulfillment business rules in React.

## Assumptions

- The selected visual source is
  `.scratch/designs/sales-overview-general-20260821/variant-command.html`.
- V2 remains inside the canonical Sales Overview sheet and continues to use the
  existing overview query, tab contract, secondary pane, footer, and action bar.
- V1 remains behaviorally unchanged during the rollback window.
- `salesOrders`, the canonical invoice fields, the shared payment summary, and
  the Special Order approval records remain the sources of truth.
- “Fulfillment signal” means the compact section shown between Order details
  and Operations in the approved template. Its first signal is Special Order
  signing state.
- A governed Special Order is green only when the current revision is
  `CUSTOMER_APPROVED`. Other governed states render red as `Not signed`, while
  the expanded content retains the precise state such as pending, reapproval
  required, or declined. Orders not governed as Special Orders use a neutral
  `Not special order` state rather than a misleading red state.
- The sales-representative picker moves to a popover, but the existing password
  confirmation remains a modal interruption because it protects a sensitive
  transfer mutation.
- No database migration is expected. Any required overview contract addition is
  derived from already-loaded sales, payment, tax, extra-cost, and approval data.

## Detailed Execution Plan

### 1. Freeze the presentation and financial acceptance contract

1. Capture the selected prototype's hierarchy as the renderer contract:
   settlement headline, Invoice section, optional Card settlement section, and
   final balance treatment.
2. Define exact visibility and ordering rules before changing JSX:
   - Invoice: subtotal, non-zero adjustments/extra costs, taxes, total, paid
     toward the order, then one principal-payment row per normalized method.
   - Card settlement: recorded C.C.C., recorded tip when present, total charged,
     and payment count only when greater than one.
   - Pending card payment: show an explicitly estimated C.C.C./total-due state;
     never present an estimate as a recorded fee.
   - Quote: show quote charges and total only; omit paid, settlement, and payment
     actions.
   - Zero-value optional rows are omitted, but structural totals and the balance
     remain visible.
   - Refund event detail stays in Transactions. The rail consumes the canonical
     net paid/balance result and must not create a second refund ledger.
3. Add fixture expectations for unpaid, partially paid, fully paid, repeated
   card payments, mixed methods, tips, completed refunds, and quote states.

### 2. Replace label-regex classification with a typed financial composer

1. Add a pure shared composer under `packages/sales/src/payment-system/domain/`
   that returns semantic financial facts with stable keys and integer cents:
   - invoice subtotal, adjustments, taxes, total, principal paid, and balance;
   - normalized payment groups with method, principal, C.C.C., tip, total
     charged, and count; and
   - an optional pending-card estimate distinguished from recorded settlement.
2. Reuse `getSalesPaymentSummary` and the current invoice-repair utilities.
   Do not recompute payment truth from rendered `costLines`, and do not infer
   provider fees where evidence is absent.
3. Add the composed facts to the existing `sales.getSaleOverview` DTO as an
   additive V2-ready field. Keep `costLines` intact for V1 and other compatibility
   consumers during the rollout window.
4. Add an app-local pure composer beside General V2, for example
   `composeGeneralV2InvoiceSections`, that maps semantic facts to the approved
   visual sections and labels. This layer owns order, emphasis, and omission
   rules only; it cannot perform financial arithmetic.
5. Replace `cardSettlementPattern`, `sumLines`, and the current ad-hoc
   `invoiceLines`/`cardLines` split in `general/v2/view-model.ts` with the typed
   result. Keep React components as renderers of the composed view model.
6. Refactor `financial-rail.tsx` into small bounded renderers:
   - `SettlementHeadline`;
   - `InvoiceBreakdown`;
   - `CardSettlementBreakdown`; and
   - the existing conditional payment action.
7. Match the template precisely: the payment-method selector stays in the
   Invoice heading; no separate Payment Method line is reintroduced; total and
   balance receive the strongest hierarchy; repeated same-method payments are
   grouped once, with a count row only when count is greater than one.

### 3. Build the minimal Fulfillment signal and Special Order disclosure

1. Replace the large V2 use of `SpecialOrderOverviewCard` with a dedicated
   `FulfillmentSignalSection` and `SpecialOrderSignal` presentation. Do not alter
   V1's Special Order card.
2. Keep the collapsed row minimal:
   - label: `Special Order`;
   - green dot/badge plus `Signed` for the current approved revision;
   - red dot/badge plus `Not signed` for governed non-approved states;
   - neutral `Not special order` for non-governed orders; and
   - a chevron with an accessible expanded state.
3. On expansion, lazy-load the existing `specialOrder.history` query only when
   the order has been evaluated. Select the current, non-superseded evidence for
   the current approval revision and show:
   - precise approval state;
   - signed/acknowledged date;
   - signer/customer name; and
   - the signature from the existing protected evidence route, loaded only when
     expanded and only when `hasSignature` is true.
4. Preserve all existing Special Order capabilities. Extract the current
   mutations/controller state from the large card so enroll, request approval,
   copy link, reapproval, removal, and history remain reachable through compact
   actions in the expanded disclosure rather than duplicating mutation logic.
5. Render explicit empty and failure states: signature pending, missing signer
   name, signed evidence without an available signature asset, history loading,
   and history-query failure.
6. Use text/icon semantics in addition to red/green so color is never the only
   status indicator.

### 4. Make Order-detail edits compact and discoverable

1. P.O. number:
   - add an opt-in compact variant to `SalesPO` rather than changing every
     existing consumer;
   - render a small pencil icon button at the right of the value;
   - clicking it focuses/opens the current inline editor;
   - preserve the existing debounced save, saving/saved/failed feedback,
     uppercase behavior, permission behavior, and mutation contract.
2. Delivery option:
   - rename `DeliveryOptionDialog` to `DeliveryOptionPopover`;
   - keep the inline `Pickup/Delivery · date` trigger from the template;
   - use shadcn `Popover`, `Field`, `FieldGroup`, `FieldLabel`, `ToggleGroup`,
     `Input`, `Button`, and `Spinner` primitives;
   - rename every `Service date` user-facing label/helper to `Fulfillment date`;
   - use the standard shadcn `Input type="date"` inside the field contract;
   - preserve date-only semantics with explicit conversion helpers so browser
     timezone differences do not move the saved day;
   - reset draft state on close, retain explicit Save/Cancel, close only after a
     successful mutation, and invalidate only delivery info plus sale overview.
3. Sales representative:
   - refactor `SalesRepTransferControl` so `Change rep` opens a shadcn Popover
     instead of expanding a bordered block in Order details;
   - keep the sales-rep query disabled until the popover opens and retain the
     five-minute stale window;
   - preserve search, current/selected markers, optional reason, permission
     gating, and explicit Transfer action;
   - after Transfer, open the existing password-confirmation Dialog, then close
     and reset both layers only after success;
   - return focus to the trigger on cancel/success and keep mutation errors in
     context without losing the selected representative.

### 5. Simplify Operations to the requested two signals

1. Rename the V2 view-model property and component prop from `shipping` to
   `fulfillment` while continuing to derive it from the canonical dispatch/
   delivery status and completion percentage.
2. Remove Payment from `OperationsSection`; payment remains exclusively in the
   Financial control rail.
3. Render a two-column Production/Fulfillment layout on supported widths and a
   one-column stack on narrow widths.
4. Rename every Operations label and accessible progress label from Shipping to
   Fulfillment. Do not rename database fields or shared dispatch domain terms
   merely for presentation parity.

### 6. Restore per-line address edit controls without removing the top menu

1. Keep the Customer heading's `Edit` dropdown with Customer, Shipping, and
   Billing entries.
2. Restore a pencil icon action at the right edge of each expanded Billing and
   Shipping address line.
3. Reuse `SalesAddressEditButton` and add an opt-in `iconOnly`/compact variant if
   necessary; do not create another address mutation or pane-opening path.
4. Preserve `editSalesCustomers`, dealer-sale, missing-customer, and fulfilled-
   order locking. Each icon needs a tooltip/title and an address-specific
   accessible label.

### 7. Loading, performance, and failure boundaries

1. Keep General V2 on the existing single overview request and narrow V2 server
   projection. The typed financial summary must be composed from data already
   loaded by that projection.
2. Fetch Special Order evidence only on disclosure expansion. Do not add approval
   history or signature payloads to the initial overview response.
3. Keep delivery and sales-rep option queries interaction-driven and cache them
   through the existing TanStack/tRPC contracts.
4. Update `GeneralTabV2Skeleton` only where the new static section geometry
   changes; do not skeletonize popovers that are closed on first render.
5. Keep mutations local to focused client controls and invalidate exact query
   keys, following the Midday feature flow.

### 8. Validation and acceptance

1. Shared composer tests:
   - cents-safe totals and stable semantic keys;
   - same-method grouping and count omission at one;
   - mixed payments, C.C.C., tips, pending estimate, quote, and refund-aware net
     states;
   - no unproven C.C.C. inference and no duplicated totals.
2. API/DTO tests:
   - typed financial facts match the existing canonical invoice/payment fixture;
   - V1 compatibility fields remain unchanged;
   - General V2 narrow-loader parity includes the new additive field.
3. General V2 tests:
   - exact Invoice/Card settlement row order and omission rules;
   - signed, not-signed, declined, reapproval, neutral, and missing-signature
     Special Order states;
   - Operations contains only Production and Fulfillment;
   - address line buttons and heading dropdown open the same secondary pane;
   - P.O. pencil, delivery popover, and rep popover focus/state behavior.
4. Run targeted formatter/lint/type checks for touched packages and apps, then
   the narrowest relevant Bun test commands. Run broad `bun run typecheck` only
   after focused tests, reporting unrelated baseline failures separately.
5. Authenticated browser acceptance in local dev:
   - `09405PC` for layout, P.O., address buttons, popovers, and responsive rail;
   - representative unpaid/partial/settled/multi-card/mixed/refunded orders;
   - signed and unsigned Special Orders;
   - desktop 3xl primary pane, narrow replacement-pane mode, keyboard-only
     interaction, no horizontal overflow, and no new browser errors.
6. Re-measure the V2 overview query count, payload size, and warm latency to
   confirm the typed composer did not undo the accepted narrow projection.
7. After implementation, update `.brain/features/sales-overview.md`,
   `.brain/api/contracts.md` for the additive financial contract, and
   `.brain/progress.md`. Update ADR-060 only if the canonical V2 rollout boundary
   changes; no new ADR or database documentation is expected for this slice.

## Skills List Used

- `plan`: structured the work into an implementation-ready, phased plan with
  assumptions, validation, and risks.
- `midday`: kept data ownership, focused client controls, exact query
  invalidation, lazy interaction queries, and bounded component composition in
  the existing Midday-style layer boundaries.
- `shadcn`: selected the installed Radix/shadcn Popover, Field, ToggleGroup,
  Input, Button, and focus-management patterns for delivery and sales-rep
  controls.

## Risks and Mitigations

- **Financial drift from two calculation paths:** make the shared typed composer
  the only new arithmetic boundary; the V2 presentation composer may only order
  and hide facts.
- **Compatibility regression in V1/PDF/other sales surfaces:** add the new DTO
  field additively, retain `costLines`, and gate renderer changes to General V2.
- **Gross payment rows disagree with a refunded invoice:** validate completed
  refund fixtures and consume canonical net-paid/balance facts rather than
  subtracting refunds in React.
- **Special Order simplification removes critical actions:** separate controller
  logic from presentation and prove every existing governed action remains
  reachable before deleting the large V2 card use.
- **Signature data becomes heavy or exposed:** query history only on expansion,
  keep the protected evidence route, and never place signature URLs in the base
  overview payload.
- **Red/green status is inaccessible:** always pair color with `Signed`,
  `Not signed`, or a neutral text state and expose expansion semantics.
- **Popover focus or layered-dialog bugs:** use Radix focus restoration, keep one
  trigger owner, reset drafts on close, and test keyboard escape/tab/return
  behavior plus the rep password dialog transition.
- **Fulfillment-date timezone drift:** treat it as a date-only value, centralize
  parsing/serialization, and cover non-UTC timezone fixtures.
- **Duplicate address edit implementations:** reuse the existing address edit
  button and secondary-pane callback with an opt-in compact visual variant.
- **Scope bloat:** do not migrate other tabs, rewrite dispatch terminology,
  change the database schema, or retire V1 in this slice.
