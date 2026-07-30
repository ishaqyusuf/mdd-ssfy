# ADR-038: Sales Reporting Surface Boundaries

- Status: Accepted
- Date: 2026-07-30

## Context

The legacy Sales Dashboard mixed unauthenticated reads, inconsistent date
filters, stored balance fields, and fixed 30-day widgets. The planned Sales
Finance replacement already owns canonical collections, refunds,
reconciliation, and receivables. A redesign needed actionable operational
reporting without creating a second finance ledger or another order-detail
surface.

## Decision

Use three bounded surfaces:

1. A fixed `/sales-dashboard` for the operational overview.
2. A customizable `/sales-book/reports` for sales-performance analysis and
   links to governed report producers.
3. The existing `/sales-book/finance` as the only canonical finance reporting
   workspace.

Both sales-performance surfaces use `@gnd/sales/reporting` for date,
comparison, granularity, and metric definitions, and the protected
`salesDashboard` router for database projections. Finance values are consumed
from Sales Finance contracts rather than recomputed.

Report layout preferences are client presentation state persisted in a
bounded cookie. Period filters and drill-down state remain URL-addressable.
Order drill-down reuses the canonical Sales Overview sheet.

## Consequences

- Dashboard and report cards cannot silently diverge on metric meaning.
- Collections and receivables retain Sales Finance reconciliation and
  permission rules.
- Performance reporting can evolve independently from the fixed operational
  dashboard without duplicating queries.
- Scheduled delivery and document exports remain with their existing governed
  producers until a future requirement justifies a unified report job.
- Organization selection can later extend the shared filter contract once the
  office-organization scope is implemented; this decision does not invent an
  interim organization selector.
