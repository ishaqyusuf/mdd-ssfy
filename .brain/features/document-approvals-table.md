# Document Approvals Table

## Purpose
The HRM document approvals route at `/hrm/document-approvals` lets authorized admins review employee insurance document uploads and approve or reject them.

## Current Implementation
- Route: `apps/www/src/app/(sidebar)/hrm/document-approvals/page.tsx`
- List wrapper: `apps/www/src/app/(sidebar)/hrm/document-approvals/document-approval-list.tsx`
- Data source: existing server action `getEmployeeDocumentApprovals()`
- Review action: existing server action `reviewEmployeeDocument(document.id, status)`
- Table module: `apps/www/src/components/tables-2/document-approvals/*`
- The route uses `PageShell`, `ScrollableContent`, and `getInitialTableSettings("document-approvals")`.
- The approval list keeps the existing review URL-param behavior through `useDocumentReviewParams`, but renders the repeatable approval queue through the domain `tables-2/document-approvals` table instead of card-mapped rows.
- The table uses the `tables-2` core primitives through a domain table module, with no changes to `components/tables-2/core`.

## Table Behavior
- Compact row styling is registered through `TABLE_CONFIGS["document-approvals"]`.
- Columns are content-tailored:
  - Employee: `180/320/220`, sticky
  - Document: `180/340/220`
  - Status: `104/150/118`
  - Dates: `132/210/154`
  - Reviewed: `112/170/128`
  - Actions: `156/210/172`, sticky right
- Row height is `56px`, matching the Sales Orders/Midday compact direction while keeping employee identity, document description, uploaded date, expiry date, and review actions readable.
- Employee/document cells use smaller two-line text, a `size-8` avatar, and compact `h-8` review buttons so the table no longer spends approval-queue space on oversized rows/actions.
- The table owns vertical and horizontal scroll, virtual rows, draggable headers, resize handles, persisted visibility/sizing/order, and column divider settings.
- The local column visibility/divider control is shown in the approval card header.

## Preserved Behavior
- Existing document approval data loading is unchanged.
- Existing Open Review behavior is preserved through `openDocumentReviewId`.
- Existing Approve and Reject actions still call `reviewEmployeeDocument` and refresh the route after success.
- Existing document URL opening remains available from the Document column.

## Validation
- Focused parity test: `bun test apps/www/src/components/tables-2/document-approvals/migration-parity.test.ts`
- Full restarted table suite: `bun test apps/www/src/components/tables-2`
- Targeted Biome check over the route, list wrapper, table module, and table registry.
- Broad `@gnd/www` typecheck still exits on unrelated baseline errors, but the touched-file grep reported no diagnostics for this slice.
- Static scans found no card-mapped approval rows, manual fetch, old table import, or shared-header pattern in the document approvals route/list surface; only expected table primitives remain inside the new `tables-2` module.
- `git diff --check` passed.
- `apps/www/src/components/tables-2/core` has no diff.
- Direct route smoke for `/hrm/document-approvals` returned `200` from the local Next server on `3010`.
- Follow-up authenticated browser proof on `https://gndprodesk.localhost/hrm/document-approvals` loaded the approval table, confirmed `56px` rows, a `45px` header, table-owned vertical scroll (`scrollTop 0 -> 650`, `scrollHeight 1837`, `clientHeight 419`), and no document-level horizontal overflow. At the current desktop width the tightened columns fit the table container exactly (`scrollWidth 1144`, `clientWidth 1144`), so there was no horizontal overflow to move.
