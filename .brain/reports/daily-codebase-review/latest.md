# Latest Daily GND Codebase Review

Latest report: [2026-08-11](./2026-08-11.md)

## Executive Summary

This was a read-only operational codebase review for the GND monorepo. The workspace still has no top-level `brain/` directory, so this report uses `.brain/` as the active project Brain and stores the daily report under `.brain/reports/daily-codebase-review/`. The requested `apps/www` and `apps/expo-app` scope maps to the current `apps/dashboard` and `apps/mobile` workspaces; I reviewed those along with `apps/dealership`, `apps/api`, and the requested shared packages.

The strongest current risk remains operational task control. `apps/api/src/trpc/routers/task-trigger.route.ts` still exposes generic Trigger task execution and run status through `publicProcedure`, while `apps/api/src/trpc/routers/task-events.route.ts` exposes list/get/update/history/runNow/runTest/runStatus through `publicProcedure`. Mobile dispatch start, cancel, and packing still call the generic public `taskTrigger` path, even though `apps/api/src/trpc/routers/dispatch.route.ts` now has protected, assignment-aware dispatch mutations. That leaves two competing operational paths with different safety contracts.

Today also surfaced a concrete dashboard dispatch bug candidate: `apps/dashboard/src/hooks/use-sales-packing.ts` calls the protected `dispatch.cancelDispatch` mutation in one handler but sends a `startDispatch` payload instead of `cancelDispatch`. Runtime wiring was not exercised, but the hook is exported to the dispatch packing overview context, so this should be treated as a high-risk dispatch workflow defect until proven unreachable.

Customer/payment boundary risk remains. `customers.getCustomerPayPortal` is public and account-number keyed, and it returns pending sales, wallet, recent payment method, terminals, terminal errors, wallet balance, and last terminal id. The checkout router still exposes payment initialization, link creation, payment verification, quote acceptance, and device-code generation as public procedures. Some public customer payment entry points are legitimate, but this boundary is too broad for revenue, customer privacy, and fraud-resistant payment handling.

There is also a Brain/source contract mismatch around sales order adjustments. `.brain/features/in-form-sales-order-adjustments.md` describes customer approval links and token-scoped customer approval, while the current source intentionally uses authenticated sales-representative approval without a customer link and has a regression test asserting that no customer approval link exists. This may be an accepted product pivot, but the Brain and UI language need to be reconciled before operators are trained.
