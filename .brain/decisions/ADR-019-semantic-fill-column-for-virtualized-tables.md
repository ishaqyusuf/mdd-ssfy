# ADR-019: Semantic Fill Column For Virtualized Tables

- Status: Accepted
- Date: 2026-07-22
- Scope: `apps/www/src/components/tables-2`

## Context

Tables-2 columns persisted useful compact widths, but the duplicated header and
`VirtualRow` layout capped every data column at `maxSize`. On wide displays this
left an empty strip between the last data column and Actions or the container
edge. The previous Midday-derived fallback flexed whichever column happened to
be last, which was not stable under visibility or column reordering and remained
blocked by that column's rendered `maxWidth`.

## Decision

Every virtualized table configuration declares one semantic `fillColumnId`.
That visible column retains its configured or saved width as its flex basis and
may consume positive spare width beyond its configured `maxSize`. `maxSize`
continues to constrain the manually persisted base size; it does not cap the
final responsive width. All other columns retain their current size, minimum,
and maximum rules.

If the preferred column is hidden or absent, the core resolver chooses the last
visible resizable data column, then the last visible non-action data column.
Actions, Select, Selected, and drag/reorder handles are never data fallbacks.
Actions may fill only when no usable data column remains.

Headers, virtual rows, and skeletons use the same resolver and layout-style
helpers. Sticky fill columns are permitted only when they are the final
left-sticky entry, which the configuration audit enforces.

The nine `LegacyFormDataTable` sales-form grids declare `null` and retain their
semantic `table-fixed` compatibility layout.

## Consequences

- Wide table containers no longer show unused trailing space when preferred
  widths fit.
- Narrow tables continue to own horizontal overflow because column minimums are
  unchanged.
- Column visibility and reorder settings do not change the intended semantic
  fill column; hiding it activates a deterministic fallback.
- Existing settings cookies and saved sizes require no migration.
- Adding a Tables-2 configuration now requires an explicit semantic fill choice
  or an intentional `null` compatibility decision.
