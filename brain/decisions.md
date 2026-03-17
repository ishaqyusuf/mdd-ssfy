# Decisions

## Purpose
Legacy compatibility index for durable project decisions.

## Canonical Location
- ADR files live in `brain/decisions/`.
- Summary decisions may still be logged here for quick scanning.

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

## 2026-03-09 - New Sales Form Parity Quality Gate

- Decision: Treat `new-sales-form` parity as incomplete until legacy costing and settings/step fallback semantics are matched, not just relational payload round-trip.
- Decision: Use `brain/new-sales-form-parity-audit.md` as the authoritative parity tracker for closure.
- Decision: Enforce implementation order for parity closure: Schema -> API -> UI -> Validation -> Polish.
- Rationale: Current audit confirms structural persistence parity is strong, but critical business behavior parity gaps remain in pricing/costing and route override/fallback semantics.
- Consequence: Rollout confidence must be gated by parity scenario coverage (including HPT/moulding/service/shelf and tax/labor/payment edge cases), not by save/get contract completeness alone.

## 2026-03-10 - Reopen Parity by Field-Reported Gaps

- Decision: Re-open `new-sales-form` parity closure and prioritize user-reported production-path missing features as authoritative over prior PASS labels.
- Decision: Track and execute closure through `brain/new-sales-form-missing-features-execution-plan.md` using hard phase gates (do not advance until current phase tests pass).
- Rationale: Current field feedback indicates unresolved behavior gaps in pricing, grouped workflows, component controls, history, and state resilience even after previous matrix promotions.
- Consequence: Existing parity matrix status should be treated as provisional; closure requires fresh reproducible scenarios and validated fixes per reported gap.

## 2026-03-12 - Legacy Sales Form Hardening Stream

- Decision: Run a dedicated hardening stream for the active legacy sales-form runtime in parallel with new-sales-form parity.
- Decision: Prioritize P0 blockers first: save transaction integrity and server-authoritative pricing persistence.
- Decision: Track execution through `brain/sales-form-system-hardening-plan.md` with phase gates (Phase 0 -> Phase 4).
- Rationale: System audit surfaced correctness risks in save atomicity, pricing trust boundary, and state reliability that can impact revenue/accounting behavior.
- Consequence: Sales-form change sets should map to hardening phases and include focused pricing/save regression tests before rollout.

## 2026-03-16 - Split Payment Truth from Resolution Workflow

- Decision: Introduce `payment-system` and `resolution-system` as separate module boundaries inside `packages/sales`.
- Decision: `payment-system` will become the canonical authority for money events, allocations, and order balance projections.
- Decision: `resolution-system` will be limited to inconsistency detection, classification, and audited repair flows; it must not be required for routine runtime correctness.
- Rationale: Current accounting behavior is spread across multiple write/read paths, while resolution logic is currently embedded in ad hoc query code instead of a reusable diagnostic module.
- Consequence: Future payment refactors should route mutations through shared payment-system application services, and existing resolution queries should migrate to shared resolution-system rules.
