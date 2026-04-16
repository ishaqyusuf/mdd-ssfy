# ADR-005 Legacy Sales Form Domain and Mobile Architecture

## Status

Accepted

## Context

The active legacy sales form currently mixes:

- shell layout and action chrome
- item editing
- step navigation
- summary/history presentation
- direct UI dependency on legacy controller classes
- save orchestration and post-save side effects
- specialized step UIs spread across multiple unrelated folders

This makes the form difficult to simplify visually, difficult to make mobile-native, and risky to evolve because view components own too much orchestration.

## Decision

Adopt a modular frontend domain boundary for the active legacy sales form under:

- `apps/www/src/domains/sales-form/legacy/*`

Use the following architecture rules:

- one canonical domain entrypoint
- shell, item editor, step navigation, summary, step-family, state, lib, modal, and type folders with explicit ownership
- legacy classes re-homed into centralized controller areas instead of remaining scattered
- adapters/hooks between UI components and legacy controllers/store
- single active invoice item editing model on mobile
- step navigation rendered as wrapped CTA chips/buttons
- selected component preview rendered as value-only text
- save orchestration extracted from the button component into application/server boundaries

## Rationale

- Enables a clean mobile UX without forcing a risky business-logic rewrite.
- Creates a stable migration seam for the legacy form while `new-sales-form` parity work continues separately.
- Reduces coupling between visual components and stateful helper classes.
- Makes folder ownership clear enough to support incremental refactor instead of another large legacy surface.

## Alternatives Considered

### 1. Keep extending the existing scattered legacy structure

Rejected because it would deepen the current coupling and make mobile cleanup fragile.

### 2. Rewrite the entire legacy form into a new package immediately

Rejected because it would combine domain extraction, pricing/save logic migration, and UX redesign into one high-risk rewrite.

### 3. Do only cosmetic mobile cleanup without structural changes

Rejected because current class/helper coupling would keep the form hard to maintain and rework.

## Consequences

- New legacy sales-form work should land under `domains/sales-form/legacy` first.
- Touched UI components should stop directly instantiating legacy controller classes.
- Save-path cleanup should follow the new application/server boundary instead of remaining inside the button surface.
- HPT, moulding, service, shelf-items, and takeoff work should migrate into explicit step-family folders over time.
