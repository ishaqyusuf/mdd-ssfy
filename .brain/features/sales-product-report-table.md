# Sales Product Report Table

## Status
Migrated on 2026-06-16 as part of the tables-2 sales-orders standard migration.

## Routes
- `/sales-book/top-selling-products`
- `/product-report`
- `/sales-book/top-selling-products/[id]` remains a redirect into the existing `productId` filter flow.

## Current Implementation
- Table module: `apps/www/src/components/tables-2/sales-statistics/*`
- Existing query: `sales.getProductReport`
- Existing filters: `productReportFilterParams`, `loadProductReportFilterParams`, and `useProductReportFilters`
- Existing header/search: `ProductReportHeader` and `ProductReportSearchFilter`
- Table settings id: `sales-statistics`
- View modes: persisted `table` / `grid` preference through the shared table settings cookie.
- Product source: `sales.getProductReport` only reports enabled step components (`DykeStepProducts.deletedAt = null`, no archived custom-component `meta.deletedAt`) under live steps with order-backed sales usage, so disabled/deleted step components and quote/deleted-order usage do not appear as report products.
- Default ordering: `sales.getProductReport` sorts computed report rows by sales usage count descending, then units descending, with product name and id as stable tie-breakers before applying cursor pagination.

## Migration Notes
- No product-report `*V2` query, new filter param, filter metadata endpoint, or `/v2` route was added.
- `apps/www/src/components/tables-2/core/*` was not modified.
- The table uses typed TanStack columns, stable product row ids, persisted column settings, virtualized rows, and the existing infinite `sales.getProductReport` query.
- The product-report header exposes a grid/table toggle beside the table settings button. Grid mode uses `components/tables-2/core/TableGrid` with product cards backed by the same TanStack rows and infinite `sales.getProductReport` data.
- Product image cells normalize existing Cloudinary-style image values locally so the table avoids importing the heavier sales-form `ProductImage` dependency.
- Product grid cards reuse the same product image source resolver as table cells to avoid relative image requests.
- Legacy files under `apps/www/src/components/tables/sales-statistics/*` were removed after import scans found no remaining consumers.

## Validation
- 2026-06-19 query hardening: focused Biome check passed for `apps/api/src/db/queries/product-report.ts`; scoped `git diff --check` passed for the touched query file. No dev server, browser smoke, broad typecheck, or build was run.
- 2026-06-17 grid update: scoped `git diff --check` passed for the touched table settings, product-report header, tables-2 core/grid, sales-statistics, and Brain files. No build, typecheck, browser, or dev-server validation was run.
- Focused Biome passed for the touched routes, header, table settings/config, and new table files.
- Full `@gnd/www` typecheck remains blocked by existing workspace baseline errors; filtered output had no diagnostics for this product-report slice.
- Import scan found no remaining references to the deleted legacy sales-statistics table folder.
- In-app Browser and HTTP smoke covered `/sales-book/top-selling-products`, `/sales-book/top-selling-products?q=door`, and `/product-report`.
