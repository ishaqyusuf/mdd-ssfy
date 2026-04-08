# Community Unit Invoice Reporting

## Goal
- Turn `/community/unit-invoices` into a reporting-capable finance and operations workspace where invoice data can be filtered once and reused across printable reports, future exports, and summary widgets.

## Scope
- In scope
  - Shared reporting architecture for community unit invoices.
  - Filter-aware invoice reports that reuse the same query contract as `/community/unit-invoices`.
  - Printable PDF report routes under `/p/community-invoice/*`.
  - Dedicated backend report queries separate from the base invoice table query.
- Out of scope
  - XLSX/CSV exports.
  - Scheduled report delivery.
  - Customer-facing invoice statements.
  - AR ledger/accounting-system sync.

## Flow
1. Entry
- User opens `/community/unit-invoices`.
- User applies standard invoice filters through the existing `SearchFilter` header.
- User opens `Report` from the header and chooses a report type.

2. Main actions
- Header action launches a tokenized public print route for the selected report.
- The print route rebuilds the report server-side using the shared invoice filters.
- The PDF document renders a printable summary and detail layout.

3. Success/failure outcomes
- Success
  - Report uses the same filters as the invoice page.
  - Report opens as a dedicated PDF page.
  - If no filters are active, the user gets an explicit alert before running a system-wide report.
- Failure
  - Invalid date/filter payloads should fail safely without crashing the page.
  - Empty reports should render a valid printable state, not a runtime error.

## Data Model
- Key entities
  - `Homes` as the unit/invoice summary grain.
  - `HomeTasks` as the task-level invoice detail grain.
  - `CommunityModels` / `communityTemplate` for model context.
  - `Project` / `Builder` for grouping and reporting dimensions.
- Important fields
  - Unit summary: `id`, `createdAt`, `lotBlock`, `modelName`, `project.title`, `project.builder.name`
  - Task detail: `taskUid`, `taskName`, `amountDue`, `amountPaid`, `checkNo`, `checkDate`, `createdAt`
  - Derived report metrics: `openBalance`, `chargeBack`, `jobCount`, `invoiceTaskCount`, aging bucket

## APIs
- Built
  - `community.getUnitInvoices`
    - main list page query
  - `community.getUnitInvoiceForm`
    - invoice edit modal query
  - `community.saveUnitInvoiceForm`
    - invoice edit mutation
  - `community.getUnitInvoiceAgingReport`
    - dedicated report query in `apps/api/src/db/queries/unit-invoice-reports.ts`
  - `print.communityInvoiceAgingReport`
    - tokenized public print route for aging PDF
- Shared helpers
  - `whereUnitInvoices`
    - exported so reports can reuse the same base invoice filter contract
  - `transformFilterDateToQuery`
    - shared date-range parser used by invoice/report filters

## UI
- Built
  - `/community/unit-invoices`
    - standard `SearchFilter` header
    - `Report` dropdown in header
  - `/p/community-invoice/ageing-report`
    - printable PDF page for invoice aging
- Built report surfaces
  - `Invoice Aging Report`
    - PDF-based
    - uses current unit-invoice filters
    - warns before running across all invoices when no filters are selected
  - `Task-Level Invoice Detail Report`
    - PDF-based
    - grouped by project
    - units sorted by `lot` then `block`
    - uses compact summary grids for overall, project, and unit rollups
    - task rows show `Task`, `Task Date`, `Cost`, `Tax`, `Due`, `Paid`, `Open`, `Check No`, and `Check Date`
- Current architecture pieces
  - `apps/www/src/lib/unit-invoice-report-print.ts`
  - `apps/www/src/hooks/use-community-invoice-print-filter.ts`
  - `apps/www/src/components/print-community-invoice-aging-report.tsx`
  - `apps/www/src/components/print-community-invoice-task-detail-report.tsx`
  - `packages/pdf/src/community-invoice-aging/document.tsx`
  - `packages/pdf/src/community-invoice-task-detail/document.tsx`
  - `apps/api/src/db/queries/unit-invoice-reports.ts`

## Edge Cases
- Invalid date presets
  - Shared parser must accept both singular and plural preset strings like `last 6 month` / `last 6 months`.
- Empty filters
  - Running an unfiltered report should require explicit confirmation because it spans the full system invoice set.
- Sparse or unusual payment data
  - Negative `amountPaid` values must be preserved as chargebacks.
  - Missing `checkNo` / `checkDate` should not break report rendering.
- Data duplication
  - Invoice edit flow already dedupes duplicated task rows; detail reports should avoid double-counting those rows if they rely on raw task data.

## Built
- Implemented the first report type: `Invoice Aging Report`.
- Moved the aging report off the in-app modal path and onto the dedicated printable route `/p/community-invoice/ageing-report`.
- Ensured the aging report uses the same invoice filters as `/community/unit-invoices`.
- Added an alert-dialog confirmation when users try to run the report without any filters.
- Fixed shared date-range parsing so preset values like `last 6 months` no longer crash invoice/report filtering.
- Implemented the second report type: `Task-Level Invoice Detail Report`.
- Added the dedicated printable route `/p/community-invoice/task-detail-report`.
- Built task-detail reporting on `HomeTasks` so the report is task-grain and grouped by project with unit-level sections.
- Added compact vertical summary grids for report, project, and unit totals to reduce print whitespace.
- Standardized invoice report launching so multiple report types can share the same header dropdown and no-filter confirmation flow.

## Planned Report Types
- `Unit Invoice Summary Report`
  - One row per unit with project, builder, due, paid, open balance, production/install context, and task count.
  - Primary use: management overview and export parity with the page.
- `Payment Register Report`
  - Group or sort by check number / check date across task payments.
  - Primary use: payment reconciliation and audit.
- `Builder Payables Report`
  - Group open balances by builder.
  - Primary use: finance/ops rollup.
- `Project Payables Report`
  - Group open balances by project.
  - Primary use: PM/community ops review.
- `Chargeback / Exception Report`
  - Highlight negative paid values, missing payment references, and other anomalies.
  - Primary use: exception handling and cleanup.

## Follow Up
- Add reusable CSV/XLSX export once aging and task-detail report definitions are stable.
- Add summary widgets for invoice-report rollups once reporting definitions are locked.
