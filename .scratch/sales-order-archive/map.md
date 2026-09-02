# Wayfinder: Reversible Sales Order Archive Workspace

## Local Scratch Tracker

This map and its child decision tickets use the repository's local Markdown
tracker. It supersedes the un-commented GitHub map created earlier in the same
planning session; the GitHub issues remain untouched.

## Destination

Produce an implementation-ready specification and tracer-bullet ticket set for
a reversible Sales Order archive. The default Sales Orders workspace excludes
archived orders, while the existing filter experience exposes
`Show > Archived`, without reusing Sales Bin deletion or changing commercial,
production, payment, dispatch, fulfillment, inventory, or accounting state.

## Notes

- Domain: GND Sales Orders across dashboard, shared API, and mobile consumers.
- Use the canonical terms Sales Order, Archived Sales Order, Sales Bin, and
  Sales Order lifecycle.
- Archive is a reversible workspace-visibility state, distinct from
  `deletedAt` and every lifecycle status.
- Respect the guarded `sales.getOrders` read-model compatibility contract in
  ADR-061.
- Keep list, summary, saved tabs, filtered export, mobile defaults, and
  projected/legacy query paths aligned.
- The approved comments on all four child decision tickets are the review input
  for [`spec.md`](./spec.md).

## Decisions so far

<!-- Approved pipeline comments remain canonical on the child decision files. -->

## Not yet specified

None. The approved child-ticket comments cover the known archive-state,
operator-control, query, evidence, projection, and validation decisions.

## Out of scope

- Automatic retention or time-based archival.
- Physical deletion or replacement of Sales Bin.
- Changes to payment, production, dispatch, fulfillment, inventory, or
  accounting lifecycle semantics.
- Retrospective bulk archival of existing orders during deployment.
- Mobile archive/restore controls or a mobile Archived filter.

