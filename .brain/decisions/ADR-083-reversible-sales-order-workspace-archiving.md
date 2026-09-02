# ADR-083: Reversible Sales Order Workspace Archiving

## Status

Accepted — 2026-09-02

## Context

Completed or inactive Sales Orders make the default workspace difficult to use,
but deleting them or overloading cancellation/completion would destroy the
distinction between workspace visibility and commercial or operational truth.

## Decision

Use nullable `SalesOrders.archivedAt` as a reversible workspace visibility
marker. The canonical Sales Orders list, summary, count, saved tabs, and
filtered exports default to non-deleted, non-archived orders; `Show > Archived`
selects non-deleted archived orders. Sales Bin continues to scope deletion only.

Expose one protected `editOrders` command for archive/restore of up to 100
unique order IDs. It is transactional, idempotent, returns structured skips,
and writes Sales History only for changed orders. Archive does not participate
in lifecycle, fulfillment, payment, inventory, production, dispatch, or
accounting filters.

## Consequences

- Operators can tidy the working order list without affecting active work.
- Direct order overview/edit routes remain accessible for archived orders.
- A composite workspace index supports the default and archived query paths.
- Archive state must be included wherever the canonical Orders filter input is
  reused; specialized operational queues remain archive-neutral.
