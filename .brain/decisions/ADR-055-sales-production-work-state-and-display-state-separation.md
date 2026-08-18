# ADR: Sales Production Work-State and Display-State Separation

## Status

Accepted

## Context

The Sales Production admin page previously promoted Queue, Material Review,
Calendar, and Completed as equal page tabs. Calendar is a visualization of the
production queue, not an independent operational workflow. Modeling it as a
page tab made navigation less predictable and separated it from the queue
filters it visualizes.

## Decision

Use the Sales Finance workspace structure for the canonical
`/sales-book/productions` page:

- `tab=queue|reviews|completed` owns operational work state.
- `view=table|calendar` owns the Active queue presentation.
- PageTabs render `Active`, `Review`, and `Completed`.
- A toolbar display control switches the Active queue between Table and
  Calendar while preserving shared filters.
- Calendar selection uses the bounded calendar aggregate query and a bounded
  day agenda. Agenda rows open the existing Sales Overview production flow.
- Legacy `tab=calendar`, `date`, and `productionDueDate` links resolve to
  `tab=queue&view=calendar` behavior without introducing a new detail route.

## Alternatives

- Keep Calendar as a fourth PageTab. Rejected because it mixes workflow state
  with presentation state.
- Permanently stack Calendar beside the queue. Rejected because it consumes
  operational table space and loads calendar data when it is not needed.
- Create a separate production calendar route. Rejected because it duplicates
  queue filters, navigation, and Sales Overview opening behavior.

## Consequences

- Operators keep one filter context while changing how Active production work
  is displayed.
- Calendar data remains lazy and month-bounded.
- Review and Completed remain explicit work destinations.
- URL compatibility requires accepting the legacy `calendar` tab value at the
  parser boundary and normalizing it in the shared resolver.
- Calendar is intentionally unavailable as a display mode for Review and
  Completed until those workflows have a verified calendar use case.

## Implementation Notes

- Shared URL normalization lives in
  `packages/sales/src/production-workspace-query.ts`.
- The Finance-aligned header, summary, display control, calendar, and active
  view composition live under
  `apps/dashboard/src/components/sales-production/`.
- The canonical route prefetches only the active work/display view.
