# Bug: Post-Payment Invoice and Packing-Slip Printing Did Not Start

## Date

2026-07-29

## Symptom

Direct payments completed successfully, but the selected invoice or packing slip did not open and no actionable print error appeared.

## Root Cause

- The payment processor did not reserve a print window during the operator's Apply Payment click.
- Printing began only after the asynchronous payment mutation completed, outside the browser-authorized user gesture.
- The completion path could reconstruct print intent from mutable form/query state after submission instead of consuming an immutable submitted request.
- The completion effect did not own a one-time handoff, so rerenders could not prove exactly-once behavior.

## Fix

- Capture cloned sale ids and the selected print mode at submission.
- Reserve one placeholder tab per submitted print request during the Apply Payment gesture.
- Keep invoice plus packing slip as one combined `order-packing` request and one tab.
- Consume the captured request exactly once after confirmed payment.
- Extend the shared client print service/controller with an optional reserved target window while retaining the hidden viewer for all other callers.
- Close reserved tabs on payment failure, cancellation, or print-preparation failure.
- Leave a successful payment intact and show an actionable `Open print` retry when popup reservation or document preparation fails.

No server API, database schema, payment calculation, or document-rendering contract changed.

## Validation

- Focused post-payment orchestration, payment utility, sales-print service, and print-frame suites pass: 55 tests and 130 assertions.
- Targeted Biome and `git diff --check` pass.
- Dashboard typecheck remains blocked by the repository's existing broad TypeScript baseline; the filtered changed-file scan reports only pre-existing diagnostics at untouched locations in `sales-payment-processor.tsx` and `sales-print-service.ts`.
- Authenticated local browser QA used disposable order `09074PC` for a $0.01 cash direct payment with invoice and packing slip selected. Apply Payment immediately produced one `Preparing print...` placeholder and payment settled once. The first document-access preparation failed and exposed `Open print` without reversing payment; the same order's existing manual combined print subsequently resolved access and mounted the hidden viewer, confirming the renderer remained healthy.
