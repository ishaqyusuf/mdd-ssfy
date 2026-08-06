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
- Order and quote P.O. edits use a serialized, debounced save path with visible
  `Saving`, `Saved`, and `Failed` states. A successful edit refreshes the
  active overview and the correctly typed order or quote list.
- P.O. reads support both legacy root metadata and nested new-form metadata;
  writes synchronize both shapes when the nested document exists.
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

## Multi-Pane Sheet Contract

- Sales Overview is the first and only consumer of
  `@gnd/ui/custom/sheet-v2`. Existing custom-sheet consumers remain on the
  legacy `@gnd/ui/custom/sheet` contract until they are deliberately migrated.
- V2 keeps the shadcn/Radix dialog chassis and applies the Midday sheet frame:
  a 520px default token, explicit pane-width tokens, a 16px desktop outer
  gutter, 24px desktop surface padding, a bordered stone surface, and a 10px
  desktop radius.
- Sales Overview uses independent `2xl` primary and `2xl` secondary panes. On
  a wide viewport the shell is 42rem + 1px + 42rem; opening the secondary does
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
