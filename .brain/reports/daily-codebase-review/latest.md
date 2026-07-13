# Latest Daily GND Codebase Review

Latest report: [2026-07-13](./2026-07-13.md)

## Executive Summary

Today's review found the same core operational risks as the recent daily runs, with one changed validation detail: broad typecheck now stops first in `@gnd/app-store` because the package cannot resolve the `node` type definitions. The older `@gnd/documents` failures may still exist, but today's broad run did not get that far.

The highest-risk product gap remains inconsistent authorization on operational tRPC routes. Dispatch, settings, notes/notification-channel, and several sales mutations still expose high-value actions through `publicProcedure`. Some handlers do local `ctx.userId` checks, but the route surface is not consistently protected or permissioned, which is risky for mixed-skill office/admin teams because accountability is not obvious at the API boundary.

Dealer quote request state is still not a hard edit boundary. The dealer quote table disables duplicate order requests after a quote is pending/approved/rejected, but still exposes `Edit`; the dealer quote save path updates any dealer-owned quote by id/type without checking request status. That can change dimensions, pricing, or profile selection after office approval review has started.

Inventory correctness remains explicitly not release-clean by Brain evidence. The latest active cutover state is still `needs_backfill` with `20449` missing sales, `9` shipment/allocation drift rows, `1` skipped comparison, `hasMore=true`, and next cursor `208`. Repairs remain stopped by user request, so no repair dry-runs or applies were run.

Mobile dispatch completion has good signature/photo affordances, but proof upload is client-orchestrated before final completion. A driver with weak network can partially upload photos/signature, fail the final task, and have no durable local retry bundle tying proof and completion into one auditable unit.
