# Sales Form System Hardening

## Current behavior (2026-08-12)

- Quote-to-invoice conversion uses a copy-specific source projection instead
  of loading the complete Sales graph. Conversion serializes on the source row,
  records the source identity in target metadata, and returns the existing
  target on retry or concurrent submission. Inventory synchronization and
  activity-note follow-up use the Vercel request's post-response lifecycle, so
  their durable dispatch/recording no longer delays the committed copy result.
  Dashboard status reset and query refresh start together and do not delay the
  success confirmation. Authenticated local browser proof on a new 4-item,
  9-door conversion measured the copy API at 127ms and click-to-confirmation at
  521ms, down from 1.53s and 2.12s respectively on the prior path.

- New internal dashboard orders and quotes use the legacy sales identity for
  both `orderId` and `slug`. A generated quote such as `03464PC` now persists
  `slug: "03464PC"` instead of `slug: "quote-03464pc"`; orders follow the same
  rule. Existing type-prefixed records are not rewritten and remain editable
  through the canonical-slug-first loader and visible-number fallback.
  Storefront checkout and inquiry documents retain their type-prefixed slug
  namespace, and dealer-portal documents retain their DPP identity contract.

- The shared new-sales-form item card now exposes `Make Copy` and `Move To`
  from its overflow menu on both the internal dashboard and dealership
  composer. Copy inserts a deep-cloned item immediately after its source,
  generates fresh client and grouped-row identities, clears owned persistence
  ids, makes the copy active, and lets the normal save path create independent
  line, step, shelf, House Package Tool, door, moulding, and service records.
  Move To preserves legacy behavior by swapping the selected item with the
  requested numbered position without changing either item's stable uid.
  Summaries are recomputed and the form is marked dirty after either action.

- Reopened sales lines refresh persisted Door component snapshots from the
  current workflow component catalogue when the same component is still
  available. Each HPT item resolves Door visibility against its own workflow
  selections, and Add Size ignores historical one-size variation snapshots in
  favor of the current route or catalogue size list. Its dropdown shows the
  same current door price as the size-selection modal, displays `Price
  unavailable` without inventing a zero price when configuration is missing,
  and uses the same resolver when creating the row. Archived or otherwise
  unavailable doors continue to use their persisted fallback data.

- Existing-order quantity edits with allocation, inbound, production, receipt,
  or fulfillment evidence now enter a guarded Sales Change Review instead of
  being blocked. The representative explicitly acknowledges preserved evidence
  and, when open inbound exists, chooses whether to cancel that supplier
  quantity or retain it for warehouse stock. See
  [`inbound-sales-adjustment-reconciliation.md`](./inbound-sales-adjustment-reconciliation.md).
- Existing-order change review compares an incoming save against the canonical
  relational edit projection instead of the potentially stale
  `meta.newSalesForm.lineItems` snapshot. Sales timeline activity also bounds
  its subject, headline, and note to the existing 191-character `NotePad`
  columns, preventing long update summaries from rolling back an otherwise
  valid save transaction.

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
- Existing House Package Tool rows are recovered by their unique sales-item
  relation when an incoming quote payload omits the tool id. Re-saves reactivate
  and update that row instead of attempting a duplicate insert, while genuine
  stale form revisions continue to be rejected.
- Extra-cost metadata with a missing relational id is reconciled by recreating
  the cost for the current sale; an id is updated only when it still belongs to
  that sale.
- Profile repricing treats zero base-price placeholders as missing pricing
  authority. Configured workflow components and grouped door, shelf, and
  moulding rows fall back to their current sales price ratio instead of
  collapsing invoice summaries to zero.
- Repeated customer-profile switches keep House Package Tool pricing
  reversible. When a persisted door has no authoritative base price, repricing
  extracts the prior door-only sales price from the all-in unit before applying
  the profile ratio, then adds the newly repriced shared surcharge once. Profile
  multipliers retain ratio precision until the final currency value is rounded,
  so switching back restores the original price instead of compounding or
  drifting.
- Editing an existing HPT door row's Base Price explicitly returns that row to
  calculated pricing by clearing stale custom/override price metadata. The new
  final unit price retains the row's shared surcharge, flat rate, addon, and
  quantities, then persists through the normal relational save path. This
  prevents an older custom-price value from making a changed Base Price appear
  to save the same amount.
- Existing HPT rows with a positive stored base price compare their stored
  door-only sales price against the active customer-profile calculation. Users
  with door-pricing permission see a row-level Repair action only when those
  values drift. Repair preserves quantities, addon, custom-price, and route
  semantics, recalculates the row and package totals through the canonical HPT
  patch path, and disappears once the row is aligned; saving the form persists
  the correction. The Add Size menu lists every configured size, keeps already
  selected sizes visible with a `Selected` label, and disables them to prevent
  duplicate rows.
- P.O. metadata is projected to both the legacy root field and an existing
  nested new-form document. Legacy saves preserve the nested document instead
  of replacing unknown metadata, and both editors hydrate the same canonical
  P.O. value.
- Dirty form payloads are persisted to versioned local-recovery storage on
  change and page-leave. Risky navigation warns when autosave is disabled,
  stale, or errored.
- The web new-form local-recovery alert is temporarily hidden while snapshot
  capture and restore handling remain available for a later UI re-enable.
- The invoice-summary customer card starts expanded so billing and shipping
  address details are visible without an extra click.
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
- Shelf product search results render inside a dedicated bounded scroll region,
  so long product matches no longer grow the new-sales-form popup and page.
- Shelf V2 applies its 20rem result cap as an inline listbox style instead of a
  Tailwind arbitrary-value class. This guarantees the runtime CSS includes the
  height boundary even when the consuming app does not generate package-owned
  arbitrary utilities; overflowing results retain contained vertical scroll.
- Shelf V2 uses one product table without separate section-category cards.
  A dedicated 2.5rem `SN` column appears before Product, and each serial number
  is vertically centered against the product input's 2rem control height rather
  than the full row height created by the category subtitle. Product selection
  derives and persists the row's category ids, while the visible parent/child
  category tree is rendered directly below that row's product input using the
  same breadcrumb formatter as suggestion subtitles. Internal users with line-
  pricing capability see an Edit button immediately after a selected product
  input. Its dialog updates the catalog product name and stored cost price
  through the existing new-sales-form mutation, refreshes all Shelf product
  caches, and reprices every selected row using that product against the active
  customer profile; the row-level Price column remains the sales/custom-price
  override.
- Shelf V2 product selection closes the suggestion popup immediately while
  keeping focus in the selected product input. The picker uses the combobox's
  focus-aware opening contract, so the library's post-selection focus restore
  cannot reopen the popup; focusing a closed picker directly still opens it.
- Shelf product discovery uses one package-owned compiled deep-search grammar
  across the shared dashboard/dealership picker, Shelf V1, and the typed API
  fallback. Product words can be reordered; door dimensions such as
  `3 0X8 0`, `3-0 X 8-0`, and `3'0" × 8'0"` are equivalent; `4-9` can match
  `4-9/16`; standalone hyphenated partials such as `5-0` can match either exact
  side of `5-0X6-8` or a mixed-fraction prefix without accepting unrelated
  independent digits; and parent/child category names provide secondary
  context. A lone `x`, `X`, or `×` is only a measurement connector, one-letter
  lexical input is non-substantive, and typo/edit-distance matching is
  intentionally excluded. Cached indexes compile once, V2 defers
  only result work, selected products remain available, and dealer visibility
  is applied before searchable category data is returned.
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
- Global invoice details render an editable, labeled `P.O. Number` control for
  orders and quotes while keeping the separate invoice-date control hidden.
  Once a sale is saved, the editor header combines the visible document number
  and persisted invoice date as `#09158PC 08/03/26`; unsaved create forms keep
  the date out of the title.
- Door size selection uses an all-caps title, a single non-wrapping Door
  Supplier label beside the supplier dropdown, and no duplicate selected-
  supplier caption. Door LH/RH/Qty, HPT size rows, shelf rows, moulding rows,
  and service rows share one segmented minus/value/plus quantity control with
  explicit bounds and accessible action labels. The desktop door-size table
  also keeps its Size header and values on one line, allowing the table scroller
  to absorb longer dimensions instead of wrapping them inside the column.
- House Package Tool table rows use persisted row identity, with a stable
  component/size/index fallback for unsaved rows. Mutable swing and quantity
  values are excluded from React keys, so typing into Qty, LH, RH, or Swing
  updates the row without remounting it or dropping keyboard focus. HPT,
  Moulding, Service, and Shelf quantity controls reserve enough width for
  three-digit values. Their table minimum widths and fixed quantity columns
  absorb the added space inside existing horizontal overflow boundaries instead
  of squeezing the numeric inputs or overlapping adjacent cells.
- Component search/action bars now use the component picker itself as their
  boundary. They float above the editor footer while a long component list is
  active, anchor at the end of that list, and disappear when the picker leaves
  the scroll viewport instead of escaping into the next section.
- Invoice payment dates match legacy form ownership. Invoice Date remains
  visible but is read-only in both order and quote editors. Orders expose Net,
  Due, and Production Due; legacy values such as `Net30` normalize to `Net 30`,
  a selected automatic term recalculates and disables Due, and `None` leaves
  Due editable. Quotes omit Net, Due, and Production Due and expose Good Until.
- The new-form Payment Method selector and its save-time Review payment method
  prompt share one catalog. It includes Zelle alongside Cash, Check, Credit
  Card, ACH, Link, and Wire Transfer, preventing the two controls from
  drifting apart.
- Expanded customer summaries expose Billing Address and Shipping Address as
  full-width keyboard-accessible edit targets with right-aligned Edit text,
  pointer cursors, and subtle hover feedback. Address-only saves reconcile a
  newly created address back into the current sale. When both selected address
  ids exist and differ, Shipping also exposes a confirmation-gated `Same as
  billing` action that changes only the sale's shipping selection and preserves
  the saved shipping-address record.
- Eligible workflow steps now expose Custom only through the bottom action bar.
  Custom catalog entries stay out of ordinary grids, while an actively selected
  or historical snapshot remains visible. Custom is mutually exclusive with
  standard selections even on multi-select steps; clicking the selected custom
  clears it and truncates downstream route state, while choosing a standard
  component removes custom metadata and cost before totals recalculate.
- The Custom editor reuses the legacy autocomplete for step-scoped existing
  values and new uppercase titles. Cost Price renders only when the active step
  has component pricing support. The sales picker no longer has an `Enable
  Custom` catalog reveal.

## Validation

- Authenticated browser regression on order `08869PC` and quote `03329LRG`
  saved P.O. changes from both new and legacy forms, reloaded both editors,
  and found no maximum-update-depth overlay. The final capture produced one
  save payload instead of the prior same-millisecond save storm.
- Shared state/recovery tests: 14 tests / 57 assertions.
- Legacy costing and subtotal tests: 13 tests / 50 assertions.
- Current grouped-service tax/costing, normalization, workflow, and state tests:
  82 tests / 315 assertions in the focused parity slice.
- HPT row-identity, grouped-line layout, shelf editor, render, and shared
  quantity-stepper validation passes 19 tests / 67 assertions. Authenticated
  browser reproduction on order `09326LM`
  changed an LH quantity from `4` to `45` with one keystroke, retained the same
  focused input, restored the original `4`, submitted no save, and recorded no
  console errors. The width update increased the visible HPT and Moulding
  numeric input areas from 38px to 54px while preserving table layout; the
  Moulding proof retained values `30` and `18`, then returned the temporary QA
  tab to Sales Orders without submitting an input or save event.
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
- 2026-08-05 authenticated browser QA confirmed create-order hides the P.O. and
  Date controls and retains the `New order` title, while saved order `09158PC`
  renders `#09158PC 08/03/26` from its persisted date with the same controls
  hidden. Seven focused tests / 20 assertions, the Sales package typecheck,
  scoped Biome checks, and browser console-error check pass.
- 2026-08-20 restored the P.O. control after production feedback showed that
  open/save could erase order `09353PC`'s value. Omitted P.O. payloads preserve
  the existing compatibility value, explicit blanks clear both root and nested
  shapes, and new-form saves retain `newSalesForm.form.po`. Focused metadata,
  summary UI, autosave, and relational persistence suites pass 59 tests / 252
  assertions; Sales typecheck and whitespace checks pass. Authenticated browser
  proof was blocked because local Docker services did not become available.
- 2026-08-06 the focused shelf product picker UI regression passes 1 test / 2
  assertions and confirms the results container has a fixed maximum height with
  vertical scrolling and contained overscroll.
- 2026-08-06 deep shelf product search passes 47 focused tests / 231 assertions
  across the shared domain matcher, new-sales-form API, shelf picker source
  contract, and dealer visibility. Coverage includes the reported product/query,
  alternate measurement syntax, negative numeric collisions, category-assisted
  ranking, selected hydration, effective active-ancestor enforcement, parent
  derivation from child-only product rows, dealer path allowlisting,
  grouped database measurement anchors, stale-result suppression, and recall
  across 1,000 coarse numeric collisions without bulk catalog retrieval.
  A synthetic 5,000-row package benchmark compiled in about 18ms and searched
  in about 2ms. No database migration was required; authenticated browser and
  real-catalog payload checks remain release verification.
- 2026-08-06 authenticated in-app browser reproduction with query `carrara`
  showed the former Shelf V2 arbitrary `max-h-[320px]` utility computed to
  `max-height: none`, producing a 916px dropdown. After the fix, 19 results
  render in a 318px client area with 914px scroll height, computed
  `max-height: 320px`, and `overflow-y: auto`. The focused picker regression
  passes 2 tests / 10 assertions.
- 2026-08-06 authenticated in-app browser proof selected
  `BFLD, 4DR 5-0X6-8 HC CARRARA SM, CARTON PACK` and confirmed one rendered
  Shelf Items table, zero `Section N category` cards, and the visible
  `Bifolds > Hollow Core Molded Bifold` category tree directly below the
  selected product input. Focused shelf UI coverage passes 4 tests / 15
  assertions.
- 2026-08-06 partial-dimension search coverage confirms `Carrara hc 5-0`
  matches `BFLD, 4DR 5-0X6-8 HC Carrara SM, Carton Pack`, while near sizes and
  unrelated `5`/`0` digits remain excluded. Spaced size storage, width/height
  sides, fraction-prefix preservation, and shared V1/V2 authority are covered;
  the domain, picker parity, and API suites pass 46 tests / 228 assertions.
- 2026-08-06 authenticated in-app browser QA searched `Carrara hc 5-0`,
  selected `BFLD, 4DR 5-0X6-8 HC CARRARA SM, CARTON PACK`, and confirmed the
  selected input retained the product with `aria-expanded="false"` while the
  listbox was no longer visible. The focused Shelf editor regression passes
  5 tests / 18 assertions.
- 2026-08-06 authenticated in-app browser QA navigated an Interior pre-hung
  configuration to the priced `Jamb Size` step and confirmed standard-only
  default cards, no `Enable Custom` menu item, the eligible bottom Custom action,
  inline title/cost entry, and existing custom autocomplete results. No custom
  record or order was submitted. The focused custom selection, visibility,
  pricing-support, dashboard wiring, and inventory API slice passes 43 tests /
  117 assertions.
- 2026-08-06 moulding quantity confirmation now persists the selected row while
  retaining the multi-select Moulding catalogue and its footer. Authenticated
  in-app browser QA added two mouldings with quantities `3` and `2`, confirmed
  the catalogue stayed available after each Add, and verified only the footer
  Proceed action advanced to the grouped line-item summary. The focused
  moulding, step-family, and multi-select suites pass 30 tests / 80 assertions,
  the Sales package typecheck passes, and the verified flow emitted no browser
  console errors.
- 2026-08-07 edit-order loading now hydrates historical house-package Door step
  snapshots from the persisted step-product relations, including the related
  door title/image fallback used by older or archived rows. A stale persisted
  empty component array no longer erases relation-backed HPT hydration.
  Clicking an ordinary workflow step also makes that line the active query
  owner and renders only its component grid; HPT, Moulding, Service, and Shelf
  custom panels remain
  available per line. Authenticated QA on order `09166LRG` confirmed items 3-5
  restore their real titles/images, item 3 Door loads 16 components, item 3
  Height loads 3 components, and switching to item 1 replaces that grid with
  its 17-component list without any `No components returned` state. The focused
  suites pass 19 tests / 103 assertions, and Sales/API typechecks pass.
- 2026-08-07 standard workflow panels preserve the intentional single-open-item
  behavior: opening a step on another item closes the prior standard panel and
  resets that prior item's active pill to its route-default step. All explicit
  step navigation now keeps only the current line's step state, including HPT
  Add Door and programmatic next/jump actions. Step content opens, closes, and
  changes with a 200ms height/fade/slide transition and disables motion for
  reduced-motion users. Authenticated QA on order `09166LRG` confirmed item 1
  Door resets to House Package Tool when item 2 Height opens, leaving only item
  2 Height explicitly active. The focused suites pass 19 tests / 106
  assertions, and the Sales typecheck passes.
- 2026-08-07 item title inputs now use uppercase presentation for loaded values,
  user edits, and placeholders in the shared invoice item card. Finished edits
  are normalized to uppercase on blur so the controlled field remains safe for
  text composition while future saves retain the displayed casing.
  Authenticated QA on `09166LRG` confirmed all five existing titles render in
  uppercase without editing or saving the order. The focused workflow regression,
  Sales typecheck, and scoped formatting check pass.
- 2026-08-17 live item-title patches preserve trailing whitespace until the
  next character arrives, preventing controlled-state normalization from
  collapsing spaces between words. Save/hydration normalization remains
  unchanged. The HPT Estimate dropdown now exposes Custom Price to all order
  editors while keeping base cost, addon price, and repair controls behind the
  existing pricing-admin capability.
- 2026-08-19 the shared Moulding line table no longer has separate Addon/Qty
  and Custom columns. Selecting its Estimate amount opens a cost estimate
  breakdown with the current estimate, quantity, final unit, and line total;
  the existing Addon/Qty and Custom Price controls remain in that menu for
  pricing-enabled users, while read-only users see their current values. Clicking
  a Moulding component opens its quantity form with the shared segmented
  minus/value/plus quantity control, retaining calculator, autofocus, and
  Enter-to-add behavior.
- 2026-08-07 adding a sales-form item now smoothly scrolls the shared workflow
  list to the newly inserted active item section. Initial hydration and ordinary
  item switching do not trigger the scroll, and reduced-motion users receive an
  immediate scroll instead. Authenticated QA on `09166LRG` confirmed item 6 was
  added in an unsaved copy and brought near the top of the form viewport; the QA
  tab was closed without saving. Focused workflow coverage, Sales typecheck, and
  scoped formatting and whitespace checks pass.
- 2026-08-19 focused shared Moulding editor coverage passes 3 tests / 16
  assertions for the five-column table, Estimate breakdown placement, and
  existing row-patch path. No browser, build, or broad typecheck run was
  performed under the requested fast Bun workflow.
- 2026-08-19 focused Moulding quantity-form and editor coverage passes 8 tests
  / 42 assertions, including the shared stepper, minimum quantity, autofocus
  ref, and Enter-to-add wiring. No browser, build, or broad typecheck run was
  performed under the requested fast Bun workflow.
- 2026-08-21 the shared Moulding line-item table fills the available item
  workspace while retaining its 620px horizontal-scroll floor. Saved grouped
  Moulding rows now preserve the related step-product image, with the Moulding
  product image as a fallback, so reloaded orders render the actual component
  thumbnail instead of the ruler placeholder.
- 2026-08-21 explicit Fulfillment changes now keep the method and invoice-wide
  Delivery charge aligned in create/edit orders and quotes. Selecting Delivery
  creates one editable zero-value `Delivery` additional-cost row when none
  exists. Selecting Pickup with one or more Delivery-typed rows opens a
  confirmation; cancel keeps Delivery and its charges, while confirm removes
  every Delivery row and preserves unrelated additional costs. Passive
  hydration does not create or remove charges.
- 2026-08-21 resolved HPT door and Moulding line-item thumbnails are now
  keyboard-accessible image-preview triggers. They open a shared image-only
  lightbox with a dark backdrop, a full-size contained image, and standard
  close, backdrop, and Escape dismissal without a conventional dialog card. A
  versioned per-browser first-seen timestamp shows a mild 1px
  blue-violet-amber gradient border for seven days; after expiry the border
  disappears while the hand cursor, focus ring, hover affordance, and preview
  behavior remain. Missing-image ruler fallbacks remain non-clickable.
- 2026-08-21 the Moulding line-item Estimate header and interactive value now
  share an explicit right edge, matching the HPT Estimate column instead of
  relying on inherited table-cell text alignment for the menu trigger.

See [`../sales-form-system-hardening-plan.md`](../sales-form-system-hardening-plan.md)
for phase ownership and rollout requirements.

## 2026-08-18 Relational source-of-truth hardening

- Commercial Sales Form state now hydrates from the legacy relational graph
  only; `meta.newSalesForm` is limited to revision and editor/session metadata.
- Save uses a serializable, revision-checked relational diff. Retained items,
  steps, shelves, HPT rows, doors, and costs keep durable IDs; omitted rows alone
  are retired. The response is a fresh canonical relational reload.
- Active door identity is component plus normalized dimension. Duplicate input
  is rejected before writes, historical duplicates collapse without summing,
  and the bounded repair command records before/after evidence in `SalesHistory`.
- Passive profile hydration never reprices. Explicit profile changes use the
  shared HPT formula, recovered base authority, and pricing-ready gates.
- Quote `03523PC` is the regression oracle: Tier 2, component `1322`, size
  `2-6 x 6-8`, quantity one, final unit/line price `$355.67`.
- The browser pricing-load crash was a separate state-synchronization defect:
  the animated item panel treated a newly allocated React child as effect state,
  and door synchronization wrote idempotent patches repeatedly. Animation now
  keys only on stable item/step identity, transient children live in refs, and
  normalized no-op line patches preserve the existing store state.
- Local repair retained door row `63943`, retired its duplicate siblings,
  restored its pricing authority, and removed duplicate active form steps.
  The bounded follow-up audit reports no findings for Sales Order `26124`.
- Authenticated in-app browser acceptance on `03523PC` confirms one target row,
  quantity `1`, estimate `$355.67`, line `$355.67`, and no error page after the
  Tier 2 pricing profile finishes loading.
