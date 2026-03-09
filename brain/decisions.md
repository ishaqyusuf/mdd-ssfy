# Decisions

## 2026-03-08 - Adopt Project Brain Structure

- Decision: Standardize project planning artifacts under `/brain` with six canonical files.
- Rationale: Centralized planning improves continuity, prioritization discipline, and handoff quality.
- Consequence: Ongoing work should update `tasks.md` and `progress.md` continuously.

## 2026-03-08 - Enforce Implementation Order

- Decision: Build features in this order: Schema -> API -> UI -> Validation -> Polish.
- Rationale: Reduces rework and ensures upstream contract stability before UI iteration.
- Consequence: New feature plans should explicitly map tasks to this sequence.

## 2026-03-09 - Sales Control V2 Authority and Module Freeze

- Decision: `qtyControl` is the single source of truth for sales and dispatch status/quantity metrics, including query filters.
- Decision: Sales-control logic must be centralized under a dedicated module boundary (`packages/sales/src/control/*`) with strict layers: `domain`, `application`, `infrastructure`, `projections`, and `contracts`.
- Decision: Existing task actions (`submitAll`, `packItems`, `clearPackings`, `startDispatch`, `cancelDispatch`, `submitDispatch`, `createAssignments`, `deleteAssignments`, `deleteSubmissions`, `markAsCompleted`) are orchestration-only; business mutations and `qtyControl` updates must go through a single mutation service.
- Decision: `reset-sales-control` is repair/admin only and must not be required for normal runtime correctness.
- Rationale: This removes drift between production and non-production dispatch quantities, enables reliable sales/dispatch filtering, and gives one auditable path for state transitions.
- Consequence: All new sales/dispatch query surfaces must consume projected stats from the control read service, and direct ad-hoc control derivations should be deprecated.
