# Define storefront-channel sales and fulfillment parity

**Type:** research

**Status:** implemented

**Blocked by:** Define the shared sales-form storefront surface and exposure
contract; Define checkout promotion into standard Sales Orders

## Question

How should a standard `SalesOrders` record marked as storefront-channel be
assigned, reviewed, filtered, and processed through existing sales, inventory
sync/demand/allocation, production, packing, pickup/dispatch, accounting,
documents, notifications, cancellation, refund, and return workflows while
preserving the customer configuration snapshot?

## Comments

A completed storefront checkout should create a standard order distinguished
by `salesChannel = storefront` or the equivalent canonical source field.

The order should appear in existing office Sales Orders with:

- a visible Storefront source indicator and filter;
- normal customer and address relationships;
- the complete configuration snapshot;
- payment and payment-review state;
- defined sales-rep/team assignment;
- inventory synchronization and allocation;
- production and readiness handling;
- pickup, packing, dispatch, and delivery workflows;
- invoice, receipt, and operational documents;
- notifications, cancellations, refunds, and returns.

Storefront origin should not bypass existing inventory, payment-review,
production, fulfillment, or audit rules. Customer-visible progress should be
projected from canonical operational events.

Existing order records must remain immutable with respect to later catalog or
Dyke configuration changes. Reorder should create a new configuration draft and
revalidate it rather than copying obsolete pricing or availability blindly.
