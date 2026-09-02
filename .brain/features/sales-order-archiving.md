# Sales Order Archiving

## Status

Implemented locally from the approved Wayfinder specification and two
tracer-bullet tickets. The generated additive migration is applied to the
local `gnd-prisma2` database and Prisma Client is current.

## Product Contract

- An Archived Sales Order is hidden from the default Sales Orders workspace but
  remains a live Sales Order with unchanged commercial and operational state.
- Archived Sales Orders are available through `Show > Archived` and can be
  restored.
- Archive remains separate from Sales Bin deletion and from cancellation,
  completion, payment, production, inventory, dispatch, fulfillment, and
  accounting semantics.
- Any non-deleted order may be archived. Non-terminal archive confirmation must
  warn that operational work continues and purpose-built operational queues
  must remain unaffected.
- Users with `editOrders` may archive or restore one order or up to 100 selected
  orders. Every changed order produces attributable Sales History evidence.

## Data And Query Contract

- `SalesOrders.archivedAt` is nullable; null is the migration-safe active
  default. The workspace index covers `type`, deletion, archive state, and
  default date/id pagination.
- The canonical default list and summary require non-deleted, non-archived
  orders. Archived scope requires non-deleted orders with `archivedAt` set.
- Sales Bin remains deletion-only and independent of archive state.
- Apply archive scope before count and pagination across legacy, payment-review,
  and projected candidate-selection paths.
- Saved tabs, filtered exports, summary cards, and shared mobile defaults must
  agree with the canonical scope.
- Keep archive outside the compact projected row payload unless implementation
  proves it is needed for presentation.

## Implemented API And UI Contract

- `sales.setSalesOrdersArchived({ salesIds, archived })` is a protected
  `editOrders` command for 1-100 unique IDs. It processes only order-type rows,
  uses an atomic transaction, and reports `changed` IDs plus structured
  `missing`, `deleted`, and already-in-target-state skips.
- Every changed row receives one `SalesHistory` entry carrying the archive or
  restore event, order number, authenticated actor ID, and archive timestamp.
- The `/sales-book/orders` filter URL accepts `archiveScope=archived`; filter
  metadata renders it as `Show > Archived`. The existing Special Order scope
  control is explicitly labelled to avoid two indistinguishable Show controls.
- Row and batch actions use explanatory confirmation modals, with an explicit
  active-operational-work warning before archive. Both publish the normal
  `sales.order.changed` query event for centralized list, summary, saved-tab,
  and detail invalidation. Filtered export and consumers that forward the
  canonical list input inherit the same scope.

## Verification

- Focused query and command tests cover default/archived/bin scope, schema URL
  parsing, idempotent skips, and Sales History audit output.
- The focused API/query-event suite passes 47 tests / 118 assertions. Prisma
  generation, the named local migration, and `db:push` completed successfully.
  Full API/dashboard typechecks have existing unrelated failures, but a
  touched-file diagnostic scan is clean.
- Authenticated local browser QA confirms the active default workspace,
  `Show > Archived`, the `archiveScope=archived` URL contract, its empty-state
  behavior for the current local data, and clearing back to active orders. QA
  did not archive or restore any live order.

## Planning Artifacts

- [Local Wayfinder map](../../.scratch/sales-order-archive/map.md)
- [Ready-for-agent specification](../../.scratch/sales-order-archive/spec.md)
- [Ticket 01: single-order archive journey](../../.scratch/sales-order-archive/issues/01-ship-reversible-single-order-archiving.md)
- [Ticket 02: batch archive and shared-consumer parity](../../.scratch/sales-order-archive/issues/02-add-batch-archiving-and-shared-consumer-parity.md)
