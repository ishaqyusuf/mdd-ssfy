# Decisions

## 2026-03-08 - Adopt Project Brain Structure

- Decision: Standardize project planning artifacts under `/brain` with six canonical files.
- Rationale: Centralized planning improves continuity, prioritization discipline, and handoff quality.
- Consequence: Ongoing work should update `tasks.md` and `progress.md` continuously.

## 2026-03-08 - Enforce Implementation Order

- Decision: Build features in this order: Schema -> API -> UI -> Validation -> Polish.
- Rationale: Reduces rework and ensures upstream contract stability before UI iteration.
- Consequence: New feature plans should explicitly map tasks to this sequence.
