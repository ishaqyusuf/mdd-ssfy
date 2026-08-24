# ADR: Intercepted Driver Stop Workspace

## Status

Accepted.

## Context

Route Command is the driver dashboard's approved visual base. Selecting a stop
must preserve dashboard filters, search, scroll, and browser history while
providing enough room for Overview, manifest items, activity, help, proof, and
the approved Packing Command Sheet. The selected stop must first render the
approved Design A packing dashboard. Its Pack Items action must reuse the
existing admin packing form side sheet rather than replace the dashboard or
create a driver-only form. A normal route navigation would discard the
driver's command-center context.

## Decision

Represent every selected stop with the canonical URL
`/sales-book/dispatch-task/[dispatchId]` and render it in two contexts:

- soft navigation from Dispatch Tasks is intercepted through the `@modal`
  parallel route and displayed as a full-page modal over the retained dashboard;
- refresh or direct navigation renders the same shared stop workspace as a
  standalone page.

Stop subflows are URL-owned with `mode=details|packing|proof|help`. The default
details mode renders Design A's packing progress metrics, manifest rows,
destination, readiness gates, and stop activity in one dashboard. Packing mode
keeps that dashboard mounted underneath and opens the existing Sales Overview
packing form as a right-side sheet on desktop and a full-width sheet on mobile.
The form continues to use the canonical provider, guarded availability plan,
mutation, permission boundary, and invalidation rules. No driver-only packing
contract is introduced.

## Consequences

- Back and Close return to the exact dashboard history entry without rebuilding
  a parallel local selection state.
- Deep links and refresh remain valid outside the modal interception context.
- Desktop and mobile share one stop component tree and lifecycle contract.
- Closing the packing sheet returns the URL to `mode=details` without closing
  the selected stop or losing route context.
- Packing cache invalidation refreshes the selected manifest, driver queue,
  authoritative summary, and existing dispatch overview surfaces.
- The packing sheet owns its own scroll region while its Cancel/Pack footer
  remains visible. The Design A dashboard stays visible beneath the desktop
  overlay and resumes at the same scroll position when the sheet closes.
- Adding the parallel route requires a Next development-server restart when the
  route tree is introduced during an already-running session.

## Alternatives

- Replace Design A with an inline packing form: rejected because it erases the
  approved stop dashboard and makes the selected design visually absent.
- Clone the packing form for drivers: rejected because it would create a second
  packing authority and duplicate guarded quantity behavior.
- Navigate only to a standalone stop page: rejected because it loses the route
  dashboard's immediate context and makes returning more expensive.
- Store selected stop and subflow only in React state: rejected because refresh,
  deep links, browser history, and server composition would be unreliable.

## Related Records

- `.brain/decisions/ADR-065-route-command-as-driver-dashboard-visual-base.md`
- `.brain/plans/2026-08-23-feature-driver-dashboard-command-center.md`
- `.brain/features/driver-platform-revival.md`
