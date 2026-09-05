# Production filter read cost

## Bounded optimization — 2026-09-05

`getSalesProductionFilters` reads Assigned To options directly from `users`,
selecting only `id` and `name`. It no longer calls the employee-management
loader, counts employees, loads personnel documents/profiles/permission grants,
or seeds permission definitions while preparing Production filter options.
Independent sales-option and worker-option reads run concurrently.

Compatibility is deliberate: the existing `whereEmployees` Production role
predicate, non-revoked access, `deletedAt: null`, alphabetical name order,
default `queryMeta` skip 0/take 20, empty-label exclusion and string IDs remain.
This does not repair the historical first-20 option limitation. Existing role
relation semantics, inherited customer/phone/PO/representative/order/item
options, filter colors, and query input shapes are unchanged.

There is no new cache, schema/index, status logic, permission grant, background
job, or database repair. The already identified public filter-route permission
gap remains separately gated; this slice does not claim to resolve it.

## Evidence and limits

The real filter/database seam first failed because the old loader attempted
permission creation. The independent-read test separately failed before
concurrency was introduced. Three focused regressions cover read-only narrow
selection and literal output, independent progress, and worker-error propagation.
The API suite passes 724/724 with process-local dummy test secrets; API and
focused test semantic compilers pass. Earlier missing `ENC_SECRET_KEY` test
failures and option-helper/fetch-stub type diagnostics were corrected before
the final runs. No environment file was changed.

Two live traces matched by trace ID place filter settlement at 7705/6504ms
after page entry, with summary last at 8753/7840ms. A separate untraced GET
reproduces the 15-second timeout after a 9551ms post-proxy/pre-page gap.
Thus query-work removal is proven structurally, not yet as a deployed latency
gain or startup fix. Temporary probes remain until final diagnosis/verification.

Canonical progress and exact artifacts:
`.scratch/sales-pipeline-lifecycle-implementation/issues/14-cutover-and-retirement.md`.
Ticket 14 remains 9/13; the 5% production rollout is unchanged.
