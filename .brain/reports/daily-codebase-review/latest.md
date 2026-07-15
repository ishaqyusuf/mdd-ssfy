# Latest Daily GND Codebase Review

Latest report: [2026-07-15](./2026-07-15.md)

## Executive Summary

Today's review found one meaningful improvement and the same highest-risk release blockers. The active dealership work narrows the dealership app's local tRPC route to `dealershipAppRouter` with only `dealerPortal` and `google`, which reduces the earlier risk of the dealer deployment tracing the full internal API router. That improvement does not close the broader authorization concern because high-value operational routes in the main API still use `publicProcedure` for dispatch, HRM, settings, notes, sales, inventory, jobs, community, and customer mutations.

The riskiest operational gap remains dealer quote mutability after a quote-to-order request starts. Dealer UI disables duplicate `Request order` actions for pending/approved/rejected requests, but still renders `Edit`, and `saveDealerPortalQuote` updates any dealer-owned quote by id without checking the current request state. For door manufacturing, this can change dimensions, line items, pricing, delivery terms, or customer profile data after the office has started approval or payment handoff.

Inventory correctness is still not release-clean by Brain evidence. The active cutover remains blocked by `needs_backfill`, `20449` missing sales, `9` shipment/allocation drift rows, `1` skipped comparison, `hasMore=true`, and next cursor `208`. Repairs remain stopped by user request, so this automation did not run repair dry-runs, applies, migrations, data syncs, or evidence commands.

Broad typecheck failed today in `@gnd/documents` with NodeNext extensionless-import errors, missing `Buffer` type availability, and implicit provider callback parameter types. That keeps shared document confidence low for quotes, invoices, dealer documents, dispatch proof, employee documents, and future WhatsApp/SMS document delivery.
