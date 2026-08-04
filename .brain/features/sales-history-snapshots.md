# Sales History Snapshots

## Purpose

Sales saves enqueue `create-sales-history`, which copies the saved order or quote
into an immutable `order-hx` or `quote-hx` sales document and records the
corresponding activity note.

## Snapshot Identity

- History order IDs use `<salesNo>-hxNN`.
- The next sequence is based on the highest existing numeric history suffix,
  including soft-deleted snapshots, rather than the number of matching rows.
- Concurrent snapshots may initially choose the same sequence. A unique
  `(orderId, type)` collision advances to the next suffix and retries the sales
  record insert without re-copying line items from a failed attempt.
- Collision retries are bounded; unrelated database errors are never retried as
  history identity conflicts.

## Failure Reporting

`copySales` returns copy failures as `error`. The history task must surface that
message before applying its defensive missing-slug check so Trigger runs retain
the actionable database or source-data failure.

## Validation

- `packages/sales/src/copy-sales.test.ts` synchronizes two snapshot attempts and
  proves they receive distinct `hx01` and `hx02` identities.
- `packages/jobs/src/tasks/sales/create-sales-history.test.ts` proves copy errors
  are preserved instead of being replaced by the generic missing-slug error.
