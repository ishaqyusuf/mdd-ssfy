# New Form Actual (Code Evidence)

Per-component action menu parity is implemented with:
- Edit
  - Details
  - Visibility
  - Price
  - Section Setting Override
- Select
- Redirect
- Delete

Anchors:
- `packages/sales/src/sales-form/ui/workflow/workflow-component-action-menu.tsx`
- `packages/sales/src/sales-form/ui/workflow/workflow-step-component-panel.tsx`
- `apps/www/src/components/forms/new-sales-form/sections/use-workflow-component-admin.tsx`
- `apps/api/src/db/queries/sales-form.ts`

Current parity status:
- Persisted legacy action parity is implemented for both package workflow-panel
  hosts. `Select` enters isolated catalog-management mode; confirmed Delete
  soft-archives catalog rows while saved/current sale snapshots remain intact.
- Admin/Super Admin catalog permissions and Super Admin-only component pricing
  are enforced in both capabilities and protected API authorization.
- Focused source/application coverage verifies menu composition, management
  selection isolation, role gates, pricing buckets, schemas, invalidation,
  inventory sync, and product-code persistence. Browser acceptance remains the
  final runtime evidence step.
