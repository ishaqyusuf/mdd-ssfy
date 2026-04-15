# WWW Performance Validation Checklist

Date: 2026-04-15
Scope: Post-optimization validation for active `apps/www` routes.

## Purpose
After route and client-runtime optimization, validate the experience in live navigation before declaring the module stable.

This checklist exists to prevent two failure modes:
- broad implementation work gets marked done without validating the highest-traffic routes
- teams resume adding heavy client startup work because the original hotspots are no longer visible in code review alone

## Highest-Traffic Validation Shortlist
- `/community/templates`
- `/community/builders`
- `/sales-book/orders`
- `/sales-book/productions`
- `/sales-form/create-order`
- `/hrm/employees`
- `/contractors/jobs/payments`

## Route Validation Steps
For each route on the shortlist:

1. Load the route from a fresh navigation state.
2. Confirm page shell appears quickly.
3. Confirm first visible data is present without an obvious cold-fetch lag.
4. Confirm filter/header controls do not visibly “pop in” after the page body.
5. Confirm hidden UI is not causing obvious startup delay.
6. Interact once with the main surface:
   - open a row
   - change a filter
   - open a modal or sidebar
   - switch a tab if applicable
7. Record whether the route feels:
   - good
   - acceptable but still heavy
   - still slow

## If A Route Still Feels Slow
Do not immediately add more route prefetch.

Instead, classify the cause:
- `client-runtime`: large editor/table/dashboard surface still mounts too much
- `filter-startup`: search/filter metadata or control logic still loads too late
- `hidden-ui`: closed modal/sidebar/sheet code still sits in the initial path
- `query-duplication`: route hydrates, but client still triggers avoidable duplicate queries
- `interaction-cost`: initial load is fine, but the first interaction feels heavy

Then apply only the smallest targeted fix.

## Measurement Notes
When possible, capture:
- time until shell is visible
- time until first real table rows or summary data appear
- obvious duplicate client queries after hydration
- whether the route remains responsive during first interaction

This does not need a heavy benchmarking framework to start. A simple route-by-route note is enough to catch regressions early.

## Completion Rule
The linked-route optimization pass can be considered stable only when:
- the shortlist routes are validated in live navigation
- no route on the shortlist has an unclassified slowness issue
- any remaining slowness has an explicit owner and next action

## Follow-up Priority
If validation still finds hotspots, prioritize in this order:
1. `/sales-form/create-order`
2. `/sales-book/productions`
3. `/community/builders`
4. any newly discovered regression on the shortlist
