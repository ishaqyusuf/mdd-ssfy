# Tables-2 Responsive Full-Width Layout

## Purpose

All virtualized `tables-2/core` tables consume their available width without
changing compact column preferences, sticky behavior, horizontal scrolling,
virtualization, reordering, resizing, visibility, or saved table settings.

## Core Contract

- `TableConfig.fillColumnId` is required and is either a semantic data column ID
  or `null` for an intentionally fixed compatibility table.
- The configured visible data column grows from its saved/configured base width.
- Only the resolved fill column drops its rendered `maxWidth` cap.
- Hidden/removed preferred columns fall back to the last visible resizable data
  column, then the last visible non-action data column.
- Actions, Select, Selected, and drag/reorder handles are excluded from fallback.
- Actions grows only when no usable data column exists.
- Header, virtual row, and skeleton boundaries use the same shared rule.
- A sticky fill column must be the final left-sticky column.

## Registered Fill Columns

### Sales and customers

- `sales-orders`: `customerName`
- `sales-quotes`: `displayName`
- `customers`: `address`
- `customer-transactions`: `description`
- `customer-pay-portal`: `order`
- `customer-sales-list`: `order`
- `customer-sales-workspace`: `customer`
- `customer-overview-sales-preview`: `reference`
- `customer-statement-report`: `customer`
- `customer-statement-lines`: `address`
- `dealers`: `dealer`
- `packing-list`: `address`
- `shelf-items`: `product`
- `sales-email-ledger`: `subject`
- `legacy-square-payment-orders`: `billing`
- `sales-rep-design-activity`: `customer`
- `sales-rep-commission-payments`: `paidTo`
- `sales-rep-commissions`: `paidTo`
- `sales-dispatch`: `customer`
- `inbound-management`: `customer`
- `sales-inbounds`: `order`
- `sales-accounting`: `description`
- `sales-resolution`: `customer`
- `sales-production`: `customer`
- `sales-statistics`: `productName`
- `customer-service`: `description`

### Community, jobs, and payments

- `builder-form-tasks`: `task`
- `job-scope`: `task`
- `new-job-install-tasks`: `task`
- `unit-invoice-form-tasks`: `task`
- `community-model-cost-form-tasks`: `task`
- `community-install-cost-form-tasks`: `task`
- `contractor-jobs`: `description`
- `contractor-payouts`: `paidTo`
- `contractor-payout-overview-jobs`: `location`
- `payment-dashboard-contractors`: `lastProjectTitle`
- `payment-dashboard-recent-payments`: `contractor`
- `payment-portal-jobs`: `details`
- `community-projects`: `project`
- `project-units`: `project`
- `community-builders`: `builder`
- `community-templates`: `model`
- `community-install-costs`: `task`
- `unit-invoices`: `project`
- `unit-productions`: `projectTask`

### HR, settings, and operations

- `role-form-permissions`: `permission`
- `employee-form-permissions`: `permission`
- `employees`: `employee`
- `roles`: `role`
- `employee-profiles`: `profile`
- `site-actions`: `activity`
- `short-links`: `target`
- `task-events`: `latestResult`
- `task-run-diagnostics`: `message`
- `task-event-history`: `meta`
- `document-approvals`: `document`
- `bug-reports`: `report`
- `bug-report-access-employees`: `employee`
- `notification-channels`: `channel`
- `master-password-logins`: `user`
- `user-logged-in-devices`: `device`
- `transaction-overview-applications`: `invoice`
- `transaction-overview-payments`: `description`

### Inventory

- `inventory-product-form-variants`: `variant`
- `inventory-product-form-sub-components`: `category`
- `inventory-products`: `product`
- `inventory-categories`: `description`
- `inventory-suppliers`: `address`
- `inventory-import`: `category`
- `inventory-allocations`: `orderComponent`
- `inventory-variants`: `variant`
- `inventory-backorders`: `line`
- `inventory-inbounds`: `linkedOrders`
- `inventory-partial-shipments`: `line`
- `inventory-dispatch-mode`: `line`
- `inventory-production-plan`: `line`
- `inventory-kind-review`: `evidence`
- `inventory-stock-audit`: `category`
- `inventory-item-variants`: `attributes`
- `inventory-item-stocks`: `supplier`
- `inventory-item-movements`: `reference`
- `inventory-item-inbound-demands`: `assignment`
- `inventory-item-allocations`: `sale`
- `inventory-item-related-lines`: `line`

## Fixed Compatibility Grids

These nine configurations use `null` and remain on `LegacyFormDataTable` with
`table-fixed`: `door-suppliers`, `clean-code-door-size-select-lines`,
`sales-form-takeoff-hpt-lines`, `sales-form-hpt-lines`,
`sales-form-moulding-lines`, `clean-code-sales-form-moulding-lines`,
`sales-form-service-lines`, `clean-code-sales-form-service-lines`, and
`sales-form-shelf-items`.

## Acceptance Evidence

- Registry audit: 84 non-null core mappings, nine null legacy mappings, every ID
  present in its columns source, and every sticky fill last in its sticky list.
- Adoption audit: all 79 virtualized data tables pass `fillColumnId` and all 79
  corresponding headers use the shared layout helper.
- Focused core tests cover preferred, hidden, reordered, excluded, and no-data
  resolution plus base/max-width behavior.
- Browser proof on `/sales-book/orders` at 760, 1280, 1440, and 1920 pixels shows
  one matching fill header/body cell, zero-pixel edge drift, no document overflow,
  table-owned narrow overflow, and `scrollWidth === clientWidth` at 1920 pixels.
