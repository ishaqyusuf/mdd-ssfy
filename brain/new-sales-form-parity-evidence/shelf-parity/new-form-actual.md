# New Form Actual (Code Evidence)

Shelf workflow has been improved and package pricing proof is passing:
- active shelf panel now loads category and product options from dedicated new-sales-form APIs.
- parent + child category path is now modeled in-row (`Parent -> Category -> Product`).
- row selection captures `categoryId`, `productId`, description, qty, and unit price (auto-fills from selected product).
- totals still roll up through shared shelf summarizer and persist via `line.shelfItems`.
- shared package proof now covers section flattening, legacy row unit-price preservation, explicit base-metadata profile repricing, and parent line qty/unit/total sync.

Anchor:
- `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx` (shelf section)

Remaining parity gap:
- no full legacy nested category drilldown/creation workflow yet.
- browser save/reopen proof is pending behind the local auth/session gate.
