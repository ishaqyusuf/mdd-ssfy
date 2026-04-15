# Link Modules Web Optimization Plan

Date: 2026-04-15
Owner: Web Performance / App Router workstream
Scope: `apps/www` route optimization prioritized by active navigation in `apps/www/src/components/sidebar/links.ts`.

## Objective
Use `linkModules` as the authoritative source for active user-facing route planning, optimize those pages first, and keep routes not represented in `linkModules` in a separate "possibly stale" bucket for later cleanup or review.

## Planning Rule
- Active roadmap scope is defined by reachable routes in `apps/www/src/components/sidebar/links.ts`.
- Pages that exist in `apps/www/src/app/**/page.tsx` but are not represented in `linkModules` should not drive current optimization priority.
- Those non-linked pages must be tracked under `Possibly Stale Pages` for future action.

## Active Areas

### Sales
- Dashboard: `/sales-dashboard`, `/sales-rep`
- Accounting: `/sales-book/accounting`, `/sales-book/accounting/resolution-center`
- Orders: `/sales-book/orders`, `/sales-book/orders/bin`, `/sales-book/orders/v2`
- Quotes: `/sales-book/quotes`, `/sales-book/quotes/bin`
- Sales-book forms: `/sales-book/create-order`, `/sales-book/create-quote`, `/sales-book/edit-order/[slug]`, `/sales-book/edit-quote/[slug]`
- Experimental new-form routes: `/sales-form/create-order`, `/sales-form/create-quote`, `/sales-form/edit-order/[slug]`, `/sales-form/edit-quote/[slug]`
- Production/dispatch: `/sales-book/productions`, `/sales-book/productions/v2`, `/sales-book/dispatch-admin`, `/sales-book/dispatch-task`, `/sales-book/dispatch/v2`, `/sales-book/inbound-management`
- Customers: `/sales-book/customers`, `/sales-book/customers/v2`, `/sales-book/customers/v2/[accountNo]`

### HRM
- Employees: `/hrm/employees`, `/hrm/employees/v2`, `/hrm/employees/v2/[id]`
- Document approvals: `/hrm/document-approvals`
- Jobs/payments: `/contractor/jobs`, `/hrm/contractors/jobs`, `/contractors/jobs/payment-dashboard`, `/contractors/jobs/payment-portal`, `/contractors/jobs/payments`

### Community
- Main lists: `/community/projects`, `/community/project-units`, `/community/unit-productions`, `/community/unit-invoices`, `/community/builders`, `/community/install-costs`
- Templates: `/community/templates`, `/community/community-template/[slug]`, `/community/community-template/[slug]/v1`, `/community/model-template/[slug]`, `/community/template-schema`
- Customer service: `/community/customer-services`

### Production / Jobs
- `/production/dashboard`, `/production/dashboard/v2`
- `/tasks/unit-productions`
- `/jobs-dashboard`, `/jobs-dashboard/payments`

## Possibly Stale Pages
- Route pages present in `apps/www/src/app/**/page.tsx` but not reachable from `linkModules`
- Legacy alternates under `(v1)`, `(v2)`, `(clean-code)` that are not part of the current nav model
- Hidden experiments, old dashboards, old settings pages, unlinked public/print support routes, and dev-only debug pages

## Current Execution Order
1. Shared shell/provider/prefetch/table primitives
2. Community active pages
3. Sales active pages
4. HRM active pages
5. Production / Jobs active pages
6. Sales-form parity and cutover gating

## Community First Slice
Start with active Community surfaces because they are reachable from nav and several still rely on fire-and-forget or empty prefetching:
- `/community/templates`
- `/community/community-template/[slug]`
- `/community/community-template/[slug]/v1`
- `/community/model-template/[slug]`
- `/community/template-schema`
- `/community/projects`
- `/community/project-units`
- `/community/unit-productions`
- `/community/unit-invoices`
- `/community/builders`
- `/community/install-costs`
- `/community/customer-services`

Target behavior:
- await first-paint-critical queries on the server
- hydrate initial query cache before render
- keep heavy form/editor behavior inside client components after hydration

## Community Execution Status

### Completed On 2026-04-15
- Template list/detail surfaces now await their critical queries before render:
  - `/community/templates`
  - `/community/community-template/[slug]`
  - `/community/community-template/[slug]/v1`
  - `/community/model-template/[slug]`
  - `/community/template-schema`
- Community list and operations pages now hydrate first-paint-critical data on the server:
  - `/community/projects`
  - `/community/project-units`
  - `/community/unit-productions`
  - `/community/unit-invoices`
  - `/community/builders`
  - `/community/install-costs`
  - `/community/customer-services`

### Applied Pattern
- Replace fire-and-forget `batchPrefetch(...)` with awaited `queryClient.fetchInfiniteQuery(...)` for first table pages.
- Await summary/analytics queries that are rendered immediately via `useSuspenseQuery` or `useQuery`.
- Wrap active pages in `HydrateClient` when the route depends on hydrated client queries.

### Remaining Community Follow-up
- Verify whether Community detail pages that are not directly listed in `linkModules` should stay in `Possibly Stale Pages` or be promoted back into active scope.
- Add route-level measurements for the active Community surfaces before moving the same pattern into Sales.
