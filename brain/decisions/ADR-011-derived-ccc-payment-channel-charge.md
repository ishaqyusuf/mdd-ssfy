# ADR-011: Derived CCC Payment Channel Charge

## Status
Accepted

## Date
2026-06-24

## Context
Credit-card convenience charge (C.C.C) was previously treated like an order charge in parts of the sales form and print stack. That made print/PDF/preview capable of showing a C.C.C row while the displayed grand total, saved `SalesOrders.grandTotal`, and payment-time charge calculation could drift.

The newer payment flow calculates C.C.C when a card/link/terminal payment is selected. Persisting the preview amount on the order would duplicate payment-channel behavior and make partial payments ambiguous.

## Decision
C.C.C is a derived payment-channel charge, not a stored order charge.

Sales order persistence keeps `SalesOrders.grandTotal` and `SalesOrders.amountDue` as base sales totals excluding the derived C.C.C amount. Order metadata retains the selected payment method, `ccc_percentage`, and a display/backfill `ccc` amount so sales form, overview, list, print, preview, and payment surfaces can evaluate a payable/display total consistently without mutating principal totals.

Returned and hydrated sales-form summaries may include derived C.C.C in `summary.ccc` and `summary.grandTotal` for display. If `meta.ccc` is missing or zero while the selected payment method applies C.C.C, display surfaces derive a fallback C.C.C from the base total and configured percentage. Print/PDF data derives displayed invoice totals from the stored base total plus the applicable payment-channel C.C.C. Actual charged C.C.C belongs to the payment/checkout/terminal transaction metadata or ledger, where the payment amount and channel are known.

## Consequences
- New sales-form saves persist display C.C.C in root order metadata, but not in the stored order grand total.
- Print and PDF preview can show C.C.C and a C.C.C-inclusive displayed invoice total without mutating the order.
- Sales lists and form summaries can show base total plus C.C.C while sorting, amount due, and accounting principal stay base-only.
- Payment remains authoritative for actual charged fees, especially for partial card payments.
- Legacy order hydration keeps stored totals for records without enough line data to recompute a display summary.
