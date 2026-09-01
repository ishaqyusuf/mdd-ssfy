# Review: Completion Projection, Queue, And Reporting Parity

## Verdict

Approved for landing after one review fix.

## Review Unit

- Queue: `2026-09-01-gnd-completion-projections-queues-reporting`
- Base: `df77e0f614fb735ff0442ba62904fd138199aa6d`
- Implementation: `9d7ec7182`
- Reviewed fix: `ad934993e`
- Scope: Ticket 06 list/detail/read-model/filter/count/reporting parity and
  operational isolation.

## Findings

### Resolved: implied Production reporting needed an explicit source

The first administrative reporting contract returned method and dates but not
source. A Status-only Fulfillment declaration implies Production satisfaction,
so a Production report row could be mistaken for its own declaration. The
reviewed fix adds `source` to every report row and proves the implied Production
row is `IMPLIED_BY_FULFILLMENT` while the Fulfillment row remains `STATUS_ONLY`.

No unresolved blocking or non-blocking findings remain.

## Acceptance Evidence

- The shared row resolver drives Sales detail/list normalization and persisted
  projections; operational lifecycle fields remain separate.
- Persisted projection version 3 and warm/freshness identities include the
  newest completion-record revision.
- `completion.production` and `completion.fulfillment` share one Prisma
  satisfaction predicate across list, summary, and count paths. Existing
  Production and dispatch filters remain operational.
- Status-only labels are explicit, effective dates remain nullable, and
  provenance/history/actions remain available.
- Operational completion reports exclude Status-only declarations by default;
  administrative rows expose source, method, effective date, and recorded date.
- Production, Fulfillment, inventory, packing, dispatch proof, and tax
  regressions do not consume administrative completion evidence.

## Validation

- 107 focused parity/reporting tests passed with 318 assertions after the
  reviewed fix.
- 61 operational Production/Fulfillment/inventory/dispatch/proof regressions
  passed with 146 assertions.
- `bun --filter @gnd/sales typecheck` passed.
- Focused Biome checks and `git diff --check` passed.
- API typecheck retained only pre-existing unrelated inbound, Special Order,
  and dispatch diagnostics.
- Dashboard typecheck exhausted its default 4 GB heap; the higher-memory run
  reached the established broad baseline diagnostics and named no Ticket 06
  file.

## Brain Documentation Impact

Updated feature behavior, API contracts, plan/task state, and progress. No
database documentation update is required because Ticket 06 adds no schema,
relationship, migration, permission, or persistence semantic.
