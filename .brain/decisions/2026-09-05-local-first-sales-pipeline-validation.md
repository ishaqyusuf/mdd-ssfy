# Local-first Sales Pipeline cutover validation

Status: Accepted by operator, 2026-09-05.

## Decision

Ticket 14 correctness investigation runs primarily against a freshly copied
production database on local infrastructure. Production reliability is a
separate explicit gate within the existing batch, not silently waived or
treated as complete when local tests pass. Scratch's
`sales-pipeline-lifecycle-implementation/local-first-validation.md` owns the
execution sequence and evidence; the ticket's 13 acceptance items stay intact.

## Constraints

- Back up the exact local target and successfully stage the production import
  before replacing it. Production is a read source only.
- Cursor reset/duplicate-table recovery does not prove a clean historical copy.
- PlanetScale rejected the single-transaction full dump at its 20-second
  transaction limit. A windowed full export must be labelled non-atomic and
  followed by relationship/revision/reconciliation checks; no point-in-time
  snapshot or 100% current-production parity is claimed from that copy alone.
- Only reviewed schema deltas and guarded repair scripts may later go to
  production. Never restore the corrected local database onto production.
- Local tests do not authorize notification/job replay, financial writes,
  forced business completion, held-review approval or a broader cohort.

## Consequences

The broad investigation loop moves off production. The 5% production cohort,
rollback, bounded final live audit and unresolved runtime-health gate remain.
Changes arriving in production after the copy must be considered by the final
revision-checked audit, rather than overwritten with the local baseline.
