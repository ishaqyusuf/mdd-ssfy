# 13 — Complete Rollout And End-To-End Acceptance

**What to build:** Prove the complete Special Order workflow is compatible, observable, secure, and ready to roll out in Warning Only mode, then leave durable documentation and evidence for safely enabling stronger enforcement later.

**Blocked by:** 05 — Decline And Handle Terminal Approval Links; 06 — Invalidate Approval And Request Reapproval; 07 — Make Sales Emails Approval-Aware; 08 — Render Special Order State In Sales Documents; 09 — Remove And Re-Enable Special Order Classification; 10 — Enforce Approval At Purchasing Boundaries; 11 — Enforce Approval At Production Boundaries; 12 — Enforce Approval At Packing And Dispatch Boundaries.

**Status:** in-progress

- [x] Additive migration validation proves legacy null/unmanaged orders remain operational and no description or product text is used to infer enrollment.
- [x] Warning Only is the deployed default and stronger modes are not enabled merely by completing implementation.
- [x] Observability reports pending age, approval/decline outcomes, stale-link use, email failures, reapproval frequency, warnings, and would-block operations without leaking signature or capability data.
- [x] Authenticated browser coverage proves declaration, request, approval, customer-visible edit, reapproval, decline, removal, history, documents, and each enforcement presentation.
- [x] Public browser coverage proves responsive review/signature, safe terminal receipts, expired/stale behavior, and absence of protected-data disclosure.
- [x] Regression validation covers package/domain rules, protected and public API behavior, email composition and ledger retry, document projection/rendering, dashboard type safety, and the narrowest relevant builds.
- [x] Failure rehearsal proves capability-generation failure prevents incomplete email, notification failure does not reverse committed outcomes, and operational recovery exceptions remain usable.
- [x] Security review confirms hashed capabilities, private signatures, bounded public input, transactional single-use outcomes, permissions, and honest identity-assurance wording.
- [x] Durable documentation records Sales behavior, schema and relationships, migrations, API contracts/endpoints/permissions, task completion, and the approval/enforcement architecture decision.
- [x] Rollout guidance defines who may change enforcement, the telemetry review period, acceptance thresholds, support/retry procedures, and rollback to Warning Only.

## Implementation progress (2026-08-13)

- The additive migration is applied and reconciled locally, Warning Only remains the default, rollout telemetry exists, and focused security/failure tests pass.
- Remaining: close the still-unchecked authenticated/public browser and broad regression acceptance gates.
