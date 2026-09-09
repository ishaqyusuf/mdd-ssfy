# Copy order activity provenance

Status: Future-copy fix implemented locally; historical recovery remains separate.

## Confirmed cause

`apps/api/src/db/queries/sales-actions.ts:copySale` writes a `Copy Action`
NotePad entry containing `Copied from <source order number>`, with destination
`salesId`, `type=general` and `status=public`. It omits `channel`.
`packages/notifications/src/note.ts:createNoteAction` persists only the supplied
tags; it does not add a channel. `packages/notifications/src/activity-tree.ts`
requires every root note to carry a recognized channel tag. Consequently this
copy note is excluded even when persistence succeeds. The destination identity
filter already supports salesId; adding order-number tags alone will not fix it.

Additional gaps:
- The note is deferred with waitUntil after the sale commits. Failure is caught
  and logged, while the user still receives copy success; immediate reads can
  also precede the write.
- The legacy author resolver returns null when the employee has no email,
  leaving createNoteAction with an invalid sender connection.
- Shared copySalesInTransaction callers do not use this route-local note writer.
  History snapshots must retain their separate history behavior, and checkout
  conversion must preserve its existing attribution and deduplication contract.
- Ordinary editable copies do not establish fresh structured source provenance;
  quote-to-order conversion does. Existing copied metadata may inherit an older
  copySource, so do not generalize that field without checking conversion lookup.

No specific reported sale or production note was inspected. These are confirmed
code-path defects, not a claim that a particular historical note exists.

## Intended behavior

After a successful explicit copy, the destination Activity shows one system entry
with the source order/quote number, authenticated actor and timestamp. Source
document contents and history are unchanged. Opening or reloading the destination
must show the entry without depending on email or notification subscriptions.

## Implementation plan

1. Add failing coverage for the actual copy writer plus activityTree reader,
   proving that destination salesId alone is insufficient without channel.
2. Persist an activity with the new sale in the same database transaction, using
   a shared domain helper and transaction-compatible author resolution. Reuse the
   established Sales timeline contract: channel=sales_info, source=system, type=system, status=public,
   activity=sales_copied, destination salesId/salesNo/orderNo. Record source ID,
   source number/type and operation as distinct provenance fields; resolve all
   from server-loaded records. Preserve immediate source rather than inherited
   ancestor provenance and the quote-conversion copySource uniqueness semantics.
3. Remove the route's deferred duplicate note. Keep inventory post-commit work
   separate. Explicitly scope the helper to user copies/moves; exclude *-hx
   snapshots and coordinate checkout conversion attribution. Returning an
   existing converted order must not append another copy event. Activity failure
   must roll back the new copy, with an actionable error.
4. Ensure copy/move completion invalidates notes.activityTree through the existing
   query-event system after commit. Verify immediate destination open and reopen.
5. Prepare a bounded, idempotent historical repair dry run: identify exact legacy
   Copy Action notes with valid destination salesId and copy text, add missing
   classification tags without replacing actor/timestamps or duplicating notes.
   Separate absent notes from hidden notes. Do not invent missing source/actor
   evidence; report unprovable cases. Historical data writes are a separate
   explicitly scoped execution step, not part of this planning task.

## Acceptance and validation

- Order-to-order and quote copies show source, actor and time on the destination.
- Conversion retries produce no duplicate event; moves do not double-write it.
- Copy of a copy records its immediate source; conversion lookup remains valid.
- Employee without email can copy with a correctly attributed activity.
- Forced activity failure rolls back sale/items/activity together.
- History snapshots preserve existing history-specific activity behavior.
- Activity is visible on first open, after refresh and under the Sales Info filter.
- Historical repair dry run distinguishes hidden, missing and ambiguous records;
  applying twice does not duplicate or rewrite audit evidence.
- Run focused Sales/API/notification/query-event regressions and relevant package
  typechecks. No schema migration is expected unless implementation establishes
  that existing NotePad/tag storage cannot meet the contract.

Investigation validation: existing sales-overview-activity-filter.test.ts passes
(2 tests, 2 assertions). This checks identity matching only; it does not cover
the missing-channel writer/reader regression or prove live behavior.

Brain impact on implementation: update sales-overview feature and API contract,
plus task/progress state. Keep the copied-sale Confirm Save investigation separate.

## Implementation checkpoint

- [x] Explicit API copy/move commands opt into transaction-scoped shared activity.
- [x] Registered `sales_info` channel, system source, destination identifiers,
  immediate source provenance and authenticated sender/creator are recorded.
- [x] Employee contact creation has no email prerequisite; audit failures throw
  within the copy transaction instead of being swallowed after success.
- [x] Existing converted targets return before audit; history and checkout retain
  their own activity paths. Move records a copy operation with operation=move;
  the existing later source soft-delete remains outside this copy transaction.
- [x] Order/quote query events invalidate the Activity tree.
- [x] Focused writer/reader, copy, history, conversion and refresh regressions.
- [ ] Historical repair: separate scoped data operation; no backfill executed.
- [ ] Live browser and real database rollback acceptance remain unverified.

Reader-contract testing corrected an assumption in the original proposal:
`Sales` is a category and is not an accepted channel. The new helper uses
`sales_info`, checked against the canonical channelNames type. The unrelated
sales-form activity writer using `Sales` was not changed in this task.

No schema, notification delivery or manual-note permission change. Existing
Sales Info note management/revision rules continue to apply. The source sale
metadata is not rewritten; fresh provenance lives in the destination activity,
so quote conversion's existing copySource lookup is unchanged.

Final focused validation: 49 tests pass, 0 fail, 170 assertions across copy-sales,
sales-copy-activity, query-event registry and Sales Overview identity-filter tests.
Scoped tracked diff whitespace check passed. Typechecks/builds were not run.
