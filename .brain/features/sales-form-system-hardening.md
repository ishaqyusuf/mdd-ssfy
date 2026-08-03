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

See [`../sales-form-system-hardening-plan.md`](../sales-form-system-hardening-plan.md)
for phase ownership and rollout requirements.
