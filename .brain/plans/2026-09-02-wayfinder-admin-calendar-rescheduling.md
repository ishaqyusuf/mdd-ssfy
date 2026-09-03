# Wayfinder: Admin Calendar Rescheduling

## Status

Charted locally on 2026-09-02 and merged on 2026-09-03 into Canonical Sales
Pipeline implementation Ticket 16. The original map and six draft child
tickets remain source history; they are not a second execution queue.
Application behavior is implemented through canonical Ticket 16 at 14/15; no
external tracker issue was created, and authenticated multi-viewport browser
acceptance remains.

## Tracker

- Source map: `.scratch/admin-calendar-rescheduling-wayfinder/map.md`
- Canonical ticket:
  `.scratch/sales-pipeline-lifecycle-implementation/issues/16-confirmed-production-fulfillment-calendar-rescheduling.md`
- The six original child tickets are marked superseded because their approved
  scope is consolidated into the canonical implementation queue.

## Destination

Produce a reviewed specification and dependency-ordered local implementation
tickets for safe admin drag-and-drop rescheduling in Sales Production and
Fulfillment calendars.

## Approved Charting Direction

- Reuse the existing DOM calendars and installed `@dnd-kit/core`; do not use
  Chart.js or replace the calendar system.
- Production moves target the exact visible order/date assignment group.
- Mixed completed/incomplete Production groups fail closed and are not
  draggable.
- Production workers remain read-only.
- Fulfillment locks in-transit, fulfilled, and cancelled Dispatches.
- Past dates remain available behind an explicit warning.
- Confirmed schedule changes produce attributable evidence and notify affected
  workers or the current driver.
- Keep all Wayfinder, specification, and implementation-ticket artifacts local
  under `.scratch`; do not publish GitHub issues.

## Next Step

Complete authenticated desktop, tablet, and mobile browser verification for
canonical Ticket 16, then close it and continue the remaining production
cutover gates. Keep the source map immutable except for merge pointers, and
record acceptance evidence in the canonical ticket.
