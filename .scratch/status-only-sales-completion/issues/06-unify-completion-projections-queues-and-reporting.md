# Unify completion projections, queues, filters, counters, and reporting

Type: implementation
Status: ready-for-agent
Label: ready-for-agent
Blocked by: [`05-preserve-full-workflow-provenance-and-cancellation.md`](05-preserve-full-workflow-provenance-and-cancellation.md)
Parent: [`../map.md`](../map.md)
Source specification: [`../spec.md`](../spec.md)

## Outcome

Every affected GND consumer uses one normalized completion projection. Order-level
pending-completion queues honor Administrative Completion, while operational
inventory, dispatch, packing, proof, tax, accounting, and workflow-volume
consumers continue to use canonical evidence.

## Deliverables

1. Replace affected raw `SalesStat` percentage, numeric, status-string, and
   page-local milestone interpretations with the shared resolver.
2. Align Sales list/detail, Production, Fulfillment, filters, counters, actions,
   and history with completion satisfaction and explicit disposition/provenance.
3. Remove administratively completed orders from only the applicable order-level
   pending Production/Fulfillment Completion queues.
4. Preserve operational backlog, dispatch, inventory, packing, proof,
   tax-recognition, accounting, exception, and workflow-volume authorities.
5. Make operational reports exclude Status-only records by default and make
   intentional administrative reporting distinguish method, effective date, and
   recorded date.
6. Add cross-query parity, filter/count, report, and regression tests.

## Acceptance criteria

- Specification scenarios 14, 18, and 21 pass across all affected consumers.
- No affected page reconstructs completion from raw rows or percentage 100.
- Order-level completion counts reconcile with their lists.
- Operational reports and queues are unchanged by Status-only records unless
  they explicitly opt into administrative completion data.
- Unknown effective dates remain null and never fall back to recording dates.

## Required checks

- Cross-query/list/detail/filter/count parity tests.
- Sales dashboard/reporting and tax-recognition regressions.
- Fulfillment, dispatch, inventory, production, and Sales Overview regressions.
- Relevant API/Dashboard/Sales typechecks and builds.
- `git diff --check` for the review unit.

## Boundaries

- Do not reinterpret canonical Fulfilled or operational terminal states.
- Do not hide unresolved operational work merely because completion is satisfied.
- Do not change unrelated report definitions.

