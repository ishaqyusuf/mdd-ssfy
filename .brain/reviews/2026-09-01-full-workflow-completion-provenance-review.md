# Brain Review: Full-workflow Completion Provenance

## Decision

Pass — ready to land as Ticket 05 of the ordered Status-only Sales Completion
stack.

## Review Unit

- Queue: `2026-09-01-gnd-full-workflow-completion-provenance`
- Type: `stack-item`
- Dependency: Ticket 04 approved
- Source ticket:
  `.scratch/status-only-sales-completion/issues/05-preserve-full-workflow-provenance-and-cancellation.md`

## Findings

No blocking findings remain.

Two import-order diagnostics found during scoped review were fixed before this
decision. The implementation remains within the handoff boundary: it does not
redesign the operational workflows, treat provenance as truth, alter public
permissions, or add a historical backfill.

## Evidence Reviewed

- Full-workflow records are created only after the shared resolver proves
  operational Production or canonical Fulfillment evidence.
- Record and Sales History writes share one serializable transaction; retries
  and active-key races replay the existing Full record.
- An active Status-only record is never rewritten to Full when later canonical
  evidence appears.
- Production submission finalization and approved material review invoke the
  writer only after their operational transaction returns.
- Dispatch completion persists request-bound proof before invoking Fulfillment
  provenance. Completion-record request identity is independently unique, so a
  multi-order bulk request cannot collide across ledger rows.
- Existing workflow-aware reversal cancels only matching Full provenance in the
  same transaction. Public Status-only cancellation rejects Full records, and
  workflow cancellation ignores Status-only records.
- The existing migration creates the ledger without inserting historical rows
  or updating `SalesOrders`, `SalesStat`, or `QtyControl`.

## Validation

- `bun test` across completion, Production transaction, material-review,
  workflow-cancellation, and Jobs contracts: 100 passed / 302 assertions.
- `bun --filter @gnd/sales typecheck`: passed.
- `bun --filter @gnd/jobs typecheck`: passed.
- `git diff --check`: passed.
- Scoped Biome formatting/import organization: passed after the two review
  fixes.
- API and DB typechecks retain unrelated existing diagnostics in untouched
  inbound, special-order, tax/shipping, and local-sync files.
- Dashboard typecheck required an 8 GB heap to emit its existing broad
  diagnostic baseline; no Ticket 05 file introduced a Dashboard diagnostic.

## Brain Documentation

Updated feature behavior, plan/task state, progress, database schema and
migration compatibility, API contracts, and the completed handoff. The parent
feature remains in progress and advances to Ticket 06.
