# ADR: Route Command As Driver Dashboard Visual Base

## Status

Accepted.

## Context

The driver dashboard design exploration produced three responsive directions
that share the same queue, manifest, readiness, lifecycle, proof, and weak-
network contract. A single visual base is needed before production component
work can establish stable hierarchy, tokens, responsive behavior, and review
criteria.

## Decision

Use Option A, Route Command, exactly as shown as the visual base for the planned
driver dashboard. It combines the calm summary strip of Sales Finance with the
focused attention, activity, and next-action hierarchy of the Sales Rep
dashboard. No elements from Dispatch Ledger or Field Focus are approved for
remixing at this stage.

The design direction was approved first. The user explicitly authorized
implementation on 2026-08-23, after which the responsive web slice was built at
the existing Delivery-role route without mixing in Options B or C.

## Alternatives

- Dispatch Ledger: stronger load-sheet density and exact quantity scanning, but
  less suitable as the default broad driver experience.
- Field Focus: stronger phone-first and dark-field emphasis, but less aligned
  with the existing Dashboard visual system.
- Route Command with remixed elements from B or C: not selected because the
  approved request was Option A as shown.

## Consequences

- Production design work has one clear visual source of truth.
- Desktop, tablet, and mobile must preserve Route Command's summary, next-stop,
  attention, route, and activity hierarchy.
- The shared server-owned product contract remains unchanged.
- The responsive web implementation follows Route Command exactly as the visual
  base and preserves the server-owned driver lifecycle contract.
- Later visual changes require explicit feedback and an update to this decision
  or a superseding ADR.

## Implementation Notes

- Approved prototype:
  `/Users/M1PRO/.gstack/projects/gnd/designs/driver-dashboard-system-20260823/variant-a-route-command.html`.
- Approved desktop and mobile evidence are stored beside the prototype as
  `driver-a-desktop.png` and `driver-a-mobile.png`.
- Follow `.brain/plans/2026-08-23-feature-driver-dashboard-command-center.md`
  for role routing, lifecycle safety, proof recovery, testing, pilot, cutover,
  and rollback requirements.
