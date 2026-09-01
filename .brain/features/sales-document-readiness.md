# Sales Document Readiness And Guided Repair

## Status

Implemented on 2026-09-01.

## Goal

Prevent preview, print, PDF generation, regeneration, and Sales email delivery from emitting a price-bearing Sales document whose relational item summaries are inconsistent with its active detail rows. Replace the previous generic preparation failure with a typed, reviewable repair flow.

## Readiness contract

- `@gnd/sales/document-readiness` is the shared server boundary.
- The evaluator reads active Sales items, active form-step revisions, HPT summaries, and active door rows.
- All currency comparisons use integer cents.
- A deterministic item/HPT summary mismatch produces a narrow `sync_door_group_totals` operation. It never rewrites order-level subtotal, tax, grand total, payment, refund, or amount-due fields.
- The candidate financial state isolates only the delta introduced by the narrow repair. Historical taxes, extra costs, payments, and other saved authorities remain the baseline rather than being silently repriced under current rules.
- If subtotal, taxable subtotal, tax, grand total, and amount due remain equal to their saved values, the status is `repair_required` and the modal may offer `Repair & continue`.
- If any comparable financial authority differs or cannot be safely derived, the status is `financial_review`; the document action is blocked and direct repair is unavailable.
- Conflicting active form-step revisions or incomplete row totals produce `manual_review`.
- A successful repair re-evaluates inside the same serializable transaction and must finish in `ready` state or the transaction rolls back.

## Attestation fast path

`SalesOrders.meta.salesDocumentReadiness` stores:

- validator version;
- readiness status;
- canonical SHA-256 evaluation signature;
- validated source `updatedAt`;
- evaluation evidence;
- the current proposal reference when repair/review is required.

A document action first reads only the Sales order id, `updatedAt`, and meta. A matching validator version and validated source timestamp reuses the attestation and skips the relational evaluator. This is one bounded database read, not a zero-read cache. Unknown versions or changed order timestamps force a fresh evaluation.

Canonical new Sales Form saves, copied Sales, approved Sales adjustments, and successful guided repairs force a fresh evaluation and stamp the resulting attestation. Any commercial writer that changes child rows must likewise refresh or invalidate the parent attestation.

## Proposal and audit lifecycle

- Non-ready evaluations are staged in `ResolutionCase` under scope `sales_document_readiness` with a deterministic proposal id derived from the order and signature.
- Apply re-reads the live order, validates the source timestamp and signature, uses guarded `updateMany` writes for the exact before-state, and rejects stale proposals.
- Apply records a `ResolutionAction`, a Sales History entry, resolves the case, and invalidates active `SalesPrintData`.
- `Cancel` and `Open order` both cancel the active resolution case, record the operator disposition, and clear the readiness proposal from Sales meta. `Open order` then opens the new Sales Form, which recalculates from live data and never commits the staged proposal as a full snapshot.

## User experience

- Preview, print, PDF download/regeneration, and Sales email all surface the same readiness modal.
- A zero-delta modal shows saved/reconciled subtotal, tax, grand total, amount due, and each difference. `Repair & continue` applies the narrow repair and resumes the initiating action once.
- Financial/manual states show a critical warning and only allow cancellation or opening the Sales record for review.
- Email recipients, channels, subject, and message remain local while repair is resolved. Server-side notification builders repeat the readiness assertion before constructing links or attachments.
- The new Sales Form shows saved, recalculated, and difference values for subtotal, tax, grand total, and amount due immediately after hydration. This warning does not mark the form dirty or autosave.

## Operational audit

Run the read-only classifier with:

```bash
bun run sales-document:readiness-audit --limit 20
```

The limit must be from 10 through 20. By default the report includes reference order database id `23288` (`08574PC`) and fills the remainder with the most recent historical orders. The command only reads data and emits JSON.

## Known boundary

The fast path depends on all application-owned child-row writers refreshing the parent attestation. Direct SQL or an administrative repair script that mutates Sales children without touching `SalesOrders.updatedAt` can bypass that invalidation contract and must explicitly clear or refresh readiness.
