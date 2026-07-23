# Sales Form System Hardening

## Current behavior (2026-07-22)

- Shared sales-form state enables debounced autosave by default for newly
  created and hydrated records; the editor toggle still supports deliberate
  manual-save mode.
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

## Validation

- Shared state/recovery tests: 14 tests / 57 assertions.
- Legacy costing and subtotal tests: 13 tests / 50 assertions.
- Current grouped-service tax/costing, normalization, workflow, and state tests:
  82 tests / 315 assertions in the focused parity slice.
- API sales-form transaction/parity tests: 29 tests / 237 assertions, plus 3
  bounded post-save tests / 8 assertions.
- Remaining release gate: authenticated browser proof for autosave, recovery,
  leave warning, and full pricing permutations against a real database.

See [`../sales-form-system-hardening-plan.md`](../sales-form-system-hardening-plan.md)
for phase ownership and rollout requirements.
