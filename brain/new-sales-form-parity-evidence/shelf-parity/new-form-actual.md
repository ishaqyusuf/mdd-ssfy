# New Form Actual (Code Evidence)

Shelf workflow has been improved but remains partial:
- active shelf panel now loads category and product options from dedicated new-sales-form APIs.
- parent + child category path is now modeled in-row (`Parent -> Category -> Product`).
- row selection captures `categoryId`, `productId`, description, qty, and unit price (auto-fills from selected product).
- totals still roll up through shared shelf summarizer and persist via `line.shelfItems`.

Anchor:
- `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx` (shelf section)

Remaining parity gap:
- no full legacy nested category drilldown/creation workflow yet.
