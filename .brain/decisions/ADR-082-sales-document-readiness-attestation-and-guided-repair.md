# ADR-082: Sales Document Readiness Attestation And Guided Repair

## Status

Accepted — 2026-09-01

## Context

Historical Sales orders can have complete active HPT door detail while their parent `SalesOrderItems` and `HousePackageTools` quantity/total summaries are null, zero, or stale. Strict document composition correctly refused to print these records, but the user received only a generic preparation error. Re-running a deep relational reconciliation for every preview, print, PDF, or email would also be unnecessarily expensive for unchanged orders.

## Decision

Adopt one server-owned readiness module in `packages/sales` with four outcomes: `ready`, `repair_required`, `financial_review`, and `manual_review`.

Use a SHA-256 evaluation signature plus validator version and validated `SalesOrders.updatedAt`, persisted under `SalesOrders.meta.salesDocumentReadiness`, as the fast-path attestation. A matching attestation requires one small Sales-order read and skips relational evaluation. New canonical saves and known child-row writers refresh the attestation transactionally.

Reuse `ResolutionCase` and `ResolutionAction` for staged proposal evidence instead of adding a repair-snapshot table. Proposals contain narrow field operations, exact before/after values, findings, and a financial comparison. They never contain an unchecked full Sales payload.

Allow direct apply only when the candidate item subtotal is exactly equal to the saved subtotal in integer cents. The repair may synchronize item/HPT quantity and totals but must not update order subtotal, tax, grand total, payments, refunds, or balance. Revalidate signature and before-state inside a serializable transaction, re-run the evaluator after writes, invalidate print snapshots, and record actor-attributed history.

When the operator opens the Sales Form instead, cancel the active case and clear the proposal from Sales meta. The editor recalculates from live relational data and uses its normal explicit save path.

## Consequences

- Known inconsistent records receive actionable evidence instead of a generic error.
- Repeated document actions on unchanged records use one bounded gate query rather than a deep relational traversal.
- Zero-total-delta structural repairs are guarded, auditable, idempotent at the resolved-case boundary, and continuation-safe.
- Financial-changing or ambiguous records remain fail-closed and require Sales Form review.
- Application-owned commercial writers must maintain the attestation contract. Direct SQL and legacy scripts outside that contract remain an operational risk and must clear or refresh readiness.
- No Prisma schema or migration is required for this release.
