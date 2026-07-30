# Plan: Sales Quotes Modernization

## Type
Feature Modernization

## Status
Deferred - Activate Only After Sequence 02 Acceptance

## Sequence
03

## Created Date
2026-07-30

## Last Updated
2026-07-30

## Goal
Make Quotes a focused follow-up and conversion workspace that reuses the proven
sales document, customer, pricing, and overview contracts without becoming a
second Orders system.

## Activation Gate
- Sequence 02 is accepted.
- The operator explicitly activates Sequence 03.
- Order/quote shared behavior and quote-only behavior are mapped separately.

## Current Context
- Canonical route: `/sales-book/quotes`
- Deleted view: `/sales-book/quotes/bin`
- Create/edit quote routes already exist.
- The canonical list uses a restarted `tables-2` implementation.
- Quote rows can open sales overview/detail surfaces and transition into order
  workflows.

## Intended Experience
- Compact header with `New quote`.
- Views for active, needs follow-up, expiring, accepted/converted, declined, and
  explicitly requested deleted records.
- Search by quote, customer, contact, PO/reference, and salesperson.
- Default columns: quote, customer, amount, owner, created/expiry date,
  follow-up state, commercial status, and actions.
- Quote Overview reuses the accepted Sales Overview composition while showing
  quote-appropriate actions and history.
- Conversion creates explicit quote-to-order lineage and never mutates the
  original quote into an ambiguous hybrid record.

## Incremental Phases

### Q0 - Baseline
- Record quote states, expiry rules, filters, actions, conversion behavior,
  document/message delivery, permissions, and current overview reuse.

### Q1 - Page Shell And Mobile
- Align header, action hierarchy, spacing, loading, and responsive behavior.
- Preserve existing list and form contracts.

### Q2 - Follow-Up Workspace
- Add approved views for due follow-up and expiry.
- Record follow-up owner, promised date, and outcome only if supported by a
  reviewed durable contract.
- Avoid generating noisy automatic reminders without operator policy.

### Q3 - Quote Overview
- Reuse the accepted Sales Overview shell and lazy-tab pattern.
- Keep quote-specific actions, documents, messages, notes, and activity clear.

### Q4 - Quote-To-Order Conversion
- Review pricing/profile/tax snapshot behavior.
- Require explicit confirmation of changed customer, price, inventory, or
  fulfillment assumptions.
- Preserve source quote, conversion actor, time, and resulting order identity.

### Q5 - Cleanup
- Remove duplicate quote-only UI only after route/action parity.
- Review deleted-view placement and legacy links with usage evidence.

## Data And Permission Direction
- Keep paginated list and summary contracts separate.
- Compute expiry/follow-up views server-side.
- Enforce create, edit, message, approve/convert, delete, and restore
  capabilities on the server.
- Preserve decimal-safe totals and authoritative sales calculations.

## Likely File Areas
- `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/quotes/*`
- `apps/dashboard/src/components/tables-2/sales-quotes/*`
- Sales Overview components shared with Sequence 02
- Quote create/edit form routes and shared sales-form packages
- Sales document messaging and PDF modules
- Sales queries, schemas, permissions, and control services

## Validation
- Quote list/filter/view tests
- Quote document and messaging tests
- Quote-to-order lineage, totals, tax, pricing, and permission tests
- Draft recovery and edit regressions
- Authenticated responsive browser proof
- Conversion with stale price, changed customer, missing inventory, and
  read-only/dealer fixtures

## Non-Goals
- Building a general CRM
- Rewriting Orders
- Automatic discounting or repricing policy
- Removing quote history after conversion

## TODO
- Define the business policy for quote expiry and follow-up ownership.
- Approve which quote states are operator actions versus derived indicators.
- Decide whether follow-up requires a new durable activity record.

## Completion Gate
Quotes require operator acceptance before Sequence 04 can be activated.
