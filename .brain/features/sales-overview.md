# Sales Overview

## Purpose

Sales Overview is the canonical order/quote detail surface opened from the
Sales Orders workspace and related operational tables.

## Canonical Surface

- Workspace route: `/sales-book/orders`
- Detail surface: `components/sheets/sales-overview-sheet`
- URL identity: `sales-overview-id`
- URL type: `sales-type=order|quote`
- URL mode: `sales|quote|sales-production|production-tasks|dispatch-modal`
- URL tab: `salesTab`

There is no separate Sales Overview page or replacement detail surface. The
canonical Sales Overview opts into the shared Custom Sheet V2 component; that
component version does not create a second Sales Overview route or workflow.

## Open Contract

All new callers should use:

- `useSalesOverviewOpen()` for client actions
- `buildSalesOverviewUrl()` for links
- `useSalesOverviewQuery()` inside the canonical sheet

Callers must pass stable sale identity and explicit mode/tab intent when
opening production, dispatch, packing, or inventory workflows.

## Runtime Behavior

- The canonical orders list stays mounted behind the sheet.
- Ordinary order saves from both sales editors now continue to the canonical
  `/sales-book/orders` workspace with the saved order's Sales Overview open on
  `salesTab=inventory`. The former form-owned Configure Inventory dialog was
  removed, and order-table Inventory actions use the same URL-driven overview
  tab. Recognized legacy inventory statuses still queue their adaptation task
  instead of opening the ordinary Inventory continuation.
- The order-only Inventory tab has no `New` badge; it remains available with
  its existing inventory workflow unchanged.
- General tab content uses the sheet's horizontal gutter rather than adding a
  second one; its vertical section spacing remains unchanged.
- Order and quote P.O. edits use a serialized, debounced save path with visible
  `Saving`, `Saved`, and `Failed` states. A successful edit refreshes the
  active overview and the correctly typed order or quote list.
- P.O. reads support both legacy root metadata and nested new-form metadata;
  writes synchronize both shapes when the nested document exists. New-form
  persistence also retains the nested compatibility form, preserves the current
  P.O. when a save omits the field, and clears both shapes only for an explicit
  blank value.
- Billing and shipping cards each expose their own permission-gated address
  action for orders and quotes. The action opens the shared customer sheet in
  address-only mode, and successful saves refresh the mounted overview and
  list projections through `customer.changed`.
- A billing address displayed as the shipping fallback is not reused as the
  editable shipping row; the shipping action creates a distinct address.
- Address panes prefill assigned address data, use `Save`, close after the
  awaited `customer.changed` refresh, and immediately show the new projection.
  Recipient names are address-specific, and shipping creation hydrates from the
  billing address id assigned to the mounted sale.
  Fulfilled lifecycle status removes billing and shipping actions while keeping
  a general-only customer editor; the API independently rejects address writes.
- Only the active tab content renders; inactive production, dispatch,
  transaction, inventory, and activity providers do not mount.
- Explicit dispatch mode is honored for users with broader order access.
- Assigned production users remain constrained to the production view.
- Production reads are pure by default.
- Production mutations may opt into derived-state persistence explicitly.

## General Tab V1/V2 Rollout (2026-08-21)

- The canonical sheet may temporarily select between two General renderers;
  this does not create another Sales Overview route, sheet, provider, tab
  registry, or open contract.
- Sales Settings owns `officeDefault: v1 | v2` and
  `superAdminPreview: inherit | v1 | v2`.
- Missing or invalid policy preserves V1 for the office and resolves V2 for an
  active Super Admin pilot. `inherit` makes Super Admin use the office default.
- Only Super Admin manages the policy. Ordinary overview callers receive only
  their resolved General version.
- V1 preserves the current General behavior. V2 implements the approved Split
  Command Center with bounded customer, order, financial, operations, and
  delivery sections, a dedicated skeleton, direct P.O. editing, address reveal,
  and the canonical delivery/customer/payment actions.
- V2 loads conditionally and other tabs remain on their existing implementations
  until separately migrated.
- V2 consumes the canonical overview DTO through a conditional server-side
  projection rather than a second client request. The
  2026-08-21 local baseline measured 24–25 database queries, 6.4–7.2 KB
  serialized payloads, and 14.5–15.3 ms warm median query time across orders
  `09388PC` and `09397LM`. The accepted V2 projection reduced this to 14–15
  queries, 5.4–5.5 KB, and 8.7–10.0 ms warm medians while retaining customer,
  addresses, sales rep, P.O., payment/provider evidence, Special Order,
  statuses, inventory ownership, and document readiness. It excludes
  Product/configuration, Sales Profile, delivery-item counts, and legacy control
  enrichment that General V2 does not render.
- The rollout gateway and V1 must be retired after V2 office acceptance and its
  rollback window.

## Multi-Pane Sheet Contract

- Sales Overview is the first and only consumer of
  `@gnd/ui/custom/sheet-v2`. Existing custom-sheet consumers remain on the
  legacy `@gnd/ui/custom/sheet` contract until they are deliberately migrated.
- V2 keeps the shadcn/Radix dialog chassis and applies the Midday sheet frame:
  a 520px default token, explicit pane-width tokens, a 16px desktop outer
  gutter, 24px desktop surface padding, a bordered semantic `bg-background`
  surface, and a 10px desktop radius.
- Sales Overview uses an independent `3xl` primary and `2xl` secondary pane. On
  a wide viewport the shell is 48rem + 1px + 42rem; opening the secondary does
  not redistribute or shrink either pane.
- The panes have a dedicated vertical divider and unique sheet-derived portal
  targets. The primary action footer is anchored to a fixed bottom slot inside
  the primary pane instead of the outer dialog root, and remains visible beside
  an active secondary pane on wide layouts.
- If the complete natural-width pair, Midday frame, and viewport gutter do not
  fit, the active secondary replaces the primary at one-pane width and the
  divider disappears.
- Reveal uses 300ms motion and hide uses 200ms motion, with reduced-motion
  support. Secondary content remains mounted through its exit animation, then
  focus returns to the CTA that opened it.
- Outside dismissal is layered: one click closes the secondary, and a later
  click closes the primary. Primary dismissal waits through pointer-up so the
  closing click cannot activate an order row behind the overlay.

## API And Permissions

- `sales.getSaleOverview` requires authentication plus a relevant order,
  estimate, production, delivery, pickup, or packing capability.
- `sales.productionOverview` requires authentication plus an order,
  production, delivery, pickup, or packing capability.
- `sales.productionOverview` returns only the core production projection.
  Readiness loads independently after the order identity resolves, so readiness
  latency or failure cannot delay or blank production rows. The tab shows an
  Inventory-directed warning when readiness is unavailable; assignment safety
  remains enforced by the strict readiness endpoint and Trigger gate.
- Neither query performs hidden gate or assignment repair writes.

## Transactions And Square Refunds (2026-08-21)

- The Transactions tab uses one cents-based projection for received, completed
  refunds, pending reservations, net paid, and current amount due.
- The order-scoped tab presents that projection as one compact settlement strip
  plus a full-row receipt ledger rather than analytics cards or duplicated
  desktop/mobile renderers. Each payment keeps status, method, date, net amount,
  and refund state visible. Orders without activity render a centered empty
  state with a direct `Make payment` action.
- Selecting a payment opens its details in the native Sales Overview secondary
  pane, using `salesTransaction` URL state. The pane preserves the primary
  Transactions context on wide screens, replaces it at one-pane widths, and
  returns through the shared secondary-pane back control. `salesRefund` keeps
  the refund composer state addressable from that payment detail.
- General `Pay` and Transactions `Make payment` use the same navigable
  `salesPayment=new` secondary-pane state. The pane embeds the canonical Sales
  Payment Processor content; legacy callers that still require the short
  interruption flow retain its dialog wrapper. Successful payment application
  invalidates the exact order settlement and Sales Overview queries before the
  pane closes. The single shared processor renders one action composition in
  either the dialog shell or, through a portal target, the standard fixed
  secondary-sheet footer. Sheet content is width-constrained and its Add Order
  combobox can opt out of the shared trigger's full-width default. Closing the
  secondary pane clears only payment-create state and returns focus to its
  opening control.
- The fixed payment action row places a compact payment-date button group
  immediately before Payment Method. Its default icon-only state means the
  current New York business date. Opening it shows a titled calendar with
  future dates disabled; selecting a date replaces the icon with the formatted
  date and adds an adjacent clear button. Clearing returns to the today
  fallback. Width and conditional-method changes animate with reduced-motion
  support.
- Staff-selected past dates apply to manual office payments. Square terminal
  settlements and newly paid links retain their verified provider occurrence
  time instead of accepting staff date overrides.
- A verified refundable Square tender exposes the action only to
  `editRefundSquare`. The composer shows provider identity, original charge,
  prior/pending refunds, remaining capacity, principal/C.C.C./tip, eligible
  order allocations, reason/note, commercial-action evidence, and immutable
  confirmation.
- Completed refund activity remains visible with resulting order balance;
  pending and failed states remain explicit rather than being reported as paid
  back to the customer.

## Grouped Invoice Payment Summary (2026-08-21)

- General → Invoice Details receives an additive `paymentSummary` plus
  compatibility `costLines` from the Sales Overview DTO. Successful positive
  receipts are grouped by canonical method instead of repeating one block per
  payment.
- Each group shows principal once, exact recorded C.C.C. and tip when present,
  the resulting customer charge when it adds information, and a plain-number
  `… Payments Made` row only when the unique receipt count is greater than one.
- Receipt identity prefers transaction/provider identity and falls back to the
  Sales Payment id. Deleted, pending, failed, zero/negative, and refund
  compatibility rows do not contribute.
- A settled single-method order displays that recorded method; multiple method
  families display `Mixed — …`. Unpaid orders retain their selected payment
  method and estimated C.C.C. behavior.
- This is presentation-only. Transactions, refund timelines, Finance details,
  balances, and persisted payment records remain itemized and unchanged.

## General V2 Financial And Fulfillment Controls (2026-08-21)

- General V2 consumes an additive, cents-based `financialBreakdown` from the
  canonical overview DTO. Invoice subtotal, adjustments, taxes, total, paid,
  balance, normalized payment groups, and explicitly estimated pending card
  charges are semantic facts; React does not classify legacy display labels.
- Recorded card C.C.C., tips, total charged, and repeated-payment count remain
  distinct from an estimate on the unpaid remainder. Optional zero rows are
  omitted, while invoice totals and order balance remain structurally visible.
  Refunded orders reconcile gross method receipts through explicit Refunded and
  Net paid rows instead of presenting gross and net values as equivalent.
- Fulfillment signal is a compact, collapsible Special Order summary. Only the
  current approved revision is green and labeled `Signed`; governed pending,
  declined, or reapproval states are red and labeled `Not signed`; orders not
  governed by Special Order are neutral. Signature history and the protected
  signature asset load only after expansion. The expanded V2 disclosure owns
  the applicable Special Order actions directly instead of opening a nested
  management dialog. New enrollment uses an inline, reasonless
  Cancel/Continue confirmation; request, link-copy, reapproval, and removal
  actions continue to reuse the canonical permission and mutation controller.
- Order controls keep P.O. editing inline, use popovers for delivery option and
  sales-representative selection, and retain the password-confirmation dialog
  for representative transfers. Delivery uses date-only Fulfillment date
  semantics through the shared Shadcn Calendar rendered directly inside the
  Delivery popover, receives the current date from the lean overview
  projection, and exposes editing only to the same dispatch-manager permission
  set as its API. The compact Delivery row keeps its mode/date summary and puts
  the slanted `PencilEdit01Icon` affordance at the far right.
  Billing and shipping retain their direct line edit controls plus the compact
  customer edit menu. The representative picker uses keyboard-native Command
  list semantics.
- Operations intentionally contains only Production and Fulfillment. V1 and
  all non-General tabs remain behaviorally unchanged, including the V1 Special
  Order card presentation during the rollback window.

## Performance Priorities

1. Keep the orders workspace server-prefetched and virtualized.
2. Keep detail identity and tab state in the URL.
3. Load tab/domain data only when the tab is active.
4. Split the large General and Inventory implementations into bounded domain
   sections without creating another parallel surface.
5. Measure open latency and query count before adding new summary queries.

## Architecture Decision

See
[ADR-028](../decisions/ADR-028-canonical-sales-overview-workspace-and-sheet.md).
The temporary General renderer rollout is governed by
[ADR-060](../decisions/ADR-060-versioned-general-tab-rollout-inside-canonical-sales-overview.md).

## Validation (2026-07-24)

- Authenticated browser QA changed and reloaded P.O. values for order
  `08869PC` and quote `03329LRG`, observing the spinner/checkmark lifecycle and
  the matching list/detail refresh.
- Billing address saves completed from both order and quote overviews. The
  sheet contained address fields only and closed after the active overview
  refetched.
- Focused sales metadata, DTO, and customer-address action coverage passed 28
  tests / 52 assertions; the new-sales-form relational parity suite passed 22
  tests in the same validation run.

## Validation (2026-08-06)

- Authenticated in-app browser QA measured a 704px framed primary sheet and,
  with a secondary open, two unchanged 672px panes, a 1px divider, and a 1377px
  framed shell.
- Follow-up QA at a 1679px viewport verified the 672px primary footer remains
  visible while the 672px customer editor and its independent footer are open.
- Customer edit, billing address, shipping address, inbound creation, and
  inbound detail all passed the same geometry and reveal/close contract.
- 1200px, 1024px, 768px, and 390px viewport checks showed one active pane with
  a zero-width hidden sibling and no divider. Two-stage outside and Escape
  dismissal, click-through prevention, focus return, and the fixed primary
  footer were also verified.
- Focused coverage passes 20 tests / 74 assertions. `@gnd/ui` typecheck and
  targeted Biome pass. The broad Dashboard typecheck reaches its existing
  repository-wide baseline; no diagnostic identified a changed sheet file.
- The multi-pane implementation was subsequently isolated behind the explicit
  `@gnd/ui/custom/sheet-v2` export. The legacy sheet source was restored exactly
  so unrelated sheets do not inherit the new frame, width scale, animation, or
  dismissal behavior.

## Validation (2026-08-21 — payment secondary pane)

- Authenticated in-app browser QA on order `09388PC` confirmed that the
  existing `salesTransaction=payment:9158` URL state opens Payment `#11935` in
  the Sales Overview secondary pane, with the primary Transactions activity
  still present.
- Closing the pane clears payment/refund selection, and clicking Payment
  `#11935` recreates the selection and opens the same secondary detail pane.
- Refund composition now replaces payment detail inside the same secondary
  pane while `salesRefund=new`; Back or Cancel returns to payment detail without
  dismissing the Sales Overview.
- Activity matching includes singular `orderNo` in addition to `salesId`,
  `salesNo`, and plural `orderNos`, covering payment/refund notification tags.
- Payment, checkout, and refund handlers persist one activity independently of
  notification contacts, and payment/refund payloads carry all Sales Overview
  identities (`salesId`, `salesNo`, and `orderNo`).
- Authenticated QA on `09396PC` showed a valid synchronized `$4.00` allocation,
  a queued Square sandbox refund, and the `Square refund pending` audit entry.

## Validation (2026-08-21 — compact Transactions and payment creation)

- Authenticated in-app browser QA on paid order `09397LM` showed one settlement
  strip and two receipt rows with the exact `$182.22` and `$2,277.13` payments;
  the fully paid order disables new payment creation.
- Order `09337LRG` showed the actionable zero-transaction state and `$3,372.75`
  balance. Both the Transactions CTA and General `Pay` opened the canonical
  payment form in the secondary pane through `salesPayment=new`; closing it
  removed the URL parameter and restored focus. No payment was submitted.
- The focused Sales Overview and payment-processor suites pass 32 tests / 149
  assertions, and scoped Biome passes. The Dashboard-wide typecheck remains
  blocked by its existing repository backlog; a touched-path diagnostic found
  no error in the migrated Transactions, payment pane, URL hook, controller, or
  payment-processor files.
- Follow-up geometry QA measured the 672px secondary pane and its 624px scroll
  viewport with equal client/scroll widths and no overflowing descendant. The
  standard footer remained a separate 624px-wide bottom slot while the payment
  body retained independent vertical overflow.

## Validation (2026-08-21 — General V2 rollout and cutover)

- The versioned server loader keeps one `sales.getSaleOverview` contract and
  selects the compatibility projection for V1 or the measured General
  projection for V2.
- Read-only local comparison on orders `09397LM` and `09388PC` matched all 34
  fields consumed by General V2 between the full and narrow projections.
- A reversible local Settings-record exercise proved the persisted office
  policy, not an environment or source override: V2 rendered and survived
  reload, Transactions remained on its current implementation, and restoring
  the exact prior missing-policy state returned the browser to V1.
- Browser acceptance passed at 390×844 and 1280×720. Mobile uses one 356px
  content column with no document overflow and stacks the financial rail below
  order content; desktop uses the two-column command-center grid. The visible
  tab control receives initial focus, the mobile menu opens with Enter, desktop
  tabs use Radix roving focus and Arrow navigation while updating URL state,
  and the delivery dialog restores focus to the exact button that opened it.
- The focused acceptance suite passes 45 tests / 376 assertions across settings
  normalization, permissions, persistence, projection and loader selection,
  delivery persistence/focus, renderer isolation, keyboard entry, and financial
  presentation.
- The user approved office cutover. A genuine Super Admin saved Version 2 from
  `/settings/sales/overview`; reloading the settings page retained the choice
  with no pending draft, and persistence is now
  `{ officeDefault: "v2", superAdminPreview: "v2" }`.
- Orders `09397LM` and `09388PC` render V2, General survives reload, and
  `09388PC` Transactions remains on its current implementation. Browser logs
  contain no cutover application error.
- V2 is the office default. V1 remains temporarily available only for rollback
  during the observation window and is not retired by the cutover itself.
- Post-cutover parity on `09405PC` aligned the canonical V2 header and tabs with
  the approved Split Command Center: lifecycle, inbound, age, and priority live
  above the tabs; General exposes exactly Preview, Edit, and More in its primary
  command row; and Super Admin packing remains available inside More. The V2
  header intentionally preserves the established V1 tab-bar presentation
  rather than introducing a second tab visual contract.

- The V2 tab container has a full-width bottom rule and no negative overlap
  with the scroll surface. General owns 96px (`pb-24`) end clearance instead of
  inheriting the shared sheet default, allowing the customer/financial divider
  to reach the exact scroll-content end while the sticky action row meets the
  tab rule without overlap.
- Customer actions are consolidated under a permission-aware Edit menu for
  Customer, Shipping, and Billing. Addresses reveal sits at the right of the
  compact phone row; fulfilled-order address locking and customer-edit
  permission behavior remain unchanged.
- The Invoice heading owns the payment-method selector inline. The former
  repeated Payment Method label/value row is not rendered in General V2.
- The primary command-row rule meets the operations/financial divider with a
  measured 0px gap. Financial control uses a 280px desktop rail without a Card
  border or radius, while 390px stacks it without horizontal document overflow.
  Authenticated browser logs contained no application error; the only warning
  was the unrelated existing mini-logo aspect-ratio warning.

## Validation (2026-08-21 — shared edit glyph)

- The shared generic `Icons.Edit` and legacy `Icons.edit` aliases now both
  resolve to the slanted `PencilEdit01Icon`, so Sales Overview edit actions and
  every other generic dashboard edit consumer use one consistent glyph.
- Document-specific Draft, file-edit, and annotation glyphs remain distinct.
- The focused shared-icons suite passed 3 tests / 5 assertions. Authenticated
  browser QA on `09337LRG` confirmed the slanted pencil in the General action
  bar, Customer control, P.O. control, and Delivery control without saving or
  changing order data.

## Validation (2026-08-21 — Make Payment method control and hidden printing)

- The fixed payment action row keeps the compact date control immediately
  before one adaptive payment method control. Check becomes a grouped method
  trigger and check-number input; Terminal owns a nested availability-aware
  device menu and displays the chosen terminal name after selection.
- Payment method/device changes are committed together, the last available
  terminal is preferred safely, and mutation payloads exclude stale Check or
  Terminal-only fields when another method is submitted.
- Successful payments with a print selection remain on the same payment screen
  in `Preparing to print` until the hidden viewer reports readiness. No new tab
  is opened. Print failures preserve payment success and expose print-only retry
  and close actions.
- Focused payment/print validation passes 69 tests / 169 assertions. Focused
  TypeScript diagnostics pass for eight changed implementation files and
  `git diff --check` passes. No browser QA or payment submission was performed.
- No schema, migration, API contract, permission, or ADR changed; this adopts
  the existing hidden sales-print viewer and payment contracts.

## Validation (2026-08-25 — post-save Inventory continuation)

- Focused routing, save-continuation, inventory sync, grouped-line, and Sales
  Overview URL coverage passes 40 tests / 183 assertions.
- Authenticated development validation saved order `09433PC` and landed at
  `/sales-book/orders?sales-overview-id=09433PC&sales-type=order&mode=sales&salesTab=inventory`.
  Sales Overview opened with Inventory selected and no Configure Inventory
  dialog mounted.
