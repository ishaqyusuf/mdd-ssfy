# ADR-097: Super Admin-only Assistant MVP

## Status

Accepted — 2026-09-14

## Decision

Release the first Progressive AI Assistant MVP only to authenticated Super Admin
accounts in the standard desktop dashboard. Continue enforcing every domain grant,
record scope, field-redaction rule, explicit consequential-action approval, and
idempotency boundary inside tools and workflows.

The MVP includes provider/model control, Super Admin usage visibility, core Sales
and Community reads, analytics, supported Sales PDF generation, reviewed text order
creation, reusable actions, and missing-feature submission. Employee rollout,
bulk access, employee quota administration, full reports/exports, image OCR, mobile
acceptance, and the complete feature-delivery center remain later phases.

## Consequences

- The MVP needs one authenticated Super Admin acceptance path rather than an
  employee cohort rollout.
- Existing employee entitlement foundations remain available but do not block MVP.
- Super Admin role does not become a bypass for business authorization or action
  confirmation.
