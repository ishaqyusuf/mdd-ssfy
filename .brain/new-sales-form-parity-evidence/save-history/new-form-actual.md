# New Form Actual

Save history behavior is implemented:
- Summary/History tabs in invoice sidebar.
- History tab queries actual `order-hx` / `quote-hx` snapshot records and renders author, date, totals, profile, and item count.
- Draft/final save paths trigger `create-sales-history` task.
- Preview lazily loads one snapshot into a read-only form and shows an amber top banner with return/restore actions.
- Restore copies snapshot content into the current document while preserving current identity/status/payments, strips copied persistence IDs, and shows a blue restored-version top banner until a successful save.

Anchors:
- `apps/www/src/components/sales-hx.tsx`
- `apps/www/src/components/forms/new-sales-form/new-sales-form.tsx`
- `apps/www/src/components/forms/new-sales-form/history-restore.ts`
- `apps/www/src/components/forms/new-sales-form/sales-history-snapshot-preview.tsx`
- `apps/api/src/db/queries/sales-hx.ts`
- `apps/api/src/db/queries/new-sales-form.ts`

Current parity status:
- API/list/restore transformation tests pass.
- Empty-state browser behavior is verified on order `08893LM`.
- Snapshot preview/restore/banner browser acceptance remains deferred by user request and must be completed before claiming full history readiness.
