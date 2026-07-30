# Plan: Cross-System Control Tower And Recommendations

## Type
Evidence-Gated Product Expansion

## Status
Deferred - Activate Only After Sequences 01-08 Acceptance

## Sequence
09

## Created Date
2026-07-30

## Last Updated
2026-07-30

## Goal
Add cross-system operational views only after the owning sales pages and domain
contracts are stable. Avoid duplicating workflows or creating dashboards that
cannot take safe action.

## Activation Gate
- Sequences 01–08 are accepted.
- The operator explicitly activates Sequence 09.
- Cross-stage events, statuses, permissions, ownership, and data quality are
  measured.
- Each proposed capability has a named operator, decision, and source system.

## Candidate Capabilities

### Fulfillment Control Tower
- Show orders blocked between production, packing, dispatch, and delivery.
- Link to the owning page and action; do not mutate foreign state indirectly.

### Customer Follow-Up
- Surface expiring quotes, dormant customers, promised callbacks, overdue
  receivables, and recent delivery/payment events from accepted contracts.

### Unified Exception Center
- Present payment, inventory, production, packing, dispatch, and delivery
  exceptions with clear ownership, severity, age, and resolution link.

### Returns And RMA
- Track request, authorization, receipt, inspection, disposition, replacement,
  refund, inventory effect, and customer communication.

### Sales Activity Timeline
- Provide a permission-aware event history across customer, quote, order,
  payment, production, packing, dispatch, delivery, and documents.

### Duplicate And Data-Quality Review
- Detect and safely review duplicate customers/orders/dispatches and incomplete
  contact, address, pricing, or relationship data.

### Demand And Capacity Planning
- Compare accepted demand with production, inventory, packing, and driver
  capacity using explainable time windows and source data.

## Product Rule
A candidate should not become a standalone page merely because data exists. It
must answer:
- Which operator uses it?
- What decision do they make?
- What is the authoritative source?
- What safe next action follows?
- Why is a saved view or existing-page panel insufficient?

## Incremental Phases

### X0 - Evidence And Priority
- Measure frequency, impact, manual work, and current ownership for every
  candidate.
- Select one candidate only; keep the rest deferred.

### X1 - Shared Read Model And Events
- Define source events, identifiers, office/permission scope, freshness,
  severity, ownership, and resolution links.
- Use additive projections; do not replace owning domain state.

### X2 - First Operator View
- Build the smallest actionable view for the selected candidate.
- Link mutations back to owning domain workflows.
- Validate empty, stale, duplicate, and permission-filtered data.

### X3 - Notifications And Follow-Up
- Add notifications only when ownership, deduplication, escalation, and
  acknowledgement rules are approved.

### X4 - Additional Candidate
- Activate another capability only after the previous one has adoption and
  operator acceptance.

### X5 - Program Review
- Remove unused dashboards/projections.
- Record adoption, resolution time, false positives, and data-quality issues.

## Data And Permission Direction
- Cross-system projections are read models, never competing sources of truth.
- Events use stable entity identities, actor, office scope, timestamp, and
  source link.
- Permission filtering occurs on the server.
- Stale or incomplete projections are visible as such.
- Notifications are deduplicated and auditable.

## Likely File Areas
- New bounded sales operations routes/components only after activation
- Existing feature query-event and task-event infrastructure
- Domain routers/queries for source-specific read projections
- Notification channels and activity/audit systems
- Returns/RMA schema and APIs only after a separate approved data plan

## Validation
- Projection parity and freshness tests
- Permission and office-scope tests
- Event deduplication and replay tests
- Resolution-link and owning-workflow E2E tests
- False-positive, stale-data, empty-state, and load tests
- Operator adoption and time-to-resolution evidence

## Non-Goals
- A universal mutation layer
- Replacing existing Sales, Inventory, Finance, or Driver workspaces
- Automatic decisions from opaque scores
- Implementing all candidate capabilities together

## TODO
- Rank candidates from measured operator pain after Sequence 08.
- Define source-of-truth and owner for the first selected capability.
- Create a separate approved data plan before Returns/RMA schema work.

## Completion Gate
Sequence 09 is ongoing product expansion. Each candidate requires its own
activation, acceptance, and completion evidence.
