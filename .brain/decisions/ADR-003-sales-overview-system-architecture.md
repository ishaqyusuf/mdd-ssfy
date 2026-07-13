# ADR-003 Sales Overview System Architecture

## Status

Accepted

## Context

The current sales overview implementation in `apps/www/src/components/sheets/sales-overview-sheet/index.tsx` mixes:

- sheet surface rendering
- role/view-mode branching
- tab registration
- query-state adaptation
- feature orchestration

This makes the experience noisy, hard to extend, and difficult to reuse for a full-page view.

## Decision

Adopt a shared sales overview system architecture with:

- a headless feature-core layer for state normalization
- a canonical `surface / audience / tab` model
- a registry-driven tab definition layer
- thin sheet and page shells around shared overview content
- a compatibility wrapper so the legacy sheet entry can migrate incrementally

Initial implementation lives under:

- `apps/www/src/components/sales-overview-system/*`

## Rationale

- Supports side-sheet and full-page rendering without duplicating business logic.
- Moves role/view-mode branching out of inline JSX and into explicit controller/policy code.
- Creates a stable migration seam so existing tab internals can move incrementally.
- Preserves current deep-link behavior while normalizing legacy tab naming drift such as `transaction` vs `transactions`.

## Alternatives Considered

### 1. Keep extending the existing sheet file

Rejected because it would deepen the current coupling and make full-page support more expensive later.

### 2. Build a separate page-only implementation

Rejected because it would duplicate tab logic, state handling, and future maintenance effort.

### 3. Rewrite all tabs in one pass

Rejected because it increases delivery risk and makes regression isolation harder.

## Consequences

- New sales overview work should land in `sales-overview-system` first, not directly in the legacy sheet entry.
- The legacy sheet file should remain a compatibility adapter until migration is complete.
- Follow-up work should continue moving section composition and tab internals behind the new feature-core contracts.
