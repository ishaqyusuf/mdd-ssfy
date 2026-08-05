# Sales Form System Hardening

## Current behavior (2026-08-03)

- Shared sales-form state disables debounced autosave by default for newly
  created and hydrated records. Forms start in deliberate manual-save mode;
  the editor toggle still lets a user enable autosave for the current form
  session.
- Autosave timer cleanup is limited to cancelling pending work. Component
  rerenders and unmount cleanup do not invoke another save, so saving-state
  updates cannot recursively create a save storm.
- Debounced work reads the latest payload through a ref and keeps one semantic
  timer per payload. Manual saves that arrive during an active autosave retain
  their manual-save reason when queued.
- Queued create-form saves are rebased onto the first successful order id,
  slug, and version. The initial `new-*` version is also persisted as a draft
  key so a repeated stale new-draft autosave reuses the same office order.
- Save completion only clears dirty state when the completed payload is still
  current; a newer edit remains dirty and gets its own debounce cycle.
- Profile repricing treats zero base-price placeholders as missing pricing
  authority. Configured workflow components and grouped door, shelf, and
  moulding rows fall back to their current sales price ratio instead of
  collapsing invoice summaries to zero.
- P.O. metadata is projected to both the legacy root field and an existing
  nested new-form document. Legacy saves preserve the nested document instead
  of replacing unknown metadata, and both editors hydrate the same canonical
  P.O. value.
- Dirty form payloads are persisted to versioned local-recovery storage on
  change and page-leave. Risky navigation warns when autosave is disabled,
  stale, or errored.
- Legacy pricing writeback always persists `metaData.pricing`, even when the
  optional Labor extra-cost row is absent. Derived Labor is written to that
  row only when present.
- Legacy summary surfaces render `metaData.pricing.subTotal` directly.
- Legacy service pricing treats missing row metadata as a non-taxable service
  instead of throwing during subtotal/tax recomputation. Labor, FlatLabor, and
  card-channel charges remain composed in the final total and are covered by a
  focused regression matrix.
- Current grouped-service costing derives taxable subtotal from each service
  row. Explicit row tax flags override stale parent booleans, while omitted row
  flags fall back to the grouped parent taxability; one taxable sibling no
  longer taxes the entire grouped service line.
- Legacy shelf-item DTOs project normalized numeric prices into both `order`
  and `_rawData`, so Prisma `Decimal` values never cross the Server
  Component-to-Client Component boundary.
- Shelf combobox content nodes use stable object refs, and the shelf costing
  helper is memoized per item step. Shelf product effects can update costing
  without creating a render feedback loop.
- Edit routes can resolve an active order or quote by canonical slug or visible
  document number. Slug lookup runs first, while the order-number fallback
  preserves legacy bookmarks and cross-surface redirects such as
  `/sales-form/edit-order/09158PC`.
- New-form invoice additional costs now mirror the legacy Add Cost interaction.
  The dropdown offers Discount, Delivery, Flat Labor Cost, and Custom; choosing
  an option immediately creates a zero-value line whose label and dollar amount
  remain editable. Each line also exposes a delete action and writes through the
  canonical extra-cost state so pricing recalculates as the values change.
- The invoice summary rail now fixes its desktop flex child to the rail width,
  prevents horizontal content escape, and keeps its 420px desktop allocation.
  On smaller screens the summary sheet begins below the shared dashboard header,
  leaving its title and close control visible.
- Global invoice details and invoice-wide pricing now use a shared flat-section
  header with concise helper text, consistent spacing, and bottom dividers.
  Pricing rows use subtle separators, while the additional-cost rows remain an
  inline subsection without a nested card, tinted panel, or shadow. Form
  controls keep their standard outlined treatment for clear affordance.
- Door size selection uses an all-caps title, a single non-wrapping Door
  Supplier label beside the supplier dropdown, and no duplicate selected-
  supplier caption. Door LH/RH/Qty, HPT size rows, moulding rows, and service
  rows share one segmented minus/value/plus quantity control with explicit
  bounds and accessible action labels. The desktop door-size table also keeps
  its Size header and values on one line, allowing the table scroller to absorb
  longer dimensions instead of wrapping them inside the column.
- Component search/action bars now use the component picker itself as their
  boundary. They float above the editor footer while a long component list is
  active, anchor at the end of that list, and disappear when the picker leaves
  the scroll viewport instead of escaping into the next section.
- Invoice payment dates match legacy form ownership. Invoice Date remains
  visible but is read-only in both order and quote editors. Orders expose Net,
  Due, and Production Due; legacy values such as `Net30` normalize to `Net 30`,
  a selected automatic term recalculates and disables Due, and `None` leaves
  Due editable. Quotes omit Net, Due, and Production Due and expose Good Until.
- Expanded customer summaries expose Billing Address and Shipping Address as
  full-width keyboard-accessible edit targets with right-aligned Edit text,
  pointer cursors, and subtle hover feedback. Address-only saves reconcile a
  newly created address back into the current sale. When both selected address
  ids exist and differ, Shipping also exposes a confirmation-gated `Same as
  billing` action that changes only the sale's shipping selection and preserves
  the saved shipping-address record.

## Validation

- Authenticated browser regression on order `08869PC` and quote `03329LRG`
  saved P.O. changes from both new and legacy forms, reloaded both editors,
  and found no maximum-update-depth overlay. The final capture produced one
  save payload instead of the prior same-millisecond save storm.
- Shared state/recovery tests: 14 tests / 57 assertions.
- Legacy costing and subtotal tests: 13 tests / 50 assertions.
- Current grouped-service tax/costing, normalization, workflow, and state tests:
  82 tests / 315 assertions in the focused parity slice.
- API sales-form transaction/parity tests: 29 tests / 237 assertions, plus 3
  bounded post-save tests / 8 assertions.
- Shelf Decimal projection, render-stability, and print-data regression slice:
  14 tests / 86 assertions.
- Authenticated legacy shelf order `00003DPP` loads its `$380.38` shelf line
  and opens the browser print dialog; a fresh reload-and-print run recorded
  zero new console errors.
- Remaining release gate: authenticated browser proof for autosave, recovery,
  leave warning, and full pricing permutations against a real database.
- 2026-07-31 focused duplicate-draft, queued-payload, dirty-preservation, and
  zero-base repricing coverage passes 47 tests. Pre-fix authenticated browser
  reproduction completed; the shared local Next server became unresponsive
  before the post-fix replay and was left untouched.
- 2026-08-03 production-backed loader replay changed order `09158PC` from
  `Sales form not found` to `PASS:09158PC:order-09158pc`. The focused
  new-sales-form API file passes 24 tests / 166 assertions, and the API
  typecheck passes.
- 2026-08-04 authenticated create-order browser QA submitted a `$5.00` global
  add-on and confirmed the invoice summary updated to `+$5.00` with recalculated
  CCC and grand total. Focused normalization tests pass 2 tests / 4 assertions,
  and the Sales package typecheck passes.
- 2026-08-05 authenticated create-order browser QA confirmed the invoice summary
  child stays within its rail with zero document overflow at 1476px, the 1280px
  desktop breakpoint, and 390x844 mobile. The mobile title and close control are
  visible below the dashboard header. The focused layout regression, Sales
  typecheck, scoped Biome check, and whitespace check pass.
- 2026-08-05 authenticated create-order browser QA confirmed the flat invoice
  details, pricing rows, global add-on subsection, helper copy, and section
  dividers at desktop and 390x844 mobile with zero document overflow and zero
  console errors. Five focused tests / 17 assertions, Sales typecheck, scoped
  Biome, and whitespace validation pass.
- 2026-08-05 authenticated create-order browser QA selected Delivery from Add
  Cost, renamed it to `Freight & Handling`, entered `$125.50`, and confirmed the
  live add-on, tax, CCC, and grand totals updated to `$125.50`, `$8.79`, `$4.03`,
  and `$138.32`. Deleting the line restored the empty state and zero add-on
  total. The focused additional-cost and normalization slice passes 19 tests /
  82 assertions, and the Sales typecheck and scoped formatting checks pass.
- 2026-08-05 authenticated browser QA confirmed the all-caps door-size title,
  single-line supplier selector, service and moulding quantity steppers, and the
  long-list component search bar fixed above footer actions before anchoring at
  the list boundary. Order `Net 30` persisted, calculated Sep 4 from an Aug 5
  order date, and disabled Due; quote mode exposed only Good Until. Focused
  quantity, toolbar, customer-default, payment-term, metadata, summary, and HPT
  regressions plus the Sales typecheck pass.
- 2026-08-05 authenticated create-order browser QA expanded customer `2302`,
  confirmed both address rows expose full-width Edit targets with a computed
  pointer cursor, and opened the populated Billing Address editor for resolved
  address `4279`. Shipping correctly opened a new Shipping Address form because
  this fixture has no separate shipping record. Twelve focused tests / 36
  assertions, the Sales typecheck, scoped Biome, and whitespace checks pass;
  the Dashboard typecheck remains on its existing broad baseline diagnostics
  with no touched-file diagnostic in a focused compile.

See [`../sales-form-system-hardening-plan.md`](../sales-form-system-hardening-plan.md)
for phase ownership and rollout requirements.
