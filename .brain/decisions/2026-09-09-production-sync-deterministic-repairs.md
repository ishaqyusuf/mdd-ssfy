# Extend Production Sync with evidence-backed repairs

Status: Accepted (2026-09-09)

Problem: received stock, stale allocation suggestions, derived production flags and review revision snapshots can disagree, leaving no actionable recovery after ordinary synchronization.

Decision: keep one existing package-owned Sync transaction and shared UI action. Repair only pending suggestions with complete verified replacement coverage and derived flags supported by the canonical resolver. Recheck modern review snapshots only for revision-only drift with unchanged identity/rate and valid aggregate submission capacity, under editor authority. Revalidate before existing review/payroll reconciliation; audit repairs and preserve serializable revision checks and idempotency.

Consequences: review-only work remains actionable and eligible reviews finish in the same click. Genuine source exclusions, insufficient received capacity, legacy scope and identity/rate/quantity conflicts remain explicit blockers. No blanket production flags, invented receipts, new submissions or schema changes. Existing inventory projection writers already use the same eligibility resolver.
