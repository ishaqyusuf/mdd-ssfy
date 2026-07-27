# Bug: Shelf Item Legacy Sales Form Decimal Serialization Failure

## Date

2026-07-27

## Problem

Opening a legacy sales order form for an invoice containing a shelf item can
fail before the form renders. Order `00003DPP` reproduces the issue at
`/sales-book/edit-order/order-00003dpp`; Next.js reports that a Prisma
`Decimal` cannot be passed from a Server Component to a Client Component.
Because the form does not mount, its Preview, Print, and PDF actions are
unavailable.

The same shelf-item order loads and prints from the new sales form, and the
orders-list print action opens the print dialog. A non-shelf legacy order
(`08895LM`) also loads normally. This scopes the current failure to the legacy
form's server-to-client data boundary rather than the Sales PDF V2 renderer.

## Root Cause

Migration `20260720081100_sales_shelf_decimal_prices` changed
`DykeSalesShelfItem.unitPrice` and `totalPrice` from integer columns to
`Decimal(12,2)`, so Prisma now returns `Decimal` instances.

`typedSalesBookFormItems()` converts those two fields to plain numbers, but
`transformSalesBookForm()` returns the original `data.order` as `order` and
spreads the same raw order into `_rawData`. Both client-facing branches
therefore retain the Prisma `Decimal` objects even though the derived
`itemArray` is normalized. The legacy route passes the whole result into
`FormClient`, and React Server Components reject the non-plain values.

The new sales-form query does not reproduce the issue because it explicitly
normalizes both shelf prices with `Number(...)` before returning its DTO.

## Fix

The two legacy sales-form DTO copies now build one normalized order projection
whose shelf items come from `typedSalesBookFormItems()`. Both `order` and
`_rawData` use that projection, so `unitPrice` and `totalPrice` cross the
Server Component boundary as numbers while Date values retain their existing
semantics.

Once the Decimal boundary failure was removed, authenticated browser testing
exposed a second shelf-only render loop. Shelf combobox content nodes were
stored through callback refs that called React state setters, and the shelf
costing helper was recreated on every render while product effects depended on
it and wrote to the form store. The content nodes now use stable object refs,
and `useShelfContext()` memoizes the costing helper by `itemStepUid`.

## Prevention

- A focused transformer regression test now uses real `Prisma.Decimal` shelf
  prices and asserts that every client-facing branch contains numbers in both
  duplicated DTO modules.
- A shelf render-stability regression test prevents state-setting combobox ref
  callbacks and requires the costing helper used by product effects to remain
  memoized.
- Keep an authenticated RSC/route-level smoke check for a shelf-item order in
  the release gate so client-bound ORM instances and render feedback loops are
  rejected before release.
- Include server-to-client serialization checks when Prisma column types change
  from scalar JavaScript numbers to wrapper types such as `Decimal`.
- Extend Sales PDF fixture coverage to use `Prisma.Decimal` shelf prices even
  though the current renderer path was not the failing boundary.

## Evidence

Regression commands:

```sh
bun test \
  'apps/www/src/app-deps/(clean-code)/(sales)/_common/data-access/dto/sales-book-form-dto.test.ts' \
  'apps/www/src/components/forms/sales-form/shelf-combobox-ref-regression.test.ts' \
  packages/sales/src/print/get-print-data.test.ts
```

Red phase:

- Decimal projection: `0 pass, 2 fail`; both DTO copies returned an object
  (`Prisma.Decimal`) instead of a number through `order` and `_rawData`.
- Shelf render stability: the ref-state and costing-helper assertions failed
  before the corresponding changes.

Green phase: `14 pass, 0 fail` across the shelf DTO, shelf render-stability,
and print-data suites (`86` assertions).

Authenticated browser checks:

- Before the fix, legacy shelf order `00003DPP` failed first with
  `unitPrice: Decimal`; after normalization it exposed a maximum-update-depth
  loop in the shelf form.
- After the complete fix, the legacy form loads the shelf product at `$380.38`;
  Print reports `PDF loaded` and `Opening the browser print dialog`.
- A fresh reload-and-print run produced zero new browser console errors.
- Legacy non-shelf order `08895LM`: form loads with Preview, Print, and PDF.
- New-form shelf order `00003DPP`: shelf row loads; Print opens from the stored
  snapshot with no console error.
- Orders-list print for `00003DPP`: print dialog opens with no console error.

## Related Files

- `packages/db/src/migrations/20260720081100_sales_shelf_decimal_prices/migration.sql`
- `apps/www/src/app-deps/(clean-code)/(sales)/_common/data-access/dto/sales-book-form-dto.ts`
- `apps/www/src/app/(clean-code)/(sales)/_common/data-access/dto/sales-book-form-dto.ts`
- `apps/www/src/components/forms/sales-form/shelf-items.tsx`
- `apps/www/src/components/forms/sales-form/shelf-item-category-input.tsx`
- `apps/www/src/components/tables-2/sales-form-shelf-items/columns.tsx`
- `apps/www/src/hooks/use-shelf.tsx`
- `apps/www/src/hooks/use-shelf-item.tsx`
- `apps/www/src/app/(clean-code)/(sales)/sales-book/(form)/edit-order/[slug]/page.tsx`
- `apps/www/src/app/(clean-code)/(sales)/sales-book/(form)/edit-quote/[slug]/page.tsx`
- `apps/api/src/db/queries/new-sales-form.ts`
- `packages/sales/src/print/compose/shelf-sections.ts`
