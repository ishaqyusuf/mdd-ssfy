# Shared Page Tabs

## Purpose

Saved page tabs provide reusable filter/sort views across supported list pages while keeping free-text search temporary.

## Navigation and Overflow

- `All` clears filters, sorting, pagination, and `tabName`.
- Saved-tab hrefs include the URL-encoded title as `tabName` alongside the saved baseline query.
- At most three resolved tabs render inline, including `All`; `2xl` screens raise the inline capacity to five.
- Additional tabs render under a `+N` dropdown immediately before Edit and retain saved order, count badges, and the default marker.
- When an overflow tab is selected, it replaces the final inline tab for the active view (third normally, fifth at `2xl`). The displaced tab moves into the dropdown; persisted ordering is unchanged.

## Selected Baseline

- `tabName` is NUQS-backed metadata and is never part of saved-query normalization, equality, count queries, or persistence.
- Selection is valid only when a visible tab title matches `tabName` and every stored baseline value is still present in the current URL. Unrelated filters and search may coexist.
- A selected baseline's filter badges and sort badge are hidden, and its filter submenu fields are disabled with Radix disabled semantics.
- Removal, Clear filters, and Escape clear only ad-hoc values while preserving locked baseline values.
- Renamed, deleted, deactivated, or baseline-mismatched tabs clear stale `tabName` with a shallow replace.

## Search

- `q`, `search`, `_q*`, and the configured page search key are excluded when constructing a saved query.
- Any non-empty search value immediately hides the save action, including when other filters or sorting are active.
- The create/update API rejects active search fields defensively. Existing search-bearing tabs remain readable without migration.
